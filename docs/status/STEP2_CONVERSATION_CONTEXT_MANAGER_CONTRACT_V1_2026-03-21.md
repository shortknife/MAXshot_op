> superseded_note: 自 2026-03-26 起，本文件仅作为 Step 2 过渡壳历史基线；当前唯一执行标准请改看 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md` 与 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_编码执行清单_V2_2026-03-26.md`

# Step 2 Conversation Context Manager Contract v1

- Date: 2026-03-21
- Status: Frozen
- Scope: `Step 2 - Context Load`
- Role: 多轮对话管理、上下文装载与后续整体测试/开发的统一依据

## 1. 定义

Step 2 的正式职责是：

1. 处理多轮对话管理
2. 判断当前消息与既有会话/上一轮对话的关系
3. 装载运行时上下文
4. 为 Step 3 提供标准化的 `Context Envelope`

Step 2 解决的问题，不是“用户到底想查什么”，而是：

- 这条消息属于哪个 `session/thread`
- 它和前文的关系是什么
- 当前允许下传给 Step 3 的上下文是什么

Step 2 不负责：

- capability 最终匹配
- intent 最终分类
- gate 决策
- router 绑定
- capability 执行

这些职责属于 Step 3 及后续步骤。

## 2. Step 2 目标

Step 2 必须把任意一条进入系统的用户消息，转换成一个可供后续意图识别消费的 **Conversation Context Envelope**。

这个 Envelope 必须同时表达：

1. `session` 归属
2. 当前 turn 与上一轮的关系
3. 当前可继承/可加载的 conversation context
4. active capability registry
5. memory runtime refs

## 3. 输入 Contract

Step 2 输入来自 Step 1 的 `Entry Envelope`，并附加运行时依赖：

```json
{
  "entry": {
    "entry_channel": "web_chat",
    "session_id": "session_xxx",
    "request_id": "req_xxx",
    "raw_query": "那 arbitrum 呢？",
    "received_at": "2026-03-21T03:20:00.000Z",
    "requester_id": null,
    "entry_meta": {}
  },
  "runtime": {
    "active_capabilities": [],
    "session_store": {},
    "memory_store": {}
  }
}
```

### 3.1 输入字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `entry` | `object` | 是 | Step 1 的标准输出 |
| `runtime.active_capabilities` | `array` | 是 | 当前 active capability 列表 |
| `runtime.session_store` | `object` | 是 | 当前 session/thread 上下文读入口 |
| `runtime.memory_store` | `object` | 是 | 当前 memory 读入口 |

## 4. 输出 Contract

Step 2 输出必须收敛为标准 `Context Envelope`：

```json
{
  "session_resolution": {
    "session_id": "session_xxx",
    "thread_action": "continue",
    "confidence": 0.93
  },
  "turn_relation": {
    "type": "continuation",
    "confidence": 0.90,
    "reason": "inherits prior yield scope and narrows by chain"
  },
  "conversation_context": {
    "pending_clarification": {
      "exists": true,
      "scope": "yield",
      "missing_slots": ["time_window"]
    },
    "active_context": {
      "scope": "yield",
      "query_mode": "metrics",
      "chain": null,
      "protocol": null,
      "vault_name": null,
      "time_window_days": 7,
      "aggregation": "avg"
    }
  },
  "registry_context": {
    "active_capability_ids": [
      "capability.data_fact_query",
      "capability.product_doc_qna",
      "capability.content_generator",
      "capability.context_assembler"
    ]
  },
  "memory_runtime": {
    "source_policy": "router_context_only",
    "ref_ids": [
      "capability_registry_v1",
      "capability_registry_v1:capability.data_fact_query"
    ],
    "memory_ref_count": 2
  },
  "effective_query": "那 arbitrum 呢？",
  "context_ready": true
}
```

说明：
- `conversation_context` 表示 **policy 应用前快照**
- `policy_decision`（若在模块聚合输出中存在）表示 **本轮处理动作**
- 二者允许同时出现，不冲突

## 5. Turn Relation Taxonomy

