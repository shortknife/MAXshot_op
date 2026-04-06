# Nexa Customer Runtime Policy Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add a unified customer runtime policy loader so workspace, delivery, review, clarification, and auth posture are resolved once per request and reused across routing, verification, delivery, and logging.

## Why

The customer-aware experience block already existed, but policy resolution was still scattered across separate loaders and local branches. That made evidence fragmented and increased the chance of customer posture drift between `/chat`, `/customers`, and auth routes.

## Scope

- Add a single `customer runtime policy` contract and loader.
- Resolve workspace, delivery, review, clarification, and auth posture through one entry point.
- Propagate policy evidence into session kernel and interaction learning.
- Refactor auth routes and customer workspace surface to consume unified policy metadata.

## Implementation

### Runtime policy
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`

### Chat runtime integration
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-ask-service.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/non-business-intent-dispatcher.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-kernel.ts`

### Auth integration
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/challenge/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/verify/route.ts`

### Customer workspace and learning evidence
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/extract.ts`

### Tests
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/__tests__/runtime-policy.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/challenge-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/verify-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/__tests__/qna-intent-handler.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/__tests__/session-kernel.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/interaction-learning/__tests__/extract.test.ts`

## Acceptance

### Concentrated tests
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts`
- Result: `44/44 passed`

### Build
- `npm run build`
- Result: passed

### Live runtime checks
- Auth check (`ops@maxshot.ai`)
  - `challengeStatus = 200`
  - `verifyStatus = 200`
  - `challengeCustomer = maxshot`
  - `challengePolicyVersion = 1.5`
  - `verifyCustomer = maxshot`
  - `verifyPolicyVersion = 1.5`
  - `sessionIdentity = maxshot-ops`
- Chat check (`nexa-demo`)
  - `status = 200`
  - `customer_runtime_policy.policy_version = 1.5`
  - `customer_runtime_policy.primary_plane = faq_kb`
  - `session_kernel.customer_policy_loaded = true`
  - `session_kernel.customer_policy_version = 1.5`

## Consequence

Nexa now resolves customer runtime posture once and carries one coherent policy object through chat execution, auth, workspace surfacing, session kernel, and interaction evidence. Customer behavior is no longer assembled from scattered per-surface loaders.
