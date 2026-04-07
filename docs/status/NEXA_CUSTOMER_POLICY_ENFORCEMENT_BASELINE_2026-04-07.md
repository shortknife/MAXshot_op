# Nexa Customer Policy Enforcement Baseline

- Date: 2026-04-07
- Status: accepted baseline
- Scope: turn customer policy from display-only/default-only metadata into deterministic enforcement on session storage, surface access, login redirects, and wallet-auth posture.

## What changed

1. Session storage now keeps customer policy metadata
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/auth.ts`
- `IdentitySession` now persists:
  - `auth_posture`
  - `auth_default_experience`
  - `customer_runtime_policy`
  - `customer_policy_evidence`
- Added helpers:
  - `getSessionDefaultEntryPath(...)`
  - `isSurfaceAllowed(...)`
- Email and wallet verification now store the enriched session instead of dropping policy metadata after verification.

2. Auth guard now enforces customer-focused surfaces
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/auth-guard.tsx`
- `AuthGuard` now accepts `requiredSurface`.
- If the stored session lacks access to that surface, the guard redirects to the customer default entry path instead of allowing the page to render.

3. Sensitive customer surfaces now use deterministic surface guards
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/chat/page.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/faq-review/review-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/kb-management/kb-management-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/interaction-log/interaction-log-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/runtime-cost/runtime-cost-surface.tsx`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/components/prompts/prompt-governance-surface.tsx`
- These surfaces no longer rely on customer posture as a hint only; they now require the matching customer-focused surface permission.

4. Login redirect now follows customer policy default entry
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/login/page.tsx`
- Successful email and wallet verification now route through `getSessionDefaultEntryPath(...)` instead of hardcoded `/chat`.
- Current customers still default to `/chat`, but the redirect path now follows policy rather than page-local convention.

5. Wallet-disabled customers now reject wallet auth deterministically
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/challenge/route.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/app/api/auth/verify/route.ts`
- If `runtimePolicy.auth.wallet_posture === 'disabled'`, wallet challenge and wallet verify now return `403 wallet_auth_disabled`.

## Why this block mattered

The previous blocks made customer policy visible and auditable, but not all hot paths enforced it. The biggest remaining gap was that client session storage dropped policy data after login, and sensitive surfaces still trusted authentication alone. This block closes that gap by making customer policy part of the stored session contract and turning surface access plus wallet posture into deterministic runtime checks.

## Validation

- Focused suite: `20/20 passed`
- Production build: `passed`
- Live acceptance:
  - email challenge + verify for `maxshot` returned `200 / 200`
  - stored session carried `customer_policy_evidence.policy_version = 1.5`
  - visiting `/prompts` as `maxshot-ops` redirected to `/chat`
  - visiting `/kb-management` as `maxshot-ops` remained allowed and rendered normally
