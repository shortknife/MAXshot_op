# Step 2 Session Resolver Contract V1

- Status: Frozen

## 文档目的

定义 Step 2 中 `Session Resolver` 的正式职责、输入输出 contract 和决策边界。  
后续任何 session 归属逻辑，都必须以本文为准。

---

## 1. 角色定义

`Session Resolver` 是 Step 2 的第一个正式子模块。

它的唯一任务是：

**确定当前输入应落到哪个 session/thread，以及这次 session 动作是什么。**

它不负责：
- turn relation 判断
- capability 匹配
- intent 分类
- gate
- router

---

## 2. 输入 Contract

### 2.1 输入结构

```json
{
  "entry": {
    "entry_channel": "web_chat",
    "session_id": "session_xxx",
    "request_id": "req_xxx",
    "raw_query": "当前 vault APY 怎么样？",
    "received_at": "2026-03-21T16:00:00.000Z",
    "requester_id": null,
    "entry_meta": {}
  },
  "session_store_snapshot": {
    "session_id": "session_xxx",
    "last_active_at": "2026-03-21T15:58:00.000Z",
    "expires_at": "2026-03-21T16:28:00.000Z"
  },
  "clarification_store_snapshot": {
    "exists": true,
    "scope": "yield",
    "original_query": "当前 vault APY 怎么样？",
    "missing_slots": ["time_window"]
  }
}
```

### 2.2 必填字段
- `entry.entry_channel`
- `entry.request_id`
- `entry.raw_query`
- `entry.received_at`

### 2.3 可选字段
- `entry.session_id`
- `entry.requester_id`
- `entry.entry_meta`
- `session_store_snapshot`
- `clarification_store_snapshot`

---

## 3. 输出 Contract

### 3.1 输出结构

```json
{
  "session_id": "session_xxx",
  "thread_action": "continue",
  "confidence": 1,
  "resolution_reason": "existing active session reused",
  "store_policy": {
    "load_existing_context": true,
    "reset_previous_context": false,
    "fork_from_session_id": null
  }
}
```

### 3.2 字段说明

#### `session_id`
- 本轮后续流程要使用的 session 标识

#### `thread_action`
- 枚举值：
  - `continue`
  - `fork_new`
  - `reset`

#### `confidence`
- `0..1`
- 对确定性逻辑来说，通常应为 `1`
- 只有在使用带推断的策略时才允许低于 `1`

#### `resolution_reason`
- 短文本
- 用于 audit/debug

#### `store_policy`
- `load_existing_context`
  - 是否读取并下传已有上下文
- `reset_previous_context`
  - 是否明确丢弃旧上下文
- `fork_from_session_id`
  - 若 `thread_action=fork_new`，记录来源 session

---

## 4. 决策规则

`Session Resolver` 只做**确定性**规则，不做语义推理。

### 4.1 continue
满足以下任一类场景：
1. entry 已携带有效 `session_id`
2. session 未过期
3. 没有显式 reset 指令

输出：
- `thread_action=continue`
- `load_existing_context=true`

### 4.2 reset
满足以下任一类场景：
1. 用户显式发送 reset/new 指令
2. 当前 session 已过期，且策略要求新 session
3. 系统策略明确要求 hard reset

输出：
- `thread_action=reset`
- `reset_previous_context=true`

### 4.3 fork_new
满足以下任一类场景：
1. 同一会话窗口下显式要求保留旧会话但新开分支
2. 系统后续引入 thread/topic 分支能力时，需从原 session 分叉

说明：
- 当前版本可先保留 contract，不一定立即在运行时启用

---

## 5. 边界约束

### 5.1 Session Resolver 不能判断的事
以下都不是它的职责：
- 这是 continuation 还是 new topic
- 这是 clarification reply 还是 correction
- 这条消息应该走哪个 capability

这些全部属于后续：
- `Turn Relation Classifier`
- Step 3

### 5.2 不允许偷做 Turn Relation
例如：
- 不能因为 query 看起来像 `最近7天`，就直接判断它是 clarification reply
- 只能输出 session 动作，不输出 relation 语义

---

## 6. 状态来源原则

### 6.1 truth source
当前阶段，session truth source 可以是：
- 现有进程内 store

未来可替换为：
- 独立 session store
- thread/session runtime service

### 6.2 前端不是 truth source
前端/Channel 只能传：
- `session_id`
- `entry_meta`

不能自作主张决定：
- reset
- fork
- context inheritance

---

## 7. 正例

### 正例 1：已有有效 session
输入：
- `session_id` 存在
- session 未过期
- 无 reset 指令

期望：
```json
{
  "session_id": "session_xxx",
  "thread_action": "continue",
  "confidence": 1,
  "resolution_reason": "existing active session reused",
  "store_policy": {
    "load_existing_context": true,
    "reset_previous_context": false,
    "fork_from_session_id": null
  }
}
```

### 正例 2：显式 reset
输入：
- `raw_query = "/new 当前 vault APY 怎么样？"`

期望：
```json
{
  "thread_action": "reset",
  "confidence": 1,
  "resolution_reason": "explicit reset trigger detected"
}
```

---

## 8. 反例

### 反例 1
错误输出：
```json
{
  "thread_action": "continue",
  "turn_relation": "clarification_reply"
}
```

问题：
- 越界输出 relation

### 反例 2
错误输出：
```json
{
  "session_id": "session_xxx",
  "thread_action": "continue",
  "matched_capability_ids": ["capability.data_fact_query"]
}
```

问题：
- 越界输出 Step 3 字段

---

## 9. 验收标准

`Session Resolver` 进入实现前，至少满足：

1. 输入输出 JSON schema 完整
2. `thread_action` 三态已定义
3. 不越界承担 turn relation
4. 可独立测试：
   - continue
   - reset
   - fork_new
5. 可与当前 session store 做映射
