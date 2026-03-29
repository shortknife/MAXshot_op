# Step 2 Current Gap Analysis

- Date: 2026-03-21
- Scope: `Step 2 - Context Load`
- Baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_CONVERSATION_CONTEXT_MANAGER_CONTRACT_V1_2026-03-21.md`
- Purpose: 对齐当前已开发实现与 Step 2 目标标准的差距，作为后续开发与测试依据

## 1. 当前实现概览

当前代码中，Step 2 相关逻辑主要分散在以下位置：

1. Clarification Context
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/query-clarification.ts`
2. Session Follow-up Context
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-context.ts`
3. Step 2 / Step 3 混合入口
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
4. Capability Registry Load
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/router/capability-catalog.ts`
5. Memory Runtime
   - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/memory-refs.ts`

## 2. 当前实现做到了什么

### 2.1 已实现能力

#### A. 短期 session context

当前已有进程内短期上下文：

```ts
type SessionBusinessContext = {
  scope: string
  query_mode: string
  chain?: string
  protocol?: string
  vault_name?: string
  time_window_days?: number
  aggregation?: string
  updated_at: number
}
```

特点：
- 基于 `Map`
- TTL = 30 分钟
- 主要服务于业务查询连续对话

#### B. clarification state

当前已有待澄清状态存储：
- `stateStore`
- 可把用户短回复拼接为：
  - `baseQuery；补充条件：reply`

#### C. registry-first 运行时装载

当前 active capability registry 已接入运行时：
- capability 真源来自本地 registry JSON
- 可生成 registry ref ids

#### D. memory runtime 基础壳

当前已有统一的 `memory_runtime` 结构：

```json
{
  "source_policy": "router_context_only",
  "ref_ids": [],
  "memory_ref_count": 0
}
```

#### E. 基础防串场能力

当前已修复明显问题：
- 新问题被旧 APY 澄清吞掉
- 产品定义类问题误被当作业务补充

## 3. 当前实现与目标标准的差距

### Gap 1. 没有正式的 Conversation Context Envelope

**目标标准**
- Step 2 应输出统一 `Context Envelope`

**当前实现**
- 输出是散的：
  - `effectiveQuery`
  - `previousTurns`
  - `followUpContextApplied`
  - store 中的上下文
  - registry refs / memory refs

**结论**
- 当前没有正式 Step 2 输出 Contract
- 这导致 Step 2 不可独立测试、不可独立验收

---

### Gap 2. 没有正式的 Turn Relation Classifier

**目标标准**
- Step 2 必须显式输出：
  - `continuation`
  - `clarification_reply`
  - `correction`
  - `new_topic_same_window`
  - `history_callback`
  - `new_session`

**当前实现**
- 主要依赖规则函数：
  - `looksLikeFollowUp`
  - `looksLikeOptionReply`
  - `looksLikeStandaloneQuestion`
  - `looksLikeClarificationAnswer`
  - `inferBusinessScope`
  - `inferQueryScope`

**结论**
- 当前只有“隐式 turn relation 判断”
- 没有正式 relation taxonomy
- 这是 Step 2 当前最大架构缺口

---

### Gap 3. session context 仍是 business-only

**目标标准**
- Step 2 应是通用 conversation context manager

**当前实现**
- `SessionBusinessContext` 只覆盖：
  - yield
  - vault
  - execution
  - rebalance
  - allocation

**结论**
- 当前 context model 不是通用 conversation model
- 只能算业务对话续接器，不是完整 Step 2

---

### Gap 4. Step 2 与 Step 3 耦合过紧

**目标标准**
- Step 2 应先独立产出 `Context Envelope`
- 然后交给 Step 3 做 intent/capability 识别

**当前实现**
- `chat-request-preprocess.ts` 中直接：
  1. clarification context
  2. follow-up context
  3. `parseIntent()`

**结论**
- Step 2 与 Step 3 没有清晰分层
- 当前只能做端到端验证，不利于逐步验收

---

### Gap 5. history callback 没有正式能力位

**目标标准**
- Step 2 应保留 `history_callback`

**当前实现**
- 没有正式 history callback 路径
- 没有针对“我之前问过那个...”的结构化处理

**结论**
- 当前 Step 2 缺少长期会话回溯能力位

---

### Gap 6. LLM 在 Step 2 中还不是主判断器

**目标标准**
- LLM 应主导多轮关系判断
- Code 负责 state/policy/guardrails

**当前实现**
- Step 2 几乎全是 Code 规则

**结论**
- 当前实现更像规则补丁式 MVP
- 未达到 Agent 底色产品对 Step 2 的要求

## 4. 当前实现中哪些部分应保留

以下部分应保留，不建议推翻：

1. 本地 capability registry load
2. `memory_runtime.source_policy = router_context_only`
3. clarification state 存储壳
4. session TTL / 基础 store 机制
5. context inheritance 的 deterministic policy 方向

原因：
- 它们是 Step 2 的确定性底座
- 问题不在于这些结构本身，而在于语义判断层还没正式化

## 5. 当前实现中哪些部分应迁移/重构

以下部分后续应被重构为正式 Step 2 模块：

1. `looksLikeFollowUp` 类启发式函数
2. `looksLikeStandaloneQuestion` 类启发式函数
3. clarification/new question 判断逻辑
4. `chat-request-preprocess.ts` 中 Step 2 / Step 3 混合流程

## 6. 当前结论

### 6.1 能力判断

当前 Step 2 不是“没做”，而是：

- 已有一个可运行的 MVP 实现
- 已能解决简单 follow-up 和部分防串场问题
- 已能装载 registry 和 memory refs

### 6.2 架构判断

当前 Step 2 仍不满足目标标准，因为：

1. 没有正式 `Context Envelope`
2. 没有正式 `turn_relation` taxonomy
3. 语义判断仍由规则主导
4. conversation model 仍是 business-only

### 6.3 最终定性

当前 Step 2 可定义为：

> 一个规则驱动的、多轮业务查询续接 MVP，而不是完整的 Conversation Context Manager。

## 7. 后续开发与测试口径

从本文件起，后续所有 Step 2 开发/测试必须以以下顺序推进：

1. 先对照 `STEP2_CONVERSATION_CONTEXT_MANAGER_CONTRACT_V1`
2. 再判断当前实现差距属于哪一类：
   - 输出 Contract 缺失
   - relation classifier 缺失
   - context model 不足
   - Step 2 / Step 3 边界混淆
3. 开发时优先补足 Step 2 的正式结构，而不是继续叠加 if/else 规则
