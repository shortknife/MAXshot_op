# Nexa Customer Policy Runtime Entry Block Acceptance

Date: 2026-04-08
Status: accepted and frozen

## Block
Customer Policy Runtime Entry Block

## Included
- runtime entry helper
- chat requester/customer consistency enforcement
- execution run/confirm/replay/retry/expire/evolve entry enforcement
- memory writeback / weight-apply entry enforcement
- marketing feedback entry enforcement
- focused tests, build, and live acceptance

## Concentrated Validation
### Focused tests
Command:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os && npx vitest run   lib/chat/__tests__/chat-ask-route-entry.test.ts   lib/router/__tests__/execution-run-route.test.ts   lib/router/__tests__/execution-replay-route.test.ts   lib/router/__tests__/execution-confirm-route.test.ts   lib/memory/__tests__/writeback-route.test.ts   lib/marketing/__tests__/feedback-route.test.ts   lib/customers/__tests__/runtime-entry.test.ts   lib/auth/__tests__/identity-registry.test.ts
```
Result: `15/15 passed`

### Build
Command:
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os && npm run build
```
Result: `passed`

## Live Acceptance
A temporary customer-bound execution row was seeded through Supabase using local env, then validated through the real dev server on `http://127.0.0.1:3011`.

Result summary:
```json
{
  "replayDeny": {
    "status": 403,
    "error": "operator_customer_scope_not_allowed"
  },
  "marketingDeny": {
    "status": 403,
    "error": "operator_customer_scope_not_allowed"
  },
  "marketingAllow": {
    "status": 200,
    "success": true,
    "events": [
      "marketing_feedback_recorded",
      "marketing_attribution_generated"
    ]
  },
  "chatMismatch": {
    "status": 403,
    "error": "requester_customer_mismatch"
  }
}
```

Audit evidence on the seeded execution row showed new events after the allowed mutation path, confirming that deny/allow entry behavior is now enforced at runtime entry rather than only at the page layer.

## Acceptance Decision
Freeze this block now.

## Consequence
Customer policy is now enforced at:
- page/surface level
- session/auth level
- runtime audit/evidence level
- server/API entry level

The next work should move to remaining weak runtime behavior or coverage gaps, not more local surface tuning.
