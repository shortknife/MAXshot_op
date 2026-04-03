# Nexa Prompt Runtime Baseline (2026-04-03)

## Scope

This step formalizes a minimal runtime prompt contract so prompt metadata is no longer consumed through scattered fields like `intent_prompt`, `qna_prompt`, and `content_prompt` only.

The goal is not to redesign prompt generation. The goal is to make prompt assembly auditable and readable through one stable runtime snapshot.

## Implemented

### Unified prompt runtime snapshot

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/prompt-runtime.ts`

Introduced `PromptRuntimeSnapshot` with:

- `assembly_mode`
- `prompt_count`
- `primary_prompt_slug`
- `prompt_sources`
- `intent_prompt`
- `execution_prompt`

Supported normalization sources:

- `intent_prompt.{slug,version,source,hash}`
- `qna_prompt.{prompt_slug,prompt_version,prompt_source,prompt_hash}`
- `content_prompt.{prompt_slug,prompt_version,prompt_source,prompt_hash}`

### Chat runtime integration

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/chat-ask-service.ts`

After verification and session-kernel finalization, chat runtime now attaches:

- `data.meta.prompt_runtime`
- `runtimeMeta.prompt_runtime`

This gives the platform a stable prompt-runtime contract without changing capability implementations.

### Interaction-learning extraction

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/interaction-learning/extract.ts`

Interaction logs now preserve a condensed prompt runtime summary:

- `assembly_mode`
- `primary_prompt_slug`
- `prompt_count`
- `prompt_sources`

### UI visibility

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/interaction-log/interaction-log-surface.tsx`

The interaction log surface now displays prompt-runtime state alongside session-kernel state.

## Validation

Focused validation:

- `lib/chat/__tests__/prompt-runtime.test.ts`
- `lib/chat/__tests__/qna-capability-overview.test.ts`
- `lib/chat/__tests__/session-kernel.test.ts`
- `lib/chat/__tests__/runtime-verification.test.ts`

Build:

- `npm run build`

Runtime check:

- local env wrapper + live interaction-log write
- `runtimeSource = supabase`
- `assembly_mode = intent_plus_execution`
- `primary_prompt_slug = product_doc_qna`
- `prompt_count = 2`
- `prompt_sources = [local_stub, supabase]`

## Acceptance judgment

Accepted as `baseline`.

This is enough for the current stage because the platform now has a formal runtime prompt contract that can feed observability, learning, and future prompt-policy work.

## Out of scope

Not included in this step:

- prompt policy engine
- prompt override governance
- customer-bound prompt exposure rules
- prompt persistence/replay table
- dynamic prompt composition beyond existing capability outputs
