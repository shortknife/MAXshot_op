# Query Contract v2

Status: active baseline for Step 3 downstream runtime

## Purpose

`data_fact_query` must stop consuming loose slots ad hoc.
Before execution, runtime forms one explicit `Query Contract` object and passes it through:

1. context assembly
2. scope runtime
3. provider / pipeline
4. output metadata

This gives one stable execution surface for:

- time semantics
- metric semantics
- target object semantics
- completeness / missing-slot state

## Contract Shape

Current runtime object:

- `version`
- `scope`
- `metric`
- `entity`
- `aggregation`
- `query_mode`
- `question_shape`
- `return_fields`
- `time`
  - `timezone`
  - `time_window_days`
  - `date_from`
  - `date_to`
  - `exact_day`
  - `calendar_year`
  - `calendar_month`
  - `week_of_month`
- `targets`
  - `chain`
  - `protocol`
  - `vault_name`
  - `market_name`
  - `compare_targets`
  - `execution_id`
- `completeness`
  - `ready`
  - `missing_slots`

## Current Rules

### Yield

- Requires `metric`
- Requires time semantics:
  - `time_window_days`, or
  - `date_from/date_to`
- Requires `aggregation` unless the question is a snapshot-style query

### Vault TVL Trend

- If `metric=tvl` and question shape is trend-like, time semantics are required

### Compare Follow-up

- If compare targets are present and time window is already inherited, contract is executable

## Runtime Integration

`Query Contract v2` is now built in:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-context-assembly.ts`

and is now consumed by runtime routing in:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-runtime.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-provider.ts`

and attached to output metadata from:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-output.ts`

and surfaced again in chat response meta from:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/business-response.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/business-success-response.ts`

This means success and failure responses can now be audited against the same contract object.

## Immediate Benefits

1. We can inspect one object instead of re-deriving semantics from scattered slots.
2. Clarification failures become explainable in terms of `missing_slots`.
3. Follow-up behavior becomes easier to debug because inherited time/targets appear in one place.
4. Critic / canonical-source work can consume the same normalized execution object.

## Not Done Yet

This is not the final runtime refactor.

Still pending:

1. Move the remaining trend/ranking branches from raw-query heuristics into contract fields
2. Make pipeline/summarization consume contract semantics instead of inferring intent shape from rows
3. Add `critic_decision` against `query_contract`
4. Tighten output contract so `contract_passed=false` becomes a hard reject path where appropriate
