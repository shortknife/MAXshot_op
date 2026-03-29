# 技术开发计划（对齐 v5.2 Harness）

> 更新日期: 2026-03-25
> 对齐文档:
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/DEVELOPMENT_PLAN_V5.2_HARNESS_2026-03-25.md`

---

## 1. 技术主目标

### 目标 1
把当前系统从“能力可用”推进到“harness 可控”。

### 目标 2
让 `data_fact_query` 成为 contract-first、critic-guarded、source-aware 的稳定主链。

### 目标 3
让 TG / Web 两端的多轮行为尽量一致。

### 分工原则
- LLM 主导语义理解、对话关系判断、澄清策略、语义质检
- Harness / Code 主导边界、contract、source、audit、rollback
- 禁止把 Step 2 / Step 3 做成规则枚举式主链

---

## 2. 当前技术判断

已具备：
- capability registry runtime
- deterministic router
- gate / sealer / audit 基线
- `data_fact_query` 主能力
- 自动化回归基线

未具备：
- 完整 Step 2 会话管理 contract
- 纯 registry-first 的 Step 3 热路径
- `QueryContract`
- `CriticDecision`
- 高频 query canonical source discipline

---

## 3. 代码落地方向

### P0-A Step 2 Contract-first

目标:
- 输出正式 `ContextPacket`

最少字段:
- `session_id`
- `turn_relation`
- `active_context_refs`
- `clarification_state`
- `carry_over_slots`
- `memory_runtime`

要求:
- LLM 是 turn relation 的主判断器
- Code 负责 inheritance / reset / ttl / policy enforcement
- 不允许以 regex / keyword routing 作为主关系判断

### P0-B Step 3 Contract-first

目标:
- 输出正式 `IntentIR`

最少字段:
- `matched_capability_ids`
- `primary_capability_id`
- `slots`
- `need_clarification`
- `clarification_target`
- `reason_if_unmatched`

要求:
- LLM 是 capability match 与 slot extraction 的主判断器
- registry 是唯一 active surface
- Code 只做 schema / count / whitelist / compatibility enforcement
- compatibility 字段只保留审计用途

### P0-C Query Contract

目标:
- 把 data query 从隐式推断改成显式 contract

最少字段:
- `entity`
- `metric`
- `aggregation`
- `time_range`
- `filters`
- `source_contract`
- `clarification.required`

要求:
- no contract, no query

### P0-D CriticDecision

目标:
- `CapabilityResult` 不可直接进入用户返回

最少字段:
- `decision = pass | retry | reclarify | reject`
- `reason_codes[]`
- `semantic_fit`
- `source_fit`
- `response_fit`

要求:
- LLM 是 semantic fit 的主判断器
- Code 负责 critic contract 执行和阻断放行
- business/product/content 三类问法都要有 critic rule

### P0-E Canonical Source Table

目标:
- 为 top query class 建 source mapping

首批覆盖:
1. `execution_detail.latest`
2. `vault.list`
3. `yield.summary`
4. `yield.by_chain`
5. `allocation.summary`

---

## 4. 推荐测试升级

### 单步测试
- Step 2 relation classification fixtures
- Step 3 capability matching fixtures
- Query Contract completeness fixtures
- CriticDecision fixtures

### 集成测试
- TG 多轮 query fixture
- Web 多轮 query fixture
- source mismatch fixture
- wrong capability interception fixture

### 回归测试
- 保留现有 phase0/1/2
- 新增 harness regression pack
- 检查中间 artifact，不只检查最终 summary

---

## 5. 技术顺序

1. Step 2 contract + tests
2. Step 3 contract + tests
3. QueryContract runtime + tests
4. CriticDecision runtime + tests
5. Canonical source rules + tests
6. 再做 capability 扩展

---

## 6. 旧计划替换说明

`TECHNICAL_PLAN_V5.1_MVP.md` 不删除，保留作为功能化阶段基线。

从 2026-03-25 起，当前技术执行应以本文件为准。
