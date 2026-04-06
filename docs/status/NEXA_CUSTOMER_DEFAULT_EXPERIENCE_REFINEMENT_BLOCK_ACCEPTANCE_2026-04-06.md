# Nexa Customer Default Experience Refinement Block Acceptance

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Block Goal

Make customer runtime policy the source for default experience copy on secondary surfaces, instead of allowing chat, customers, and login to render raw preset/posture fields independently.

## Included Work

1. reusable workspace default experience helper
2. reusable auth default experience helper
3. workspace API response expansion with `default_experience`
4. chat surface migration to default experience
5. customers surface migration to default experience
6. login surface migration to auth default experience

## Result

Customer runtime policy now directly shapes default experience across:
- `/api/customers/workspace`
- `/chat`
- `/customers`
- `/login`

The remaining raw policy/meta display is limited to explicit evidence badges rather than user-facing default copy.

## Validation

### Concentrated test suite
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/faq-kb/__tests__/review-queue.test.ts`
- Result: `52/52 passed`

### Build
- `npm run build`
- Result: passed

### Live acceptance highlights
- workspace route returned composed `default_experience` for `nexa-demo`
- chat runtime can consume composed quick queries and composer hint from workspace API
- login challenge and verify returned composed auth default experience for `maxshot`
- customers workspace now renders experience/auth summaries through the same runtime policy composition layer

## Freeze Decision

Result: `freeze now`

Rationale:
- secondary surface defaults are no longer directly shaped from raw posture/preset reads
- runtime policy remains the single source for customer default experience
- concentrated tests passed
- build passed
- live checks covered both workspace and auth default-experience paths

## Consequence

The customer policy stack now cleanly separates:
1. filesystem assets
2. aggregated runtime policy
3. composed default experiences for surfaces
4. explicit runtime evidence meta

That is a sufficient block boundary before deeper default refinement or broader surface rollout.

## Next Block

Customer Secondary Surface Rollout Block
- extend composed customer defaults into additional secondary surfaces where still useful
- keep raw policy/meta fields only for evidence and debugging
- avoid reintroducing direct customer asset reads in UI code
