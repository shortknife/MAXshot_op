# Nexa Customer Policy Read-Scope Block Acceptance

Date: 2026-04-08
Status: accepted

## Block Goal
Move customer policy from write/runtime entry enforcement into the remaining execution/reporting read paths.

## Included
- shared read-scope enforcement helper
- execution read route enforcement
- reporting route enforcement
- authenticated client propagation for protected reads
- concentrated tests, build, and live acceptance

## Focused Test Result
- `21/21 passed`

## Build Result
- `npm run build` passed

## Live Acceptance
A temporary `maxshot` execution was created, used for read-scope checks, then cleaned up.

### Allowed
- `GET /api/execution/[id]` as `maxshot-ops` -> `200`
- `POST /api/execution/snapshot` as `maxshot-ops` -> `200`
- `GET /api/audit/metrics` scoped to `maxshot` as `maxshot-ops` -> `200`
- `GET /api/marketing/cycle-report` scoped to `maxshot` as `maxshot-ops` -> `200`

### Denied
- `GET /api/execution/[id]` as `ops-auditor` against `maxshot` execution -> `403 operator_customer_scope_not_allowed`
- `GET /api/audit/metrics` scoped to `maxshot` as `ops-auditor` -> `403 operator_customer_scope_not_allowed`
- `GET /api/marketing/cycle-report` scoped to `maxshot` as `ops-auditor` -> `403 operator_customer_scope_not_allowed`

## Cleanup
- temporary `tasks_op` row deleted
- temporary `task_executions_op` row deleted
- dev server stopped after acceptance

## Closure Judgment
Freeze now.

The read/reporting side now follows the same customer-policy model already used on mutation and runtime-entry paths.
