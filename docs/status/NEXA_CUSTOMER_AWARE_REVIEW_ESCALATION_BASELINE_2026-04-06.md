# Nexa Customer-Aware Review Escalation Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add filesystem-managed customer review posture assets so FAQ / KB review escalation can vary by customer without introducing a new database-managed product source.

## Why

Customer-aware workspace, routing, and delivery posture were already in place, but review escalation still used the same queue framing and operator guidance for every customer. Nexa needed customer-specific escalation style, queue labeling, operator hints, and suggested next actions so the review path matches the active workspace posture.

## Scope

- Add `customer-assets/<customer>/review.md` as the single filesystem source for review escalation posture.
- Load review posture during FAQ fallback-to-review packaging.
- Apply review posture to prepared review payloads and runtime queue item loading.
- Surface review posture in `/faq-review`.

## Implementation

### Filesystem assets
- `admin-os/customer-assets/maxshot/review.md`
- `admin-os/customer-assets/nexa-demo/review.md`
- `admin-os/customer-assets/ops-observer/review.md`

### Runtime
- `admin-os/lib/customers/review.ts`
- `admin-os/lib/capabilities/faq-qa-review.ts`
- `admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `admin-os/lib/faq-kb/loaders.ts`
- `admin-os/lib/faq-kb/review-queue.ts`

### Product surface
- `admin-os/components/faq-review/review-surface.tsx`

### Tests
- `admin-os/lib/customers/__tests__/review.test.ts`
- `admin-os/lib/chat/handlers/__tests__/qna-intent-handler.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/customers/__tests__/review.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/faq-kb/__tests__/review-queue.test.ts lib/faq-kb/__tests__/faq-review-action-route.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/customers/__tests__/delivery.test.ts`
- Result: `26/26 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Invocation: direct `handleQnaIntent(...)` call with `customer_id = maxshot` and forced high `min_confidence`
- Query: `How do I submit wire transfer receipts through the enterprise reconciliation bridge?`
- Result:
  - `capability_id = faq_qa_review`
  - `review_required = true`
  - `review_payload.review_queue_label = Operator Review Queue`
  - `review_payload.escalation_style = operator`
  - `review_payload.operator_hint = Use an operator with \`maxshot\` scope and validate KB source state before approving review payloads.`
  - `review_payload.suggested_actions = ['打开 FAQ Review', '检查 KB Management', '缩小问题范围后重试']`
  - `review_payload.queue_source = supabase`

## Consequence

Nexa review escalation is now customer-aware at the review packaging and queue presentation layer. Review guidance can vary deterministically per customer through filesystem assets, without changing review queue schema or reintroducing database-managed product assets.
