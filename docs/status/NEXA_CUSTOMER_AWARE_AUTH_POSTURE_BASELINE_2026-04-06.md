# Nexa Customer-Aware Auth Posture Baseline

- Date: 2026-04-06
- Status: accepted
- Freeze: yes

## Decision

Add filesystem-managed customer auth posture assets so login entry, verification framing, and recovery guidance can vary deterministically per customer.

## Why

Hybrid identity and verification were already implemented, but the login surface still treated every customer the same. Nexa needed customer-specific auth posture so entry and verification feel consistent with each customer workspace.

## Scope

- Add `auth.md` assets under each customer workspace.
- Parse auth posture from filesystem assets.
- Return auth posture from challenge and verify routes.
- Surface auth posture on `/login` and `/customers`.

## Implementation

### Filesystem assets
- `admin-os/customer-assets/maxshot/auth.md`
- `admin-os/customer-assets/nexa-demo/auth.md`
- `admin-os/customer-assets/ops-observer/auth.md`

### Runtime
- `admin-os/lib/customers/auth.ts`
- `admin-os/app/api/auth/challenge/route.ts`
- `admin-os/app/api/auth/verify/route.ts`
- `admin-os/lib/auth.ts`

### Product surface
- `admin-os/app/login/page.tsx`
- `admin-os/app/customers/page.tsx`

### Tests
- `admin-os/lib/customers/__tests__/auth.test.ts`
- `admin-os/lib/auth/__tests__/challenge-route.test.ts`
- `admin-os/lib/auth/__tests__/verify-route.test.ts`
- `admin-os/lib/auth/__tests__/runtime.test.ts`

## Acceptance

### Deterministic tests
- `npx vitest run lib/customers/__tests__/auth.test.ts lib/auth/__tests__/challenge-route.test.ts lib/auth/__tests__/verify-route.test.ts lib/auth/__tests__/runtime.test.ts`
- Result: `10/10 passed`

### Build
- `npm run build`
- Result: passed

### Runtime check
- Environment: local env exec with real runtime dependencies
- Invocation: direct `POST /api/auth/challenge` then `POST /api/auth/verify` for `ops@maxshot.ai`
- Result:
  - `challengeStatus = 200`
  - `verifyStatus = 200`
  - `challengeCustomer = maxshot`
  - `challengePrimary = email`
  - `verifyCustomer = maxshot`
  - `verifyPosture = operator`
  - `sessionIdentity = maxshot-ops`
  - `verificationMethod = email_code`

## Consequence

Nexa login now follows customer-specific auth posture instead of a single generic verification surface. Auth is consistent with customer workspace intent while remaining filesystem-managed and runtime-auditable.
