# Nexa Customer Capability Exposure Baseline

Date: 2026-04-02
Status: accepted

## Scope

This baseline adds the first runtime-enforced customer capability exposure layer.

It does not implement full IAM or tenant isolation. It defines which capabilities a customer can access, and which customers can execute bounded mutation workflows.

## Implemented Runtime Behavior

### Customer Capability Policy
- customer registry now carries `allowed_capabilities`
- customer registry now carries `mutation_capabilities`
- runtime helpers resolve and enforce both policy sets

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/configs/customers/customer_registry_v1.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime.ts`

### FAQ / KB Enforcement
- FAQ QnA now blocks `capability.faq_answering` when the selected customer is not allowed to use FAQ / KB
- KB source registration blocks mutation attempts when the customer is not mutation-enabled
- KB source transitions also block mutation for customer profiles that are read-only

Key files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/kb-source/action/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/source-inventory.ts`

### Customer Surface
- `/customers` now shows:
  - enabled planes
  - allowed capabilities
  - mutation-enabled capabilities
- this is the first platform UI surface that exposes customer policy, not only customer identity

Key file:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`

## Policy Profiles

### `maxshot`
- planes: `ops_data`, `faq_kb`
- allowed: ops/data, product docs, FAQ, FAQ review chain, KB upload QC
- mutation-enabled: `capability.kb_upload_qc`, `capability.faq_qa_review`

### `nexa-demo`
- planes: `faq_kb`
- allowed: FAQ read/review chain only
- mutation-enabled: none

### `ops-observer`
- planes: `ops_data`
- allowed: ops/data and product docs only
- mutation-enabled: none

## Validation

Focused validation passed:
- `lib/customers/__tests__/runtime.test.ts`
- `lib/chat/handlers/__tests__/qna-intent-handler.test.ts`
- `lib/faq-kb/__tests__/kb-source-action-route.test.ts`
- `lib/faq-kb/__tests__/source-inventory.test.ts`

Result:
- `15 / 15` tests passed
- `npm run build` passed

## What This Baseline Does Not Claim

This baseline does not yet provide:
- authenticated per-customer user access
- full router-wide enforcement for every capability family
- customer-level billing or provisioning
- per-customer prompt/policy variation
- tenant-isolated storage

## Freeze Judgment

Judgment: freeze this baseline now.

Reason:
- customer identity is no longer only metadata
- capability exposure is now an enforced runtime rule in FAQ / KB entry points
- the platform now distinguishes read-only customers from mutation-enabled customers
- the next step should move upward into customer access control and broader platform policy, not add more ad hoc guards
