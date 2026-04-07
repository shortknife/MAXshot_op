# Nexa Customer Policy Enforcement Block Acceptance

- Date: 2026-04-07
- Block: Customer Policy Enforcement Block
- Result: accepted and frozen

## Block goal

Move customer policy from soft defaults and UI evidence into deterministic runtime enforcement on the remaining hot paths.

## Completed scope

1. Persisted customer policy metadata inside the stored identity session
2. Added `requiredSurface` enforcement to the shared auth guard
3. Applied surface enforcement to chat, FAQ review, KB management, interaction log, costs, and prompts
4. Switched login success redirects to customer-policy default entry resolution
5. Enforced `wallet_auth_disabled` for customers whose auth posture disables wallet login

## Concentrated validation

### Tests
- `20/20 passed`

### Build
- `npm run build` passed

### Live acceptance
- auth:
  - `challenge_status = 200`
  - `verify_status = 200`
  - `session_identity = maxshot-ops`
  - `policy_version = 1.5`
- surface enforcement:
  - `/prompts -> /chat` for `maxshot-ops`
  - `/kb-management` remained allowed for `maxshot-ops`
  - rendered heading: `KB Management`

## Freeze decision

Freeze this block now.

The next block should target a remaining weak platform behavior layer, not more surface-by-surface customer policy cleanup.
