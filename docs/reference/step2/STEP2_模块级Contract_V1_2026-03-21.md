> superseded_note: 自 2026-03-26 起，本文件仅作为 Step 2 过渡壳历史基线；当前唯一执行标准请改看 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md` 与 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_编码执行清单_V2_2026-03-26.md`

# Step 2 模块级 Contract V1

- Status: Frozen

## 文档目的

把 Step 2 从“一个大步骤”继续拆成模块级输入输出 contract。  
后续编码时，每个模块必须按这里的接口与责任实现。

---

## 模块列表

1. `Session Resolver`
2. `Turn Relation Classifier`
3. `Context Assembler`
4. `Context Policy Engine`
5. `Recall Adapter`

---

## 1. Session Resolver

### 输入
```json
{
  "entry": {
    "entry_channel": "web_chat",
    "session_id": "session_xxx",
    "request_id": "req_xxx",
    "raw_query": "当前 vault APY 怎么样？"
  },
  "session_store_snapshot": {},
  "clarification_store_snapshot": {}
}
```

### 输出
```json
{
  "session_id": "session_xxx",
  "thread_action": "continue",
  "confidence": 1,
  "resolution_reason": "existing session reused"
}
```

### 负责
- session/thread 归属
- reset/fork/continue 的确定性判断

### 不负责
- turn relation
- capability
- intent

---

## 2. Turn Relation Classifier

### 输入
```json
{
  "raw_query": "那 arbitrum 呢？",
  "recent_turns_summary": [],
  "pending_clarification": {},
  "active_context_summary": {}
}
```

### 输出
```json
{
  "type": "continuation",
  "confidence": 0.92,
  "reason": "..."
}
```

### 负责
- 对话关系语义判断

### 不负责
- capability
- intent
- gate

---

## 3. Context Assembler

### 输入
```json
{
  "entry": {},
  "session_resolution": {},
  "turn_relation": {},
  "session_store_snapshot": {},
  "clarification_store_snapshot": {},
  "registry_snapshot": {},
  "memory_sources": {}
}
```

### 输出
```json
{
  "conversation_context": {
    "pending_clarification": {},
    "active_context": {}
  },
  "registry_context": {
    "active_capability_ids": [],
    "registry_version": "v1"
  },
  "memory_runtime": {
    "source_policy": "router_context_only",
    "ref_ids": [],
    "memory_ref_count": 0
  }
}
```

### 负责
- 统一组装 Step 2 运行时上下文
- 输出的是 **policy 应用前快照**

### 不负责
- 继承策略决策
- capability 匹配

---

## 4. Context Policy Engine

### 输入
```json
{
  "turn_relation": {
    "type": "continuation"
  },
  "conversation_context": {},
  "entry": {
    "raw_query": "那 arbitrum 呢？"
  }
}
```

### 输出
```json
{
  "effective_query": "那 arbitrum 呢？",
  "policy_decision": {
    "inherit_context": true,
    "clear_pending_clarification": false,
    "override_fields": [],
    "trigger_recall": false
  }
}
```

### 负责
- 继承/清空/覆盖/触发 recall 的决策

### 不负责
- session 归属
- capability 识别

---

## 5. Recall Adapter

### 输入
```json
{
  "entry": {
    "raw_query": "我之前问的 dForce 那个再看一下"
  },
  "turn_relation": {
    "type": "history_callback"
  },
  "available_history": [],
  "memory_runtime": {}
}
```

### 输出
```json
{
  "recall_hits": [],
  "recall_summary": "",
  "recall_confidence": 0.0
}
```

### 负责
- 历史回溯检索

### 不负责
- 一般 follow-up
- 新 topic 判断

---

## 6. 最终 Step 2 聚合输出

Step 2 最终输出必须统一成：

```json
{
  "session_resolution": {},
  "turn_relation": {},
  "conversation_context": {},
  "registry_context": {},
  "memory_runtime": {},
  "effective_query": "",
  "policy_decision": {},
  "recall": {},
  "context_ready": true
}
```

---

## 7. 模块间依赖

依赖顺序固定：

1. `Session Resolver`
2. `Turn Relation Classifier`
3. `Context Assembler`
4. `Context Policy Engine`
5. `Recall Adapter`
6. Step 2 聚合输出

说明：
- `Recall Adapter` 只有在 `trigger_recall=true` 时运行
- `Turn Relation Classifier` 的结果会影响后续所有 policy

---

## 8. 模块级开发约束

1. 任一模块都不得输出 Step 3 的 capability/intention 结论
2. 任一模块都必须有 JSON 输入输出 contract
3. 模块之间只能通过 contract 交互，不允许继续隐式共享散落字段
4. 编码前必须先有对应 Prompt Spec 或模块说明文档
