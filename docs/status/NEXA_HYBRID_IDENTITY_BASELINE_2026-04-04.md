# Nexa Hybrid Identity Baseline

Date: 2026-04-04
Status: accepted
Owner: Codex

## Decision

Replace the old email whitelist login baseline with a filesystem-managed hybrid identity baseline that supports:
- email login
- wallet login
- linked identity resolution to the same customer/operator record

## Why

This release does not need wallet payment execution.
It does need:
- wallet as identity binding
- email and wallet access convergence
- customer-aware runtime identity

That makes hybrid identity the correct next step, not payment workflow.

## Accepted Scope

### Filesystem identity assets
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/identity-assets/README.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/identity-assets/platform-admin.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/identity-assets/maxshot-ops.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/identity-assets/demo-reviewer.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/identity-assets/ops-auditor.md`

### Runtime
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth/identity-registry.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/login/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth.ts`

### Product surface
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`
- Login page now supports email and wallet tabs with one identity session model.

### Runtime propagation
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- Chat requests now forward:
  - `requester_id = identity_id`
  - `customer_id`
  - `entry_channel = web_app`

## Validation

### Focused tests
- `lib/auth/__tests__/identity-registry.test.ts`
- `lib/auth/__tests__/login-route.test.ts`
- Result: passed

### Build
- `npm run build`
- Result: passed

### Runtime meaning
- Email and wallet can now resolve to the same identity record.
- Wallet remains an identity/account-binding primitive only.
- Payment execution remains out of scope for this release.

## Freeze Judgment

Freeze now.

This is the correct lightweight identity posture for the current platform stage.
