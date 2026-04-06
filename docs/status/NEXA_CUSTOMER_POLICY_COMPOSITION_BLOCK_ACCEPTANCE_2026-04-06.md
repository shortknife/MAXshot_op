# Nexa Customer Policy Composition Block Acceptance

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Block Goal

Finish the next step of customer runtime policy work by introducing reusable selectors and decorators, then refactor hot-path auth and review consumers to use that composition layer instead of repeating customer-specific posture shaping.

## Included Work

1. reusable customer policy selectors
2. shared auth response metadata composition
3. shared FAQ review payload decoration
4. removal of duplicate client-side runtime policy meta types
5. concentrated validation for auth, review queue, and chat policy continuity

## Result

Customer runtime policy composition now directly shapes:
- auth challenge responses
- auth verify responses
- FAQ review payload decoration
- review queue display metadata
- chat surface runtime policy evidence
- login surface runtime policy hints

## Validation

### Concentrated test suite
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/faq-kb/__tests__/review-queue.test.ts`
- Result: `51/51 passed`

### Build
- `npm run build`
- Result: passed

### Live acceptance highlights
- workspace route returned runtime policy metadata with wallet-auth primary method for `nexa-demo`
- auth challenge and verify both returned the same policy version for `maxshot`
- review queue entries used policy-derived queue labeling and escalation style after shared decoration
- chat and login surfaces consumed shared runtime policy metadata without local duplicate type contracts

## Freeze Decision

Result: `freeze now`

Rationale:
- shared policy selectors and decorators removed the remaining duplicated shaping logic from the block hot path
- auth and review consumers now rely on the same policy composition layer
- concentrated tests passed
- build passed
- live checks covered workspace, auth, and review queue continuity

## Consequence

The customer policy stack now has three clear layers:
1. filesystem customer assets
2. unified runtime policy aggregation
3. reusable policy composition helpers for surface delivery

That is sufficient to freeze this block and move future work toward deeper policy defaults instead of more normalization.

## Next Block

Customer Default Experience Refinement Block
- extend policy-composed defaults into more secondary surfaces
- reduce remaining direct preset-derived copy shaping where still present
- keep all new customer-aware behavior flowing through runtime policy first
