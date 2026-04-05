# Nexa Customer-Aware Routing Priority Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add a customer-aware routing priority layer so customer workspace presets affect actual capability ordering and primary capability selection, not just UI hints.

## Why

The platform already had customer presets, customer capability exposure, and customer-aware workspace surfaces. However, routing still treated matched capabilities as neutral once intent analysis finished. That left customer posture visible in the UI but not reflected in execution preference.

## Scope

- Add a deterministic routing-priority helper for customer presets.
- Reorder matched capabilities by preferred capability and preferred plane.
- Feed resolved capability ordering into chat runtime, session kernel, prompt policy, and interaction-learning extraction.
- Extend QnA dispatch so FAQ-first customers prefer FAQ over product-doc QnA when both are viable.

## Implementation

### Runtime
- `admin-os/lib/chat/customer-routing-priority.ts`
- `admin-os/lib/chat/chat-ask-service.ts`
- `admin-os/lib/chat/handlers/non-business-intent-dispatcher.ts`
- `admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `admin-os/lib/chat/session-kernel.ts`
- `admin-os/lib/interaction-learning/extract.ts`

### Tests
- `admin-os/lib/chat/__tests__/customer-routing-priority.test.ts`
- `admin-os/lib/chat/handlers/__tests__/qna-intent-handler.test.ts`
- `admin-os/lib/chat/__tests__/session-kernel.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/chat/__tests__/session-kernel.test.ts`
- Result: `8/8 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Customer: `nexa-demo`
- Query: `How does the FAQ review chain work?`
- Result:
  - `status = 200`
  - `primaryCapabilityId = faq_answering`
  - `source_plane = faq_kb`
  - `workspace_primary_plane = faq_kb`
- Note: this live query resolved directly to FAQ, so `routing_priority_applied = false` in runtime evidence. The actual reordering behavior is covered by deterministic tests where multiple matched capabilities are present.

## Consequence

Nexa customer presets now affect execution posture at routing time. Customer workspaces no longer stop at display-only hints; they influence capability preference in a deterministic and auditable way.
