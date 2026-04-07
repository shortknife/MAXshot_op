# Nexa Customer Policy Evidence Baseline

- Date: 2026-04-07
- Status: accepted baseline
- Scope: unify customer-aware evidence across auth, workspace, chat, and secondary operational surfaces so user-facing defaults and debug-only policy metadata no longer drift apart.

## What changed

1. Added a shared evidence contract
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`
- New helpers:
  - `buildCustomerPolicyEvidence(...)`
  - `decorateWithCustomerPolicyEvidence(...)`
- Purpose: expose one composed evidence object derived from runtime policy for UI-facing policy summaries.

2. Added a shared evidence UI component
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/customers/customer-policy-evidence-card.tsx`
- Purpose: keep policy evidence rendering consistent across primary and secondary surfaces.

3. Expanded response contracts
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/customers/workspace/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/challenge/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/verify/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-ask-service.ts`
- These flows now return `customer_policy_evidence` alongside raw `customer_runtime_policy`.

4. Rolled the evidence contract into surfaces
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/interaction-log/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/costs/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/interaction-log/interaction-log-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/runtime-cost/runtime-cost-surface.tsx`

## Why this block mattered

Customer-aware runtime policy had already become the single server-side contract, but surfaces still mixed together raw runtime policy, default experience, auth posture, and local display logic. This block introduces one composed evidence object for UI-facing policy summaries, while leaving raw runtime policy available only for evidence/debug and deeper introspection.

## Validation

- Focused suite: `27/27 passed`
- Production build: `passed`
- Live acceptance:
  - workspace API for `nexa-demo` returns `customer_policy_evidence.policy_version = 1.5`
  - auth challenge for `maxshot` returns `customer_policy_evidence.primary_plane = ops_data`
  - auth verify for `maxshot` returns `identity_id = maxshot-ops`, `verification_method = email_code`, and `customer_policy_evidence.policy_version = 1.5`
