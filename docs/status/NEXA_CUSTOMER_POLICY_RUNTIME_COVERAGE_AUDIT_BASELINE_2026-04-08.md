# Nexa Customer Policy Runtime Coverage Audit Baseline

Date: 2026-04-08
Status: accepted baseline

## Decision
Audit remaining runtime/API entry coverage after the runtime-entry block, fix the highest-risk uncovered write paths immediately, and classify the next uncovered area instead of continuing surface-level work.

## Scope
- audit remaining execution-adjacent and operator-heavy runtime entries
- fix uncovered write paths with direct customer/operator impact
- classify still-uncovered read/reporting paths for the next block

## High-Risk Gaps Closed In This Block
### 1. Task sealing entry consistency
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/intent/task/create/route.ts`
- requester/customer mismatches are now rejected before sealing
- normalized customer scope now propagates into:
  - `tasks_op.schedule_config.context.customer_id`
  - `tasks_op.schedule_config.payload.slots.customer_id`
  - `task_executions_op.payload.customer_id`
  - `task_executions_op.payload.context.customer_id`

### 2. Evolution hypothesis entry enforcement
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/evolution/hypothesis/route.ts`
- now uses execution customer scope enforcement before generating hypothesis output

### 3. Shared requester/customer normalization
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-entry.ts`
- new shared helper:
  - `enforceRequesterCustomerContext(...)`
- reused by:
  - chat ask entry
  - intent task create entry

## Remaining Coverage Findings
These paths still read execution/customer-scoped runtime data without equivalent server-side customer access enforcement and should become the next runtime block:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/[id]/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/snapshot/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/lineage/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/outcome-delta/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/causality/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/audit/metrics/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/marketing/cycle-report/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/evolution/hypothesis-report/route.ts`

## Why This Cut
The weak point after the last block was no longer mutation-entry coverage in general; it was selective uncovered server entries. The highest-risk uncovered writes were task creation and hypothesis generation because they can create or enrich customer-scoped runtime state. Read/reporting coverage remains important, but it is a separate block.
