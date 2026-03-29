# Prompt 5-Case Eval (2026-03-26)

## Scope
This report evaluates prompt-layer behavior only. It does not claim end-to-end business correctness.

Evaluated layers:
- Step 2 turn relation prompt
- Step 3 intent matcher prompt
- Step 3 intent critic prompt
- Step 3 intent normalizer prompt

Not evaluated here:
- downstream SQL/runtime correctness
- final UI rendering
- capability answer quality

## Runtime
- Local prompt source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/prompt-library-op/prompt_library_op_v2.json`
- Intent prompt: `intent_analyzer_op_v2`
- Intent critic: `intent_critic_op_v1`
- Intent normalizer: `intent_normalizer_op_v1`
- Turn relation prompt: `turn_relation_classifier_op_v2`
- Model path: DeepSeek API
- Current datetime injected into prompt context: `Asia/Shanghai`

## Baseline Cases

| Case | Query | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | `3月第一周的平均APY是多少` | `business_query`, `scope=yield`, `metric=apy`, `aggregation=avg`, March week 1 preserved | `business_query`, `scope=yield`, `metric=apy`, `aggregation=avg`, `date_from=2026-03-01`, `date_to=2026-03-07`, `calendar_month=3`, `week_of_month=1` | PASS |
| 2 | `2月份平均日tvl是多少` | `business_query`, `scope=vault`, `metric=tvl`, `aggregation=avg`, February preserved | `business_query`, `scope=vault`, `metric=tvl`, `aggregation=avg`, `date_from=2026-02-01`, `date_to=2026-02-28`, `calendar_month=2` | PASS |
| 3a | `3月20日当天APY 最高和最低的vault 是那两个呢？` | `business_query`, `scope=yield`, `metric=apy`, exact day preserved | `business_query`, `scope=yield`, `metric=apy`, `aggregation=compare`, `date_from=2026-03-20`, `date_to=2026-03-20`, `exact_day=2026-03-20`, `question_shape=top_bottom_in_day` | PASS |
| 3b | `那其TVL多少呢？` | follow-up should inherit same day/object, switch to `metric=tvl` | `business_query`, `scope=yield`, `metric=tvl`, `entity=vault`, inherited `exact_day=2026-03-20` | PASS |
| 3c | `当天有调仓的Action么？` | follow-up should inherit same day and switch domain to rebalance action | `business_query`, `scope=rebalance`, `metric=rebalance_action`, `entity=rebalance_action`, inherited `exact_day=2026-03-20` | PASS |
| 4a | `现在ARB 链上有那几个Vault？` | `business_query`, `scope=vault`, `metric=vault_list`, chain alias normalized to arbitrum | `business_query`, `scope=vault`, `metric=vault_list`, `entity=chain`, `chain=arbitrum` | PASS |
| 4b | `Base 呢` | follow-up should inherit vault-list semantics and switch chain only | `business_query`, `scope=vault`, `metric=vault_list`, `entity=chain` | PASS |
| 4c | `Sol呢？` | follow-up should inherit vault-list semantics and switch chain only | `business_query`, `scope=vault`, `metric=vault_list`, `entity=chain` | PASS |
| 5 | `你能做什么业务呢？` | capability self-description, not metrics | `general_qna`, `question_shape=capability_overview`, `matched_capability_id=capability.product_doc_qna` | PASS |

## What Changed
1. Added explicit `current_datetime` injection to prompts and hidden schema hint.
2. Expanded schema hint to include `metric`, `calendar_year`, `calendar_month`, `week_of_month`, `exact_day`, `compare_targets`, `capability_overview`.
3. Added `intent_normalizer_op_v1` as a third semantic layer after critic.
4. Added stronger normalization for:
   - APY -> `scope=yield`
   - TVL -> `scope=vault`
   - chain vault list -> `metric=vault_list`, normalized chain aliases
   - day-level rebalance follow-up -> inherited exact day
   - capability self-description -> `capability.product_doc_qna`

## Evidence
Prompt-only regression asset:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/__tests__/prompt-baseline-5case.test.ts`

Representative runs executed locally with DeepSeek enabled:
- `case1`, `case2`, `case3a`, `case3b`, `case3c`, `case4a`, `case4b`, `case4c`, `case5`

## Conclusion
Prompt-layer recognition for the 5 baseline cases is now at the required standard.

This conclusion is limited to recognition semantics. It does not imply that downstream runtime, SQL generation, or final answers are already correct. The next failures, if any, should be treated as downstream execution / capability issues rather than baseline prompt-recognition issues.
