# Nexa Customer-Aware Experience Block Acceptance

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Block Goal

Close the customer-aware experience block so customer identity and posture affect the whole experience path instead of isolated pages or runtime hints.

## Included Baselines

1. customer-aware workspace
2. customer-aware routing priority
3. customer-aware delivery posture
4. customer-aware review escalation
5. customer-aware memory recall priority
6. customer-aware clarification posture
7. customer-aware auth posture

## Result

Customer posture now influences:
- workspace framing
- routing preference
- delivery summary and next actions
- review escalation copy and operator hints
- memory recall priority
- clarification prompts and recovery actions
- login and verification posture

## Validation

### Concentrated test suite
- `npx vitest run lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/customers/__tests__/clarification.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts`
- Result: `43/43 passed`

### Build
- `npm run build`
- Result: passed

### Live acceptance highlights
- Clarification posture live check (`nexa-demo`)
  - guided clarification copy returned
  - customer-specific next actions returned
- Auth posture live check (`maxshot`)
  - challenge and verify both returned customer auth posture
  - verified session remained customer-bound

## Consequence

Nexa now behaves as a customer-aware platform across entry, interpretation recovery, execution posture, and review posture. Customer experience is no longer a UI hint layer sitting on top of generic runtime behavior.

## Next Block

Customer Runtime Policy Block
- unify preset / posture checks into one runtime policy layer
- remove remaining duplicated customer-specific branch logic
- concentrate evidence in session kernel and interaction log
