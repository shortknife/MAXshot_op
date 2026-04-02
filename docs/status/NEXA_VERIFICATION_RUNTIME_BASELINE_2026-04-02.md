# Nexa Verification Runtime Baseline (2026-04-02)

## Scope
- Introduce a first-class `Verify` stage into the chat runtime without redesigning the entire execution engine.
- Keep verification bounded and deterministic.
- Reuse existing signals where possible instead of adding another model call.

## What Changed
1. Added a dedicated runtime verification layer in `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/runtime-verification.ts`.
2. `runChatAsk()` now runs `verify_and_finalize` after intent normalization and before final delivery output is returned.
3. Responses now carry:
   - top-level `verification_decision`
   - `data.meta.verification`
4. Verification currently covers two main planes:
   - business query outputs
   - QnA / FAQ outputs

## Verification Rules
### Business / Ops
- uses existing `critic_decision` when present
- flags answered responses with zero rows for review
- preserves clarification paths as `clarify`

### QnA / FAQ
- routes fallback/review-required answers into `review`
- flags low-confidence FAQ answers for review
- flags FAQ answers without citations for review

## Runtime Outcome Model
- `pass`
- `review`
- `clarify`
- `block`

This is intentionally narrower than a full verification agent or adversarial pass.

## Acceptance Evidence
- Focused tests passed:
  - `lib/chat/__tests__/runtime-verification.test.ts`
  - `lib/chat/__tests__/delivery-critic.test.ts`
  - `lib/chat/__tests__/qna-capability-overview.test.ts`
  - `lib/chat/__tests__/business-runtime-baseline.test.ts`
  - `lib/chat/__tests__/non-business-out-of-scope.test.ts`
- Production build passed:
  - `npm run build`

## Boundary
Out of scope for this baseline:
- multi-agent verification
- autonomous retry / repair loops
- verification-aware prompt orchestration
- customer-specific verification policies
- cost-aware verification sampling

## Next Implication
The runtime now has a real `Verify` stage between execute and deliver.

The next reasonable extensions are:
1. verification-aware customer policy
2. cost/accounting instrumentation
3. stronger verification telemetry in observability surfaces
