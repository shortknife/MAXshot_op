# MAXshot Query Semantics Spec v1

> Status: Draft (v1)  
> Scope: Product-query semantics for MAXshot main product operations (not governance-only admin telemetry)

## 1. Purpose

Define a production query contract for:

- Natural-language business operations queries
- Multi-turn clarification (max 2 rounds)
- Controlled Text-to-SQL execution
- Evidence-backed answers with auditable provenance

This spec is the code-implementation baseline and can be iteratively refined.

## 2. Product Boundary

### 2.1 In Scope

- Vault operations metrics (APY/TVL/allocation/execution health)
- Execution-level lookup and audit-causal analysis
- Trend/period analysis (e.g., last 7 days APY trend)
- Follow-up clarification when user intent is under-specified

### 2.2 Out of Scope

- Governance-only queue telemetry as replacement for business answers
- Silent downgrade from business query to governance query
- Unrestricted SQL generation/execution without controls

## 3. Query Modes (Aligned to Workflow 15 Logic)

### 3.1 Metrics Mode

Use for aggregate/statistical requests, e.g.:

- "当前 vault APY 怎么样？"
- "最近 7 天 TVL 走势如何？"

Pipeline:

1. Intent classification
2. Clarification (if needed, max 2 turns)
3. Controlled SQL/RPC execution
4. Optional narrative enhancement
5. Structured response + evidence

### 3.2 Investigate Mode

Use for causal/why-questions, e.g.:

- "为什么今天没调仓？"
- "哪天 APY 最低，可能原因是什么？"

Pipeline:

1. Intent classification
2. Clarification (if needed, max 2 turns)
3. Fact retrieval (SQL first)
4. Causal evidence retrieval (decision + narrative)
5. Explainable response + evidence chain

### 3.3 Lookup Mode

Use for exact-object lookup, e.g.:

- "给我 execution xxx 的详情"
- "查某个 vault 的最新状态"

Pipeline:

1. Parse exact key(s)
2. Execute constrained detail query
3. Return object details with source reference

## 4. Clarification Policy (Confirmed)

- Max clarification turns: `2`
- If still ambiguous after 2 turns:
  - Return recommended rephrased options
  - Reserve "handoff to human" as future capability

Clarification triggers include:

- Missing metric definition (instant APY vs daily average vs point-in-time)
- Missing time grain (hour/day/week)
- Missing scope (all vaults vs specific vault/chain/protocol)
- Missing timezone context (default is Asia/Shanghai)

## 5. Metric Semantics

### 5.1 TVL

- Product default metric: `vault_tvl`
- Do not default to `market_tvl` in user-facing summary
- If market-capacity metric is requested, must be explicit in query and response label

### 5.2 APY

- APY semantics must be explicit per query:
  - instant point
  - daily aggregate
  - period aggregate
- If user does not specify, trigger clarification flow

### 5.3 Timezone

- Default reporting timezone: `Asia/Shanghai`
- Time boundaries and daily buckets must be computed in this timezone

## 6. Data Source Strategy

There is no single page-synced canonical table/view for app rendering parity.
Therefore use semantic source routing:

1. Fact-layer primary sources (business logs decomposed into tables)
2. RPC/view as query templates/abstractions over fact data
3. Narrative layer for causal explanation only (not numeric source of truth)

When page output and fact aggregation differ:

- Product answer uses fact-layer aggregation
- UI/page values are treated as verification reference, not source of truth

## 7. Evidence Priority (Decision)

Evidence ordering is query-type dependent:

- Rebalance/block/cooldown causality:
  - `rebalance_decisions` -> `execution_logs_rag` -> market environment tables
- APY/TVL movement causality:
  - market/allocation facts -> `rebalance_decisions` -> `execution_logs_rag`

Response must include:

- `evidence_chain` (ordered source list)
- `metric_semantics`
- applied filters/time range/timezone

## 8. Controlled Text-to-SQL Boundary

Production requirements:

1. Read-only SQL only (`SELECT`)
2. Whitelisted schemas/tables/views only
3. SQL guardrail validation before execution
4. SQL explain/audit record for every execution
5. Query cost and row-limit constraints
6. Reject unsafe/ambiguous SQL generation paths

## 9. Workflow-15 to Code Capability Mapping

### 9.1 Preserve

- Metrics / Investigate / Lookup triage
- Time-range parsing and normalization
- Optional RAG enhancement after fact retrieval
- Fast-track for simple metric answers

### 9.2 Extend

- Replace fixed-RPC-only dependency with controlled Text-to-SQL path
- Enforce semantic clarification before aggregation
- Add evidence-chain and metric-semantics contract in all responses

## 10. Standard Response Contract (Business Query)

Required response fields:

- `intent_type`
- `query_mode` (`metrics` | `investigate` | `lookup`)
- `summary`
- `rows` (preview)
- `meta.metric_semantics`
- `meta.timezone` (`Asia/Shanghai`)
- `meta.filters_applied`
- `meta.evidence_chain`
- `meta.audit_ref`

## 11. Error and Rejection Semantics

Use explicit product-facing rejection codes:

- `out_of_business_scope`
- `insufficient_business_data`
- `missing_required_clarification`
- `source_not_connected`
- `unsafe_sql_rejected`

No silent fallback to governance-only telemetry for business questions.

## 12. Next Implementation Steps

1. Implement clarification state machine (2-turn cap)
2. Add semantic SQL templates for core metrics/trends
3. Add controlled Text-to-SQL executor with guard/explain/audit
4. Normalize response contract (`metric_semantics`, `evidence_chain`, timezone)
5. Add regression suite:
   - ambiguity/clarification tests
   - semantic metric tests (vault_tvl vs market_tvl)
   - causality evidence-order tests
