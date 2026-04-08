# Nexa Customer Policy Runtime Coverage Audit Block Acceptance

Date: 2026-04-08
Status: accepted and frozen

## Block
Customer Policy Runtime Coverage Audit Block

## Included
- audit of remaining runtime entry coverage
- requester/customer enforcement on task sealing entry
- execution-scope enforcement on evolution hypothesis entry
- focused tests, build, and live acceptance
- classification of remaining read/reporting gaps

## Concentrated Validation
### Focused tests
Command:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os && npx vitest run   lib/customers/__tests__/runtime-entry.test.ts   lib/router/__tests__/task-sealer-route.test.ts   lib/evolution/__tests__/hypothesis-route.test.ts   lib/chat/__tests__/chat-ask-route-entry.test.ts   lib/router/__tests__/execution-run-route.test.ts   lib/router/__tests__/execution-replay-route.test.ts   lib/router/__tests__/execution-confirm-route.test.ts   lib/memory/__tests__/writeback-route.test.ts   lib/marketing/__tests__/feedback-route.test.ts   lib/auth/__tests__/identity-registry.test.ts
```
Result: `23/23 passed`

### Build
Command:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os && npm run build
```
Result: `passed`

## Live Acceptance
Real dev server validation on `http://127.0.0.1:3012` produced:

```json
{
  "hypothesisDeny": {
    "status": 403,
    "error": "operator_customer_scope_not_allowed"
  },
  "hypothesisAllow": {
    "status": 200,
    "success": true,
    "event_type": "hypothesis_generated"
  },
  "createMismatch": {
    "status": 403,
    "error": "requester_customer_mismatch"
  },
  "createAllow": {
    "status": 200,
    "success": true,
    "status_value": "pending_confirmation"
  }
}
```

Notes:
- the successful `task/create` acceptance used the `pending_confirmation` path, which is compatible with the current execution status constraint in the live schema
- the mismatch deny path and hypothesis deny path confirm that customer policy is now enforced at both task-sealing entry and execution-derived enrichment entry

## Acceptance Decision
Freeze this block now.

## Consequence
The next weak area is not another write-entry slice. It is customer policy enforcement on read/reporting execution APIs.
