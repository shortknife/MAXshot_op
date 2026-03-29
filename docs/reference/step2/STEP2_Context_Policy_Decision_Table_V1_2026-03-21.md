# Step 2 Context Policy Decision Table V1

- Status: Frozen

## 文档目的

定义 `Context Policy Engine` 如何根据 `turn_relation` 决定：
- 继承什么
- 清空什么
- 覆盖什么
- 是否触发 recall

后续所有 Step 2 上下文行为必须按此表执行，禁止临时 if/else 补丁。

---

## 1. 决策输入

`Context Policy Engine` 至少接收：

```json
{
  "turn_relation": {
    "type": "continuation"
  },
  "conversation_context": {
    "pending_clarification": {},
    "active_context": {}
  },
  "entry": {
    "raw_query": "那 arbitrum 呢？"
  }
}
```

说明：
- `conversation_context` 是 **policy 应用前快照**
- `policy_decision` 是 **policy 应用后的动作决议**
- 二者同时存在时，不表示冲突

---

## 2. 决策输出

标准输出：

```json
{
  "policy_decision": {
    "inherit_context": true,
    "clear_pending_clarification": false,
    "override_fields": [],
    "trigger_recall": false
  },
  "effective_query_policy": {
    "mode": "pass_through",
    "notes": "keep raw query unchanged"
  }
}
```

---

## 3. 决策总表

| turn_relation | inherit_context | clear_pending_clarification | override_fields | trigger_recall | effective_query policy |
|---|---:|---:|---|---:|---|
| `new_session` | `false` | `true` | `all` | `false` | `pass_through` |
| `continuation` | `true` | `false` | `[]` | `false` | `pass_through` |
| `clarification_reply` | `true` | `true` after fill | `missing_slots_only` | `false` | `pass_through` |
| `correction` | `true` | `true` if corrected field overlaps clarification | `corrected_fields_only` | `false` | `pass_through` |
| `new_topic_same_window` | `false` for business context | `true` | `all business fields` | `false` | `pass_through` |
| `history_callback` | `true` limited | `false` by default | `[]` | `true` | `pass_through_then_recall` |

---

## 4. 各 relation 详细规则

### 4.1 `new_session`

#### 含义
- 用户明确开始新会话
- 或 Session Resolver 已判为 reset/new branch

#### 规则
- 不继承旧业务上下文
- 清空 pending clarification
- 清空 active filters/time/aggregation
- 不触发 recall

#### 结果
- 后续 Step 3 看到的是一个干净上下文

---

### 4.2 `continuation`

#### 含义
- 当前消息继续同一主题

#### 规则
- 继承 active business context
- 不清 clarification
- 不覆盖旧字段，除非后续 Step 3 提取出新的明确值
- 不触发 recall

#### 示例
- `那 arbitrum 呢？`
- `协议换成 morpho 呢？`

---

### 4.3 `clarification_reply`

#### 含义
- 用户在补系统刚刚缺失的槽位

#### 规则
- 继承现有 context
- 只补 `missing_slots`
- clarification 填完后清除 pending clarification
- 不触发 recall

#### 示例
- `最近7天`
- `今天`
- `看最高 APY`

#### 约束
- 不允许把 clarifying answer 当成全新业务 query 重做解释

---

### 4.4 `correction`

#### 含义
- 用户明确纠正之前系统的理解

#### 规则
- 继承 session 与大部分上下文
- 只覆盖被纠正字段
- 若纠正字段与 pending clarification 重叠，则清除该 clarification
- 不触发 recall

#### 示例
- `不对，我问的是 vault 不是 market`
- `不对，我要看最近30天`

#### 约束
- correction 不等于普通 continuation

---

### 4.5 `new_topic_same_window`

#### 含义
- 同一聊天窗口，但话题已切换

#### 规则
- 保留 session 元信息
- 清空业务上下文
- 清空 pending clarification
- 不触发 recall

#### 示例
- 从 APY 查询切到：
  - `你能描述什么是MAXshot么？`
  - `写一条关于新品发布的帖子`

#### 约束
- 不得继承旧 APY/vault/chain/protocol 信息

---

### 4.6 `history_callback`

#### 含义
- 用户要求回看或回到历史上提过的对象/问题

#### 规则
- 保留 session 元信息
- 不直接把旧 query 文本硬拼入当前 query
- 触发 recall adapter
- recall 完成后，再形成增强版 context

#### 示例
- `我之前问的 dForce 那个再看一下`
- `回到刚才那个 vault`

#### 约束
- history callback 不是普通 continuation
- 不能只靠继承 active context 解决

---

## 5. effective_query 处理原则

### 5.1 默认策略
默认使用：
- `pass_through`

即：
- Step 2 默认不改写 `raw_query`
- 原文尽可能原样下传

### 5.2 禁止的旧做法
以下做法应逐步退役：
- 把 follow-up 强行拼成：
  - `原问题（最近7天，按平均 APY 口径）`
- 把历史 query 文本直接追加到新 query

### 5.3 唯一例外
只有 recall adapter 产出结构化 recall 结果后，
Step 2 才允许在 `conversation_context` 里增加：
- `recall_summary`
- `recall_hits`

而不是改写 `raw_query`

---

## 6. 常见误区

### 误区 1
把 `clarification_reply` 也当成 `continuation`

问题：
- 会导致系统继续保留缺槽状态，或者重复追问

### 误区 2
把 `new_topic_same_window` 当成 `continuation`

问题：
- 旧业务上下文污染新话题

### 误区 3
把 `history_callback` 当成普通 follow-up

问题：
- 只继承当前上下文，无法真正回到更早的历史对象

---

## 7. 验收标准

`Context Policy Engine` 进入开发前，至少满足：

1. 6 种 relation 都有决策规则
2. 总表与详细规则一致
3. 明确禁止 raw query 拼接式补丁
4. 明确区分：
   - continuation
   - clarification_reply
   - correction
   - new_topic_same_window
   - history_callback
5. 可直接用于测试矩阵编写和代码实现
