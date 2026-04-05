# Nexa Customer Auth Verification Baseline

## Decision
Add a lightweight but real verification flow on top of hybrid identity.

## Scope
- Email verification via short-lived code challenge
- Wallet verification via nonce + signed message
- Server-side verification before session issuance
- Auth audit persistence for challenge issuance and verification outcome
- Login UI upgraded from direct resolve to two-step verification

## Runtime shape
- `POST /api/auth/challenge`
- `POST /api/auth/verify`
- `POST /api/auth/login` now returns `410 auth_challenge_required`

## Storage
Operational auth state remains in Supabase tables:
- `auth_verification_challenges_op`
- `auth_identity_events_op`

Identity source of truth remains filesystem-managed markdown under:
- `admin-os/identity-assets/`

## Verification modes
### Email
- Resolve filesystem identity by email
- Issue 6-digit code challenge
- Store challenge hash and expiry
- Current delivery mode: `manual_preview`
- Verify code before session issuance

### Wallet
- Resolve filesystem identity by wallet address
- Issue nonce-bound message
- Require wallet signature
- Recover signer server-side with `ethers.verifyMessage`
- Verify recovered address matches identity record before session issuance

## Boundaries
- No payment execution
- No full SaaS IAM
- No Supabase Auth dependency
- Wallet remains identity/account binding only

## Evidence
- Focused auth tests pass
- Next build passes
- Live acceptance requires SQL in `admin-os/docs/status/AUTH_VERIFICATION_RUNTIME_DDL.sql`

## Consequence
Nexa now has a verified entry process for customer-aware runtime identity instead of a direct resolve-only login path.
