# Nexa Operator Boundary Baseline

Date: 2026-04-02
Status: accepted

## Scope

This baseline formalizes the first operator-to-customer boundary layer.

It does not introduce authentication or IAM. It introduces a runtime operator registry and enforces customer scope for bounded FAQ review actions and KB mutation actions.

## Implemented Runtime Behavior

### Operator Registry
- operator registry now exists as a runtime config source
- each operator declares `role`
- each operator declares `allowed_customers`
- `*` means platform-wide access

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/customers/operator_registry_v1.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/access.ts`

### Runtime Enforcement
- KB source registration rejects operators outside the target customer scope
- KB source transitions reject operators outside the persisted source customer scope
- FAQ review transitions reject operators outside the persisted review customer scope

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/kb-source/action/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/source-inventory.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/faq-review/action/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/review-queue.ts`

### Product Surface
- `/customers` now exposes operator boundary in addition to customer capability policy
- platform operators, customer-scoped operators, and read-oriented operators are visible in one place

Key file:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`

## Current Operator Profiles

### `platform-admin`
- role: `platform_admin`
- allowed customers: all

### `maxshot-ops`
- role: `solution_operator`
- allowed customers: `maxshot`

### `demo-reviewer`
- role: `demo_reviewer`
- allowed customers: `nexa-demo`

### `ops-auditor`
- role: `auditor`
- allowed customers: `ops-observer`

## Validation

Focused validation passed:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/__tests__/runtime.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/__tests__/kb-source-action-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/__tests__/source-inventory.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/__tests__/faq-review-action-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/__tests__/review-queue.test.ts`

Result:
- `27 / 27` focused tests passed
- `npm run build` passed

## What This Baseline Does Not Claim

This baseline does not yet provide:
- authenticated operator identity
- operator session management
- per-customer role hierarchy
- tenant IAM
- route-wide enforcement for all capability families

## Freeze Judgment

Judgment: freeze this baseline now.

Reason:
- customer policy now controls what a customer can do
- operator boundary now controls who may perform customer-bound writes
- the next platform step should move toward stronger memory, verification-aware runtime, or broader access formalization rather than deeper ad hoc FAQ / KB guards
