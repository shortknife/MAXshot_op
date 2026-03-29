# Capability Contract v1（落地版）

- 版本：v1.0
- 日期：2026-02-28
- 适用范围：MAXshot_opencode `Data Query` 能力及后续可插拔 Capability 平台化改造

## 1. 目标与结论

### 1.1 目标
- 将系统从“单体 + 深度定制集成”调整为“平台编排 + 可插拔能力提供者”。
- 保持 Router/Intent/Gate 的确定性；将 SQL 生成与语义推理下沉为可替换 provider。
- 在不牺牲审计与安全前提下，提高复用性和替换成本效率（Vanna/其他 provider 可切换）。

### 1.2 核心结论
- 系统确定性与 capability 结果准确性不是无关，而是“通过 Contract 弱耦合”。
- 系统不负责“答案是否真实正确”，系统负责“答案是否满足可验证的交付条件”。
- Provider 可以是 `Skill`、`Subworkflow`、`External Service`（Python/Vanna），只要满足 Contract。

## 2. 架构边界（强约束）

### 2.1 系统层（Deterministic）
- `Intent Router`：意图归类、scope 判定、槽位规范化。
- `Clarification Orchestrator`：多轮澄清、候选项（如 vault 列表）输出、槽位补全状态管理。
- `Gate`：输入完整性、安全策略、执行可行性、结果可验收性检查。
- `Orchestrator`：provider 选择、重试分级、降级与回退。
- `Audit`：全链路事件记录、回放、错误码与指标聚合。

### 2.2 能力层（Probabilistic / Replaceable）
- `Data Query Provider`：文本到 SQL、候选 SQL 排序、执行建议。
- Provider 不直接决定最终对用户返回；需通过系统 Gate 验收。
- `Vanna` 在本架构中仅作为 SQL 生成 provider，不负责多轮澄清、候选 vault 交互和“我的理解是”结果解释。

## 3. Capability Contract v1

## 3.1 输入契约（Input Contract）

```json
{
  "capability_id": "data_query",
  "request_id": "uuid",
  "session_id": "string",
  "query": {
    "raw_text": "string",
    "language": "zh|en|auto",
    "intent_type": "business_query",
    "scope": "yield|vault|execution|rebalance|allocation|unknown",
    "time_window_days": 7,
    "filters": {
      "chain": "arbitrum",
      "protocol": "morpho",
      "entity_id": null
    }
  },
  "policy": {
    "read_only": true,
    "allow_tables": ["..."],
    "max_rows": 200,
    "require_time_window": false,
    "require_limit": true
  },
  "context": {
    "timezone": "Asia/Shanghai",
    "prompt_profile": "intent_analyzer@v2"
  }
}
```

### 3.2 输出契约（Output Contract）

```json
{
  "status": "success|failed",
  "provider": {
    "name": "vanna|template_engine|custom",
    "version": "string"
  },
  "result": {
    "rows": [],
    "row_count": 0,
    "summary": "string"
  },
  "sql": {
    "text": "string|null",
    "params": [],
    "dialect": "postgres",
    "readonly_verified": true
  },
  "evidence": {
    "sources": [
      {
        "source_type": "table|view|rpc|rag",
        "source_id": "string",
        "row_count": 0
      }
    ],
    "evidence_chain": ["..."]
  },
  "quality": {
    "confidence": 0.0,
    "contract_passed": true,
    "checks": {
      "input_complete": true,
      "sql_safe": true,
      "result_usable": true
    }
  },
  "error": {
    "code": "string|null",
    "message": "string|null",
    "retryable": false
  },
  "audit_events": []
}
```

## 4. 必须门禁（Gate Rules）

### 4.1 执行前门禁
- `G0 ClarificationComplete`：关键槽位未补全前（如 vault/time_window/metric_agg）禁止调用 provider 生成 SQL。
- `G1 InputComplete`：关键槽位存在（scope、query）。
- `G2 SQLSafety`：仅允许只读语句；禁止 DDL/DML；白名单 schema/table。
- `G3 ExplainCheck`：可选执行计划成本上限（已有 explain 机制沿用）。

### 4.2 执行后门禁
- `G4 ResultUsable`：结果结构完整（rows/summary/evidence）。
- `G5 EvidencePresent`：至少一条有效 evidence source。
- `G6 PolicyCompliant`：行数/字段/时间窗策略满足产品规则。

## 5. 失败分级与重试（Deterministic Retry Ladder）

