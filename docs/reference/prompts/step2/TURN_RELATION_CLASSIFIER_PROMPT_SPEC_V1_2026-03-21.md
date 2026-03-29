# Turn Relation Classifier Prompt Spec V1

## 文档信息
- Step：`Step 2 - Conversation Context Manager`
- Prompt 名称：`Turn Relation Classifier`
- Prompt slug：`turn_relation_classifier_op_v1`
- 状态：`frozen`
- 对应代码模块：
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/turn-relation-classifier.ts`

---

## 1. 目标

这个 Prompt 只做一件事：

**判断当前消息与前文的关系。**

它不负责：
- capability 匹配
- intent 分类
- gate 判断
- router 调度
- 业务结果生成

---

## 2. 输入 Contract

输入必须受控，不能把整段历史无差别塞给模型。

推荐输入字段：

```json
{
  "raw_query": "那 arbitrum 呢？",
  "recent_turns_summary": [
    {
      "role": "user",
      "content": "当前 vault APY 怎么样？"
    },
    {
      "role": "assistant",
      "content": "你希望看哪个时间范围？"
    }
  ],
  "pending_clarification": {
    "exists": true,
    "scope": "yield",
    "missing_slots": ["time_window"],
    "original_query": "当前 vault APY 怎么样？"
  },
  "active_context_summary": {
    "scope": "yield",
    "time_window_days": null,
    "aggregation": null,
    "chain": null,
    "protocol": null,
    "vault_name": null
  }
}
```

### 必填字段
- `raw_query`
- `recent_turns_summary`
- `pending_clarification`
- `active_context_summary`

### 输入约束
1. `recent_turns_summary` 只保留少量关键 turn
2. 不直接传原始 transcript 全量
3. 不传 capability list
4. 不传业务表结构

原因：
- 这是 Step 2，不是 Step 3

---

## 3. 输出 Contract

输出必须是单个 JSON 对象：

```json
{
  "type": "continuation",
  "confidence": 0.92,
  "reason": "user narrows the previous unfinished yield question by chain target"
}
```

### 必填字段
- `type`
- `confidence`
- `reason`

### `type` 枚举
- `new_session`
- `continuation`
- `clarification_reply`
- `correction`
- `new_topic_same_window`
- `history_callback`

### 不允许输出的字段
- `matched_capability_ids`
- `primary_capability_id`
- `intent_type`
- `scope`
- `gate_result`
- `execution_id`

---

## 4. System Prompt

```text
You are the MAXshot Turn Relation Classifier.

Your only job is to determine how the current user message relates to the immediately relevant conversation context.

Return exactly one JSON object and nothing else.

You must classify the current message into exactly one of:
- new_session
- continuation
- clarification_reply
- correction
- new_topic_same_window
- history_callback

Definitions:

1. new_session
- The user explicitly starts over or resets the conversation.
- Use this when the message clearly indicates a fresh start.

2. continuation
- The message continues the current topic and narrows, extends, or follows up on the current active context.

3. clarification_reply
- The assistant previously asked for missing information, and the user is directly providing that missing piece.

4. correction
- The user explicitly corrects or overrides part of the previous active context.

5. new_topic_same_window
- The user stays in the same chat window but shifts to a new topic that should not inherit the previous business context.

6. history_callback
- The user explicitly refers back to an earlier query, earlier answer, or earlier discussed object and expects recall.

Rules:
1. Prefer semantic understanding over keyword matching.
2. If the previous turn contains a pending clarification and the new message directly fills the missing slot, choose clarification_reply.
3. If the user explicitly says the previous interpretation was wrong, choose correction.
4. If the user introduces a different task or topic, choose new_topic_same_window.
5. If the user asks to go back to something discussed earlier, choose history_callback.
6. If the user clearly resets or starts over, choose new_session.
7. Otherwise, if the message continues the current topic, choose continuation.

Output JSON keys only:
{
  "type": "one allowed enum value",
  "confidence": 0.0,
  "reason": "short explanation"
}
```

---

## 5. User Prompt Template

```text
Current user message:
{{raw_query}}

Recent relevant turns:
{{recent_turns_summary}}

Pending clarification:
{{pending_clarification}}

Active context summary:
{{active_context_summary}}

Return JSON only.
```

---

## 6. 边界

这个 Prompt 的职责边界：
- 只判断“关系”
- 不判断“要执行什么能力”

不允许越界到：
- Step 3 Intent Analyzer
- Step 4 Gate
- Step 6 Router

---

## 7. 正例

### 正例 1
#### 输入
- 上轮：
  - 用户：`当前 vault APY 怎么样？`
  - 助手：`你希望看哪个时间范围？`
- 当前：
  - `最近7天`

#### 期望输出
```json
{
  "type": "clarification_reply",
  "confidence": 0.97,
  "reason": "user directly provides the missing time window requested by the assistant"
}
```

### 正例 2
#### 输入
- 上轮：
  - 已形成 `yield + 最近7天`
- 当前：
  - `那 arbitrum 呢？`

#### 期望输出
```json
{
  "type": "continuation",
  "confidence": 0.93,
  "reason": "user continues the same topic and narrows the scope to a specific chain"
}
```

### 正例 3
#### 输入
- 上轮：
  - 当前 scope 被理解为 market
- 当前：
  - `不对，我问的是 vault 不是 market`

#### 期望输出
```json
{
  "type": "correction",
  "confidence": 0.98,
  "reason": "user explicitly corrects the previous interpretation"
}
```

### 正例 4
#### 输入
- 上轮：
  - APY 查询
- 当前：
  - `你能描述什么是MAXshot么？`

#### 期望输出
```json
{
  "type": "new_topic_same_window",
  "confidence": 0.95,
  "reason": "user switches from a business metric query to a product-definition question"
}
```

### 正例 5
#### 输入
- 当前：
  - `我之前问的 dForce 那个再看一下`

#### 期望输出
```json
{
  "type": "history_callback",
  "confidence": 0.9,
  "reason": "user explicitly refers back to an earlier discussed target"
}
```

---

## 8. 反例

### 反例 1
输入：
- `最近7天`

错误输出：
```json
{
  "type": "new_topic_same_window",
  "confidence": 0.52,
  "reason": "contains a new time range"
}
```

问题：
- 把标准澄清回复误判成新 topic

### 反例 2
输入：
- `你能描述什么是MAXshot么？`

错误输出：
```json
{
  "type": "clarification_reply",
  "confidence": 0.61,
  "reason": "user responded after a clarification request"
}
```

问题：
- 仅按位置判断，没有按语义判断

### 反例 3
输入：
- `不对，我要看最近30天`

错误输出：
```json
{
  "type": "continuation",
  "confidence": 0.7,
  "reason": "same topic"
}
```

问题：
- 丢失 correction 语义

---

## 9. 运行时接入点

建议接入链路：
1. Step 1 输出 `Entry Envelope`
2. `Session Resolver` 先运行
3. `Turn Relation Classifier` 接收裁剪后的 context
4. `Context Policy Engine` 消费 `turn_relation`

对应模块：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/turn-relation-classifier.ts`

---

## 10. 验收标准

满足以下条件后，Prompt 才能从 `proposed` 进入 `approved`：

1. 6 类 relation 均有正例
2. 至少 3 类典型误判有反例
3. 输出 contract 能被代码严格校验
4. 不输出任何 Step 3 字段
5. 在 Step 2 测试矩阵里能稳定区分：
   - clarification_reply
   - continuation
   - correction
   - new_topic_same_window
   - history_callback
