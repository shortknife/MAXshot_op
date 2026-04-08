# Nexa Customer Policy Read-Scope Baseline

Date: 2026-04-08
Status: accepted

## Goal
Add deterministic server-side customer policy enforcement to the remaining read/reporting runtime paths that were still relying on page guards or unaudited request parameters.

## Scope
- execution read routes
- reporting read routes
- shared read-scope helper
- client fetch propagation for authenticated read surfaces

## What Changed

### Shared runtime helper
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-entry.ts`
- Added:
  - `assertCustomerReadAccess(...)`
  - `assertExecutionReadAccess(...)`
- Read access now resolves the actor from `requester_id` and/or `operator_id`, then enforces:
  - same-customer requester access
  - operator customer scope access
  - platform operator access for unscoped reports

### Execution-scoped read routes
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/[id]/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/execution/snapshot/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/lineage/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/outcome-delta/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/causality/route.ts`

These routes now deny cross-customer reads before loading execution artifacts.

### Reporting routes
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/audit/metrics/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/marketing/cycle-report/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/evolution/hypothesis-report/route.ts`

These routes now require explicit read scope via `requester_id` / `operator_id` and, where applicable, `customer_id`.

### Client fetch propagation
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/audit/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/operations/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/outcome/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/marketing/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/insight-review/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/insight-candidate/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/insight-writeback/page.tsx`

These pages now pass authenticated read context into the protected APIs.

## Enforcement Outcomes
- same-customer requester read is allowed
- operator read is allowed only inside allowed customer scope
- platform-scope reports require a platform operator when no customer scope is provided
- cross-customer read attempts return `403`
- missing read identity returns `400`
- unknown requester identity returns `404`

## Validation
- focused tests passed
- `npm run build` passed
- live allow/deny acceptance passed against local dev server and Supabase runtime

## Freeze Judgment
Freeze now.

This block closes the highest-risk customer-policy gap still present on read/reporting runtime paths.
