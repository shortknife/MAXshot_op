# Nexa Customer Mutation Surface Baseline

- Date: 2026-04-07
- Status: accepted baseline
- Scope: align FAQ review and KB management mutation surfaces with the shared `customer_policy_evidence` contract while keeping operator-only mutation controls clearly separated from customer-facing policy context.

## What changed

1. FAQ review surface now consumes customer policy evidence
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/faq-review/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/faq-review/review-surface.tsx`
- Review rows are decorated with `customer_policy_evidence` before rendering, and each review item now shows a shared customer mutation context card next to the operator hint.

2. KB management surface now consumes customer policy evidence
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/kb-management/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/kb-management/kb-management-surface.tsx`
- Inventory rows are decorated with `customer_policy_evidence` before rendering, and each source card now shows the shared customer mutation context next to source metadata.

3. Operator/debug controls are now explicitly separated
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/faq-review/review-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/kb-management/kb-management-surface.tsx`
- Both mutation surfaces now state that operator ID, confirm token, and approval controls are bounded operator actions, not customer-facing defaults or authorization evidence.

## Why this block mattered

Primary and secondary customer-aware surfaces were already moved onto composed policy defaults and evidence, but the two mutation-heavy operator surfaces still relied on local rendering rules and mixed together customer context with operator controls. This block closes that gap so mutation screens follow the same customer policy evidence contract without blurring runtime policy context and mutation authorization.

## Validation

- Focused suite: `27/27 passed`
- Production build: `passed`
- Live acceptance:
  - `faq_review_queue_op` recent runtime row shows `customer_id = maxshot`, `queue_status = prepared`
  - `faq_kb_source_inventory_op` recent runtime row shows `customer_id = maxshot`, `source_status = draft`
  - Local mutation surfaces compile and run with the same shared customer policy evidence contract used by primary/secondary customer-aware surfaces