Step 2 必须把当前消息归入以下之一：

| 类型 | 含义 |
| --- | --- |
| `new_session` | 明确新会话或会话重置 |
| `continuation` | 同一问题链上的自然续问 |
| `clarification_reply` | 对系统上轮澄清问题的直接补充 |
| `correction` | 用户纠正上一轮理解或条件 |
| `new_topic_same_window` | 同一对话框内切到新话题，但仍沿用当前 session |
| `history_callback` | 用户明确回溯更早的 query/结论 |

禁止使用未定义的自由文本关系标签。

## 6. Session Resolution Contract

Step 2 必须输出：

```json
{
  "session_id": "session_xxx",
  "thread_action": "continue | fork_new | reset",
  "confidence": 0.0
}
```

### 6.1 说明

- `continue`
  - 沿用当前 session/thread
- `fork_new`
  - 在同一窗口中开启新 topic 的子线程/新会话链
- `reset`
  - 显式重置（如未来 `/new`）

当前 MVP 可先只稳定支持：
- `continue`
- `reset`

但 Contract 先保留 `fork_new`，作为后续演化位。

## 7. Context Policy

Step 2 必须根据 `turn_relation` 应用确定性的上下文继承策略。

### 7.1 continuation
- 允许继承：
  - `scope`
  - `query_mode`
  - `chain`
  - `protocol`
  - `vault_name`
  - `time_window_days`
  - `aggregation`

### 7.2 clarification_reply
- 允许继承：
  - pending clarification state
  - 原 query 主体
- 当前输入被视为补充条件，而不是全新 query

### 7.3 correction
- 允许继承大部分 context
- 但必须允许显式覆盖冲突槽位
- 例如：
  - `不是 market，是 vault`
  - `不是平均，是最高`

### 7.4 new_topic_same_window
- 必须清空旧业务上下文
- 但允许保留：
  - `session_id`
  - requester/channel 基础信息

### 7.5 history_callback
- 不直接继承上一轮业务 context
- 应触发历史 query / 历史答案回溯机制
- 当前版本可仅保留为架构保留位

## 8. 实现职责分配

Step 2 的推荐职责分配如下：

### 8.1 LLM 主导

LLM 负责：
- `turn_relation` 判断
- `new topic vs continuation`
- `clarification reply`
- `correction`
- `history callback`

原因：
- 这些都是语义关系判断
- 不适合长期依赖 regex / hard-coded rules

### 8.2 Code 主导

Code 负责：
- session/thread 基础装载
- pending clarification 读取
- active capability registry 装载
- memory runtime refs 装载
- context inheritance policy 执行
- 结构校验与 guardrails

原因：
- 这些需要确定性、可审计、可回放

## 9. Step 2 禁止做的事情

以下行为不属于 Step 2：

- 输出 `matched_capability_ids`
- 输出 `primary_capability_id`
- 输出最终 `intent_type`
- 输出 `gate_result`
- 输出 `execution_mode`
- 直接构造 SQL / capability payload

这些行为应留给 Step 3 及之后。

## 10. 当前版本边界

本 Contract 作为目标标准，当前产品可接受的边界如下：

1. 当前主入口为 `web_chat`
2. 当前重点场景为 `data_fact_query`
3. memory runtime 允许为收紧版
4. `history_callback` 可先保留为架构位，不要求已完整实现
5. `product_doc_qna` 不在 Step 2 完整性验收范围内，它只作为“不要被误路由”的边界对照

## 11. 验收标准

Step 2 通过标准：

1. 能输出标准 `Context Envelope`
2. 能稳定区分：
   - continuation
   - clarification_reply
   - correction
   - new_topic_same_window
3. active capability registry 正确装载
4. memory refs 可稳定注入
5. 上下文继承/清空规则可解释、可审计

## 12. 用途

本文件作为以下工作的唯一标准之一：

- Step 2 后续开发
- Step 2 模块化测试
- 多轮对话产品验收
- Step 2 / Step 3 职责边界判断
- Conversation Manager 架构收口
