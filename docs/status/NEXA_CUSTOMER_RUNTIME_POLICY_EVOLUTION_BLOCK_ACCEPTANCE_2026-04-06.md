# Nexa Customer Runtime Policy Evolution Block Acceptance

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Block Goal

Reduce residual per-surface customer posture branches after the runtime policy baseline by making policy the default consumption path across workspace API responses, review queue decoration, auth entry, and chat surfaces.

## Included Work

1. runtime-policy-first workspace API
2. runtime-policy-backed review queue decoration
3. runtime-policy-backed auth client surfacing
4. runtime-policy-backed chat workspace surfacing
5. reduced residual direct workspace/review consumption in handlers

## Result

Customer runtime policy now directly shapes and evidences:
- workspace API responses
- login runtime policy hints
- chat runtime workspace hints
- FAQ review queue customer labeling
- routing priority fallback resolution
- session-kernel policy evidence continuity

## Validation

### Concentrated test suite
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/faq-kb/__tests__/review-queue.test.ts`
- Result: `51/51 passed`

### Build
- `npm run build`
- Result: passed

### Live acceptance highlights
- workspace route returned full runtime policy metadata for `nexa-demo`
- auth challenge and verify both returned the same runtime policy version for `maxshot`
- review queue runtime used policy-derived review labels and escalation style
- chat runtime continued to emit session kernel policy evidence with policy loaded

## Freeze Decision

Result: `freeze now`

Rationale:
- policy contract remained single-source
- hot-path tests passed after consumer refactor
- build passed
- live checks covered workspace, auth, review queue, and chat surfaces
- remaining work is deeper policy composition, not instability in the current block

## Consequence

Nexa customer runtime policy now behaves as a cross-surface contract instead of a server-only assembly object. Future policy work can focus on composition and defaults rather than continuing to chase direct posture consumers.

## Next Block

Customer Policy Composition Block
- formalize reusable policy selectors and decorators
- reduce remaining duplicated per-surface posture meta shaping
- extend policy-driven defaults into more secondary surfaces without reintroducing direct asset reads
