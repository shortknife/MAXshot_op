# Nexa Prompt Policy Baseline (2026-04-03)

## Scope

This step adds the first runtime prompt policy layer on top of the prompt-runtime snapshot.

The goal is not to redesign prompts. The goal is to make prompt source usage and execution-prompt eligibility explicitly governable and verifiable.

## Implemented

### Prompt policy registry

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/app/configs/prompt-policy/prompt_policy_registry_v1.json`

The registry now defines:

- allowed intent prompt sources
- allowed execution prompt sources
- execution-prompt-required capabilities
- execution prompt slug allowlists by capability
- customer overrides such as `allow_local_stub_intent`

### Runtime policy evaluation

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/prompt-policy.ts`

Prompt policy now evaluates, per turn:

- whether the intent prompt source is allowed
- whether local stub intent is allowed for the customer
- whether an execution prompt is required for the resolved capability
- whether the execution prompt source is allowed
- whether the execution prompt slug matches the capability allowlist

### Verification integration

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/runtime-verification.ts`

If prompt policy returns `review`, runtime verification now escalates the turn to `review` with the prompt-policy reason.

### Runtime visibility

Updated:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/chat-ask-service.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/interaction-learning/extract.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/interaction-log/interaction-log-surface.tsx`

Each turn now exposes:

- `prompt_policy.outcome`
- `prompt_policy.reason`
- `prompt_policy.checks`

The interaction log now shows prompt runtime and prompt policy together.

## Validation

Focused validation:

- `lib/chat/__tests__/prompt-policy.test.ts`
- `lib/chat/__tests__/prompt-runtime.test.ts`
- `lib/chat/__tests__/runtime-verification.test.ts`
- `lib/chat/__tests__/qna-capability-overview.test.ts`

Build:

- `npm run build`

Runtime check:

- live interaction-log write with local env wrapper
- `maxshot -> prompt_policy.outcome = allow`
- `ops-observer -> prompt_policy.outcome = review`
- `ops-observer -> reason = intent_prompt_source_not_allowed`
- `verification_outcome` tracks the same policy escalation

## Acceptance judgment

Accepted as `baseline`.

This is enough for the current stage because prompt usage is now not only visible but also policy-checked and verification-aware.

## Out of scope

Not included in this step:

- prompt editing governance workflows
- prompt approval queue
- customer-specific prompt content overrides
- prompt replay table
- prompt policy mutation UI