- `L1 Clarify`：输入不完备，触发最多 2 轮澄清，并优先返回候选项（如现有 vault 列表 + slug）辅助用户选择。
- `L2 Regenerate`：同 provider 换 profile 重生成 SQL（最多 1 次）。
- `L3 Fallback`：切换备用 provider（例如 template engine）。
- `L4 Reject`：返回标准错误与下一步建议。

禁止无限重试；每次重试必须记录 `rejection_reason` 与 `attempt_index`。

## 6. 标准错误码（v1）

- `missing_required_clarification`
- `out_of_business_scope`
- `sql_generation_failed`
- `sql_not_readonly`
- `sql_explain_rejected`
- `sql_execution_timeout`
- `insufficient_business_data`
- `provider_unavailable`
- `contract_validation_failed`

## 7. Provider 适配器规范（可插拔关键）

每个 provider 必须实现统一 adapter 接口：

```ts
interface DataQueryProvider {
  name: string
  version: string
  generate(input: ContractInput): Promise<ProviderOutput>
  health(): Promise<{ ok: boolean; detail?: string }>
}
```

### 7.1 Vanna Provider 的最小职责
- 输入：已澄清完成的结构化查询槽位（scope/vault/time_window/metric_agg 等）+ schema/doc/sql 检索上下文。
- 输出：候选 SQL（首选 1 条）+ 置信度 + 可选解释。
- 不负责最终用户文案、不负责平台级 Gate。

### 7.2 交互流程约束（Data Query）
1. 用户问题进入后，先由系统完成意图识别与槽位检查。
2. 若槽位不全，系统先澄清（含候选 vault 列表），不生成 SQL。
3. 槽位补全后，调用 provider（如 Vanna）生成 SQL。
4. SQL 通过 Gate 后执行并返回结果。
5. 返回结果必须附“理解声明”（例如：当前理解为某 vault、某时间范围、某统计口径）。
6. 用户纠偏（如“不是平均，是最高”）时，仅更新相关槽位并重新生成 SQL。

## 8. 与现有代码映射（当前可直接对齐）

- 编排入口：`admin-os/app/api/chat/ask/route.ts`
- 业务能力编排：`admin-os/lib/capabilities/business-data-query.ts`
- 业务能力子模块：
  - `admin-os/lib/capabilities/business-query-planner.ts`
  - `admin-os/lib/capabilities/business-query-runtime.ts`
  - `admin-os/lib/capabilities/business-query-provider.ts`
  - `admin-os/lib/capabilities/business-query-retry.ts`
  - `admin-os/lib/capabilities/business-query-freeform.ts`
  - `admin-os/lib/capabilities/business-query-normalizer.ts`
  - `admin-os/lib/capabilities/business-query-pipeline.ts`
  - `admin-os/lib/capabilities/business-query-output.ts`
  - `admin-os/lib/capabilities/business-query-contract.ts`
- 模板能力：`admin-os/lib/capabilities/data-fact-query.ts`
- 意图分析：`admin-os/lib/intent-analyzer/deepseek-client.ts`

当前状态（2026-03-16）：`business-data-query` 已完成“薄编排 + 多模块”收口，仍保留少量编排桥接代码，后续继续保持 Contract 不变前提下优化。

## 9. 分阶段改造计划（低风险）

### Phase A（1-2天）
- 引入 Contract 校验器（输入/输出）。
- 不改业务行为，仅把现有输出对齐 Contract。
 - 状态：已完成。

### Phase B（2-4天）
- 抽象 `DataQueryProvider` 接口。
- 现有模板引擎实现 `template_provider`，作为默认 provider。
 - 状态：已完成（Provider 梯度与 fallback 已模块化）。

### Phase C（3-5天）
- 新增 `vanna_provider`（外部 Python 服务）。
- 开启 `provider_fallback` 策略：`vanna -> template` 或反向。
 - 状态：已完成 MVP 版（按需子进程 + fallback），不要求常驻服务。

### Phase D（持续）
- 接入反馈学习闭环：`question + sql + verdict` 入库用于 provider 训练。
 - 状态：进行中（当前以审计与回归基线为主）。

## 10. 验收标准（Definition of Done）

- 同一 API 协议下可无缝切换至少 2 个 provider。
- 所有 provider 输出均通过统一 Contract 验证。
- 失败路径能稳定落到标准错误码，不出现“未知失败”。
- 回归测试覆盖：
  - 成功路径
  - 澄清路径
  - 超时/空结果/非只读 SQL 拦截路径
  - provider 降级切换路径

---

本版本作为 Capability 平台化基线。后续若重构系统架构，优先保持“Contract 稳定、Provider 可替换、Gate 可审计”三条不变。
