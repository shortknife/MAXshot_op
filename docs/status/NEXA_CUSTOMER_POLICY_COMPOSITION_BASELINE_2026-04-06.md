# Nexa Customer Policy Composition Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add a reusable composition layer for customer runtime policy so auth, review, routing, and client-facing surfaces consume the same selectors and decorators instead of reshaping customer posture metadata independently.

## Why

The runtime policy evolution block made policy the default hot-path contract, but several consumers still repeated policy-to-surface shaping logic locally. That duplication made future policy changes riskier and weakened the goal of a single deterministic customer policy layer.

## Scope

- Add reusable policy selectors for workspace, delivery, review, clarification, and auth posture.
- Add shared decorators for auth response metadata and FAQ review payload shaping.
- Refactor auth routes and FAQ/review runtime consumers to use shared policy helpers.
- Remove duplicate `CustomerRuntimePolicyMeta` type declarations from client-side consumers.

## Implementation

### Shared customer policy composition
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`

### Auth policy consumers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/challenge/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/verify/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`

### Review and chat policy consumers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/qna-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/faq-kb/review-queue.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`

### Test updates
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/challenge-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/verify-route.test.ts`

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
  - `authPrimaryMethod = wallet`
- Review queue runtime (`maxshot`)
  - `source = supabase`
  - `reviewQueueLabel = Operator Review Queue`
  - `escalationStyle = operator`
  - `operatorHint` resolved through runtime policy
- Auth challenge + verify (`maxshot`)
  - `challengeStatus = 200`
  - `verifyStatus = 200`
  - `challengePolicyVersion = 1.5`
  - `verifyPolicyVersion = 1.5`
  - `authPostureCustomer = maxshot`

## Consequence

Customer runtime policy is now composed through reusable selectors and decorators instead of ad hoc per-surface shaping. Future policy changes can update one composition layer and propagate consistently across auth, review, chat, and client-facing metadata.
