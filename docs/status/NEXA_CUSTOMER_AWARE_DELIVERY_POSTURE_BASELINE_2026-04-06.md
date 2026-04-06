# Nexa Customer-Aware Delivery Posture Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add filesystem-managed customer delivery posture assets so final delivery packaging can vary by customer without changing capability execution semantics.

## Why

Customer presets already influenced workspace presentation and routing posture, but final delivery still looked operationally identical across customers. Nexa needed a lightweight way to vary summary style, default next actions, and review-facing copy without introducing a separate dashboard or a second runtime source.

## Scope

- Add `customer-assets/<customer>/delivery.md` as the single filesystem source for delivery posture.
- Load delivery posture during chat runtime and apply it in `finalizeDelivery`.
- Expose delivery posture in chat meta and interaction-learning extraction.
- Surface delivery posture badges in `/chat`.

## Implementation

### Filesystem assets
- `admin-os/customer-assets/maxshot/delivery.md`
- `admin-os/customer-assets/nexa-demo/delivery.md`
- `admin-os/customer-assets/ops-observer/delivery.md`

### Runtime
- `admin-os/lib/customers/delivery.ts`
- `admin-os/lib/chat/delivery-critic.ts`
- `admin-os/lib/chat/chat-ask-service.ts`
- `admin-os/lib/interaction-learning/extract.ts`

### Product surface
- `admin-os/app/chat/page.tsx`

### Tests
- `admin-os/lib/customers/__tests__/delivery.test.ts`
- `admin-os/lib/chat/__tests__/delivery-critic.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/customers/__tests__/delivery.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/chat/__tests__/session-kernel.test.ts lib/interaction-learning/__tests__/extract.test.ts`
- Result: `18/18 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Customer: `nexa-demo`
- Query: `How do I reset my password?`
- Result:
  - `status = 200`
  - `primaryCapabilityId = faq_answering`
  - `deliveryPosture.customer_id = nexa-demo`
  - `deliveryPosture.summary_style = explainer`
  - `deliveryPosture.next_action_style = guided`
  - `nextActions = ['继续追问这个工作流', '打开 Customers workspace', '查看 Prompts']`

## Consequence

Nexa delivery is now customer-aware at the final packaging layer. Customer identity can affect delivery posture deterministically through filesystem assets, without changing capability logic or introducing a second prompt/runtime source.
