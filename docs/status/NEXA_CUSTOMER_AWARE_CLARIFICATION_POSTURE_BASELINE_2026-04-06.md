# Nexa Customer-Aware Clarification Posture Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add filesystem-managed customer clarification posture assets so clarification copy, option lists, and clarify-path delivery metadata can vary deterministically per customer.

## Why

Customer-aware workspace, routing, delivery, review escalation, and memory recall were already in place, but clarification responses still used one generic posture. Nexa needed customer-specific clarification framing so entry and recovery flows match each customer workspace.

## Scope

- Add `clarification.md` assets under each customer workspace.
- Parse customer clarification posture from filesystem assets.
- Apply clarification posture to business clarification responses and delivery packaging.
- Propagate clarification-posture evidence into chat and interaction-learning visibility.

## Implementation

### Filesystem assets
- `admin-os/customer-assets/maxshot/clarification.md`
- `admin-os/customer-assets/nexa-demo/clarification.md`
- `admin-os/customer-assets/ops-observer/clarification.md`

### Runtime
- `admin-os/lib/customers/clarification.ts`
- `admin-os/lib/chat/business-response.ts`
- `admin-os/lib/chat/handlers/business-intent-handler.ts`
- `admin-os/lib/chat/chat-request-gates.ts`
- `admin-os/lib/chat/delivery-critic.ts`
- `admin-os/lib/chat/chat-ask-service.ts`

### Product surface
- `admin-os/app/chat/page.tsx`

### Tests
- `admin-os/lib/customers/__tests__/clarification.test.ts`
- `admin-os/lib/chat/__tests__/delivery-critic.test.ts`
- `admin-os/lib/interaction-learning/__tests__/extract.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/customers/__tests__/clarification.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/router/__tests__/memory-selection.test.ts lib/chat/__tests__/session-kernel.test.ts`
- Result: `15/15 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Invocation: direct `handleBusinessIntent(...)` with `customer_id = nexa-demo` and an ambiguous yield query
- Result:
  - `handled = true`
  - `error = missing_required_clarification`
  - `summary = 补一个关键上下文，我就继续把这个流程解释完整。 你希望看哪个时间范围？`
  - `clarification_posture.customer_id = nexa-demo`
  - `clarification_posture.clarification_style = guided`
  - `next_actions = ['补一个更具体的上下文', '继续追问这个工作流', '切换到当前 customer workspace']`

## Consequence

Nexa now carries customer-specific clarification posture from filesystem assets into runtime behavior. Clarification is no longer a generic fallback path; it is part of the customer-aware product surface and delivery contract.
