# Nexa Prompt Release / Rollback Baseline (2026-04-03)

## Scope

This step adds a bounded release and rollback path on top of the prompt governance surface.

The goal is to move prompt activation changes out of ad hoc database edits and into a governed runtime path with:

- platform-operator gating
- confirmation token requirement
- prompt-library write-lane serialization
- version history visibility
- release event logging

## Implemented

### Prompt mutation capability baseline

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/capability-registry/capability_registry_v1.json`

Added `capability.prompt_governance_mutation` as an internal mutation family with:

- `execution_mode = mutation`
- `mutation_scope = prompt_library`
- `concurrency_safe = false`
- `requires_confirmation = true`

### Prompt release runtime

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/prompts/release.ts`

Added:

- version history loader
- release-event loader
- bounded `releasePromptVersion()` runtime

The release runtime enforces:

- platform operator scope
- capability mutation policy
- write-lane acquisition
- active-version handoff
- release event insert

### Prompt action API

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/api/prompt/action/route.ts`

Added bounded actions:

- `release`
- `rollback`

Each action requires:

- `operator_id`
- `confirm_token`
- `approved = true`

### Prompt surface upgrade

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/prompts/prompt-governance-surface.tsx`

The `/prompts` surface now shows:

- version history per prompt
- release vs rollback target hints
- operator and confirmation controls
- release ledger

### Release events table

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/docs/status/PROMPT_RELEASE_EVENTS_DDL.sql`

Adds:

- `prompt_release_events_op`

## Validation

Focused validation:

- `lib/prompts/__tests__/governance.test.ts`
- `lib/prompts/__tests__/release.test.ts`
- `lib/prompts/__tests__/prompt-action-route.test.ts`
- `lib/chat/__tests__/prompt-policy.test.ts`
- `lib/chat/__tests__/prompt-runtime.test.ts`

Build:

- `npm run build`

## Acceptance judgment

Accepted as `baseline`, with one explicit constraint:

- runtime mutation acceptance against the live prompt library is deferred until operator-approved execution time

Reason:

- prompt release changes active production prompts
- this should not be flipped in live runtime acceptance without deliberate approval

## Out of scope

Not included in this step:

- prompt draft workflow
- prompt approval workflow
- prompt diff review
- prompt rollback safety simulation
- customer-specific prompt edit rights
