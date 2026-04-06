# Nexa Customer Runtime Policy Block Acceptance

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Block Goal

Turn customer-aware behavior from a set of aligned surfaces into a unified runtime policy layer with shared evidence and deterministic consumption points.

## Included Work

1. unified customer runtime policy loader
2. chat runtime policy propagation
3. auth route policy propagation
4. customer workspace runtime policy summary
5. session-kernel policy evidence
6. interaction-log policy evidence

## Result

Customer runtime policy now controls and evidences:
- primary plane and default entry
- preferred capabilities and route order
- delivery posture
- review escalation posture
- clarification posture
- auth posture
- session-kernel policy state
- interaction-log policy state

## Validation

### Concentrated test suite
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts`
- Result: `44/44 passed`

### Build
- `npm run build`
- Result: passed

### Live acceptance highlights
- Auth challenge + verify (`maxshot`)
  - returned policy metadata from the same runtime policy source in both challenge and verify
  - verified session remained customer-bound
- Chat runtime (`nexa-demo`)
  - returned `customer_runtime_policy` in response meta
  - session kernel recorded `customer_policy_loaded = true`
  - runtime policy version and primary plane matched customer asset posture

## Freeze Decision

Result: `freeze now`

Rationale:
- the contract surface is single-source (`runtime-policy.ts`)
- focused tests cover the hot path
- build passes
- live auth and chat acceptance both passed
- remaining work is deeper policy evolution, not blockers for this block

## Consequence

Nexa customer-aware behavior is now a runtime policy problem instead of a surface-by-surface configuration problem. Future customer-aware work can evolve from one policy layer instead of duplicating posture logic across chat, auth, and workspace flows.

## Next Block

Customer Runtime Policy Evolution Block
- unify remaining customer-aware decision points behind the same policy contract
- refine policy-driven defaults for delivery and review actions
- continue reducing residual per-surface customer branches where they still exist
