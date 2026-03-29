# Step 2 Recall Adapter Contract V1

- Status: Frozen

## 文档目的

定义 Step 2 中 `Recall Adapter` 的正式职责、输入输出 contract、触发条件和边界。

`Recall Adapter` 只为一类问题服务：

**当 `turn_relation.type = history_callback` 时，把“回到之前那个问题/对象”的需求转换为可供后续步骤消费的结构化回溯上下文。**

---

## 1. 角色定义

`Recall Adapter` 是 Step 2 的可选子模块。

它的唯一任务是：
- 在明确历史回溯场景下，检索和压缩历史上下文
- 返回结构化 recall 结果

它不负责：
- 普通 follow-up
- capability 匹配
- intent 分类
- gate
- router
- 直接回答用户问题

---

## 2. 触发条件

只有满足以下条件时才触发：

1. `Turn Relation Classifier` 输出：
   - `type = history_callback`
2. `Context Policy Engine` 输出：
   - `trigger_recall = true`

如果不满足这两个条件，`Recall Adapter` 不应运行。

---

## 3. 输入 Contract

### 3.1 输入结构

```json
{
  "entry": {
    "raw_query": "我之前问的 dForce 那个再看一下",
    "session_id": "session_xxx"
  },
  "turn_relation": {
    "type": "history_callback",
    "confidence": 0.91,
    "reason": "user explicitly refers back to a previously discussed object"
  },
  "conversation_context": {
    "active_context": {
      "active_scope": "yield"
    },
    "pending_clarification": {
      "exists": false
    }
  },
  "available_history": {
    "recent_turns": [],
    "session_summaries": [],
    "memory_runtime": {
      "source_policy": "router_context_only",
      "ref_ids": [],
      "memory_ref_count": 0
    }
  }
}
```

### 3.2 必填字段
- `entry.raw_query`
- `turn_relation.type`
- `available_history`

### 3.3 可选字段
- `conversation_context`
- `session_id`
- `memory_runtime`

---

## 4. 输出 Contract

### 4.1 输出结构

```json
{
  "recall_hits": [
    {
      "source_type": "recent_turn",
      "source_id": "turn_12",
      "match_reason": "mentions dForce USDC on base",
      "summary": "Earlier query asked about dForce USDC APY on base over the last 7 days"
    }
  ],
  "recall_summary": "User likely refers to the prior dForce USDC yield query on base.",
  "recall_confidence": 0.88,
  "resolved_reference": {
    "entity_type": "vault_or_market",
    "entity_name": "dForce USDC",
    "inferred_scope": "yield"
  }
}
```

### 4.2 字段说明

#### `recall_hits`
- 命中的历史证据列表
- 每条证据必须带：
  - `source_type`
  - `source_id`
  - `match_reason`
  - `summary`

#### `recall_summary`
- 给 Step 2/3 使用的压缩摘要

#### `recall_confidence`
- `0..1`
- 表示当前回溯结果的可信度

#### `resolved_reference`
- Step 2 对“用户回指对象”的结构化理解
- 用于后续 Step 3 继续做 capability / slot 处理

---

## 5. 数据来源策略

第一版只允许以下来源：

1. `recent_turns`
- 最近关键对话 turn

2. `session_summaries`
- Step 2/Step 8 未来沉淀的摘要

3. `memory_runtime`
- 通过 `ref_ids` 允许访问的 recall 来源

第一版不要求：
- 向量数据库
- 外部长期记忆服务
- 复杂跨 session 图谱检索

---

## 6. 行为规则

### 6.1 允许做的事
- 从近期历史中找“用户指的是谁/哪个问题”
- 返回结构化 recall 结果
- 输出置信度

### 6.2 不允许做的事
- 不允许直接把旧 query 文本拼接到 `raw_query`
- 不允许直接输出 capability 结论
- 不允许在 recall 阶段决定 gate / router / execution

---

## 7. 示例

### 正例 1
输入：
- `我之前问的 dForce 那个再看一下`

期望：
- `recall_hits` 命中之前的 dForce 查询
- `resolved_reference.entity_name = dForce USDC`

### 正例 2
输入：
- `回到刚才那个 vault`

期望：
- 命中最近的 vault 查询对象
- 输出结构化 `resolved_reference`

### 反例 1
输入：
- `那 arbitrum 呢？`

错误：
- 触发 recall

问题：
- 这是 continuation，不是 history callback

### 反例 2
输入：
- `我之前问的 dForce 那个再看一下`

错误：
- 直接把旧 query 文本拼接成新的 `effective_query`

问题：
- recall 被错误实现成 query 拼接补丁

---

## 8. 推荐实现策略

### 第一版
- 基于现有 session history / recent turns / summaries
- 简单结构化匹配 + LLM/规则混合压缩

### 第二版
- 接 searchable recall layer
- 支持跨更长历史窗口
- 支持 durable curated memory

---

## 9. 验收标准

`Recall Adapter` 进入编码前，至少满足：

1. 只在 `history_callback` 时触发
2. 输出结构稳定
3. 不越界输出 capability/intention/gate
4. 不通过 query 拼接“伪实现回溯”
5. 至少有两个正例和两个反例
