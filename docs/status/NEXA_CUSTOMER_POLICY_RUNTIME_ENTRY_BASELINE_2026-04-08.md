# Nexa Customer Policy Runtime Entry Baseline

Date: 2026-04-08
Status: accepted baseline

## Decision
Add deterministic customer-policy enforcement at server/runtime entry points that previously relied on page guards or trusted request bodies.

## Scope
- chat entry identity/customer consistency
- execution-backed operator APIs
- operator-heavy mutation APIs tied to `task_executions_op`
- direct execution evolve entry

## Implemented
- New shared helper:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-entry.ts`
- Identity registry now supports direct identity lookup:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/identity-registry.ts`
- Chat entry guard:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/chat/ask/route.ts`
- Execution entry enforcement:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/run/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/confirm/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/replay/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/retry/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/expire/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/evolve/route.ts`
- Mutation entry enforcement:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/writeback/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/memory/weight-apply/route.ts`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/marketing/feedback/route.ts`

## Runtime Contract
### Chat
- if `requester_id` is present, the server resolves identity from filesystem identity assets
- unknown requester returns `404 requester_identity_not_found`
- mismatched `requester_id.customer_id` vs request `customer_id` returns `403 requester_customer_mismatch`
- missing request `customer_id` is normalized to the requester's customer when available

### Execution-backed mutation entries
- the server resolves customer scope from `task_executions_op.payload.customer_id`
- fallback resolution order:
  - `payload.customer_id`
  - `payload.context.customer_id`
  - `requester_id -> identity.customer_id`
- if customer scope is known, operator access must satisfy `assertOperatorCustomerAccess`
- if customer scope cannot be derived, operator must satisfy `assertOperatorPlatformAccess`
- blocked attempts append `write_blocked` audit evidence to the execution row

## Why
Previous customer-policy work covered surfaces, defaults, evidence, and client enforcement. The remaining weak point was server entry: several APIs still trusted client-provided customer/operator combinations or page-level guards. This block closes that gap.
