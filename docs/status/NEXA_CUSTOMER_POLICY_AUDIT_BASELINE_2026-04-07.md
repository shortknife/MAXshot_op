# Nexa Customer Policy Audit Baseline

- Date: 2026-04-07
- Status: accepted baseline
- Scope: persist event-time customer policy evidence across auth, chat-derived operational logs, and mutation runtime tables so audit evidence no longer depends on rehydrating the current customer policy at read time.

## What changed

1. Added embedded customer policy audit extraction and fallback rules
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`
- New helpers:
  - `normalizeCustomerPolicyEvidence(...)`
  - `extractCustomerPolicyEvidenceCarrier(...)`
- `decorateWithCustomerPolicyEvidence(...)` now prefers persisted event-time audit snapshots before falling back to live customer policy lookup.

2. Chat-derived operational logs now persist policy audit snapshots
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/extract.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/runtime-cost/extract.ts`
- `interaction_learning_log_op.meta.customer_policy_audit` and `runtime_cost_events_op.meta.customer_policy_audit` now store the composed customer policy evidence observed at execution time.

3. Auth runtime now persists policy audit snapshots
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/challenge/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/verify/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/runtime.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/events.ts`
- Auth challenges and auth events now store `customer_policy_audit` in `meta`, and recent auth event loading exposes that snapshot to the UI.

4. Mutation runtime tables now persist customer policy audit snapshots
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/review-queue.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/source-inventory.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/docs/status/FAQ_REVIEW_QUEUE_RUNTIME_DDL.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/docs/status/FAQ_KB_SOURCE_INVENTORY_RUNTIME_DDL.sql`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/supabase/migrations/20260407112000_customer_policy_audit.sql`
- `faq_review_queue_op.customer_policy_audit` and `faq_kb_source_inventory_op.customer_policy_audit` now keep event-time customer policy evidence for operator mutation surfaces.

5. Identity strip shows latest auth policy snapshot version
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/auth/identity-context-strip.tsx`
- This is a small audit-facing surface change, not a new UX block.

## Why this block mattered

The previous customer-aware work unified how surfaces render policy evidence, but the underlying operational evidence still drifted because most screens reconstructed customer policy from `customer_id` at read time. That is not defensible audit behavior. This block stores the observed policy evidence at event time across auth, chat-derived logs, and mutation runtime rows, then makes the runtime decorator consume persisted audit snapshots first.

## Validation

- Focused suite: `27/27 passed`
- Production build: `passed`
- Migration applied through Supabase CLI:
  - `20260407112000_customer_policy_audit.sql`
- Live acceptance:
  - `auth_identity_events_op.meta.customer_policy_audit.policy_version = 1.5` for `maxshot-ops`
  - `interaction_learning_log_op.meta.customer_policy_audit.customer_id = nexa-demo`
  - `runtime_cost_events_op.meta.customer_policy_audit.customer_id = nexa-demo`
  - `faq_review_queue_op.customer_policy_audit.customer_id = maxshot`
  - `faq_kb_source_inventory_op.customer_policy_audit.customer_id = maxshot`
