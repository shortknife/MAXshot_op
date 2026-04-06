# Nexa Customer Runtime Policy Evolution Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Continue the customer runtime policy work by making policy the default consumption path for workspace API responses, review queue decoration, auth entry surfacing, and customer-facing chat surfaces.

## Why

The runtime policy baseline unified policy resolution on the server, but several hot paths still consumed direct posture loaders or direct workspace payloads. That left residual per-surface branching and weakened the goal of having one customer runtime policy contract.

## Scope

- Make `/api/customers/workspace` runtime-policy-first.
- Make chat and login surfaces consume runtime policy metadata directly.
- Make FAQ review queue decoration resolve through runtime policy instead of direct review posture loading.
- Reduce remaining direct workspace / review fallback branches in customer-aware handlers.

## Implementation

### Runtime policy consumers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/customers/workspace/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/review-queue.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/customer-routing-priority.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/non-business-intent-dispatcher.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-kernel.ts`

### Client surfaces
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth.ts`

## Acceptance

### Concentrated tests
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/faq-kb/__tests__/review-queue.test.ts`
- Result: `51/51 passed`

### Build
- `npm run build`
- Result: passed

### Live runtime checks
- Workspace API (`nexa-demo`)
  - `status = 200`
  - `policyVersion = 1.5`
  - `primaryPlane = faq_kb`
  - `fullPreferredCapabilities = 2`
- Review queue runtime
  - `source = supabase`
  - `reviewQueueLabel = Operator Review Queue`
  - `escalationStyle = operator`
- Auth challenge + verify (`maxshot`)
  - `challengeStatus = 200`
  - `verifyStatus = 200`
  - `challengePolicyVersion = 1.5`
  - `verifyPolicyVersion = 1.5`
  - `verifyPrimaryPlane = ops_data`
- Chat runtime (`nexa-demo`)
  - `status = 200`
  - `policyVersion = 1.5`
  - `primaryPlane = faq_kb`
  - `sessionPolicyLoaded = true`

## Consequence

Customer runtime policy is now the default contract for both server and client customer-aware surfaces. The system still allows bounded fallbacks where direct handler tests call lower-level functions, but the hot production path is no longer assembled from per-surface loaders.
