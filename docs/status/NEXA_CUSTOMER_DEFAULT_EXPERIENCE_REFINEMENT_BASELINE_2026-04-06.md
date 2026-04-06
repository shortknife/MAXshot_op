# Nexa Customer Default Experience Refinement Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Refine customer-aware secondary surfaces by adding reusable default-experience helpers on top of runtime policy, then make workspace, chat, login, and customers surfaces consume those helpers instead of reshaping workspace/auth copy directly.

## Why

The customer policy composition block unified selectors and decorators for hot auth and review paths, but several secondary surfaces still rendered raw workspace or auth posture fields directly. That left preset-derived copy shaping scattered across client pages.

## Scope

- Add reusable default-experience helpers for workspace and auth surfaces.
- Extend `/api/customers/workspace` to return runtime-policy-derived default experience.
- Update chat and customers surfaces to use default experience instead of direct workspace preset fields.
- Update login flow to use auth default experience metadata from challenge/verify responses.

## Implementation

### Runtime policy helpers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/customers/runtime-policy.ts`

### Workspace API and client consumers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/customers/workspace/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/customers/page.tsx`

### Auth client/runtime consumers
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/challenge-route.test.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/__tests__/verify-route.test.ts`

## Acceptance

### Concentrated tests
- `npx vitest run lib/customers/__tests__/runtime-policy.test.ts lib/customers/__tests__/asset-runtime.test.ts lib/customers/__tests__/workspace.test.ts lib/customers/__tests__/delivery.test.ts lib/customers/__tests__/review.test.ts lib/customers/__tests__/clarification.test.ts lib/customers/__tests__/auth.test.ts lib/customers/__tests__/runtime.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts lib/chat/__tests__/customer-routing-priority.test.ts lib/chat/__tests__/delivery-critic.test.ts lib/chat/__tests__/session-kernel.test.ts lib/chat/__tests__/business-runtime-baseline.test.ts lib/chat/handlers/__tests__/qna-intent-handler.test.ts lib/router/__tests__/memory-selection.test.ts lib/interaction-learning/__tests__/extract.test.ts lib/faq-kb/__tests__/review-queue.test.ts`
- Result: `52/52 passed`

### Build
- `npm run build`
- Result: passed

### Live runtime checks
- Workspace API (`nexa-demo`)
  - `status = 200`
  - `policyVersion = 1.5`
  - `primaryPlane = faq_kb`
  - `quickQueries = 4`
  - `composerHint = Current customer default entry: /chat`
- Auth challenge + verify (`maxshot`)
  - `challengeStatus = 200`
  - `verifyStatus = 200`
  - `challengePolicyVersion = 1.5`
  - `challengePrimaryMethod = email`
  - `verifyPolicyVersion = 1.5`
  - `verifyCustomer = maxshot`

## Consequence

Customer-aware secondary surfaces now consume runtime-policy-composed defaults rather than raw preset/posture fields. That reduces copy-shaping drift between workspace, chat, and login experiences.
