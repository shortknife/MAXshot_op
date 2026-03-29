# Business Query Module Boundary (Current)

Updated: 2026-03-16

## Orchestrator
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-data-query.ts`
- Scope:
  - parse request context (scope/raw_query/filters/memory_refs)
  - call runtime/provider/pipeline
  - apply output contract finalizer

## Submodules
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-planner.ts`
  - NL intent helpers (yield trend/extreme/ranking/vault keyword/execution id)
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-runtime.ts`
  - scope-based dispatch (`vault/execution/yield/rebalance/allocation`)
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-provider.ts`
  - data-source ladder (`rpc/template/table`) and yield window fallback
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-retry.ts`
  - transient retry policy
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-freeform.ts`
  - optional freeform SQL path (guarded by read-only + explain cost)
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-normalizer.ts`
  - row formatting, summary generation, metric semantics, quality alert
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-pipeline.ts`
  - post-query shaping/filtering/fallback/single-row logic
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-output.ts`
  - success/failure output envelope builder
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-contract.ts`
  - input/output contract finalization metadata

## Rule
- provider does not decide product UX text beyond query summaries.
- orchestrator is the only place that assembles final CapabilityOutput lifecycle.
