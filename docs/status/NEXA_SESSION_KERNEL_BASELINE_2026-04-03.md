# Nexa Session Kernel Baseline (2026-04-03)

## Scope

This step formalizes a first runtime `session kernel` snapshot so each chat turn carries a stable, auditable summary of:

- thread resolution
- follow-up relation
- active conversation context
- working-mind policy
- recall signals
- verification outcome
- final source plane

The goal is not a full Claude-Code-style kernel. The goal is to stop scattering these runtime facts across multiple meta fragments.

## Implemented

### Runtime snapshot attachment

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/session-kernel.ts`

Introduced:

- `SessionKernelSnapshot`
- `buildPreparedSessionKernel()`
- `finalizeSessionKernel()`
- `attachSessionKernel()`

The snapshot now captures:

- `kernel_id`
- `session_id`
- `customer_id`
- `requester_id`
- `entry_channel`
- `thread_action`
- `resolution_reason`
- `turn_relation_type`
- `turn_relation_reason`
- `previous_turns`
- `follow_up_context_applied`
- active scope/query context
- pending clarification state
- capability routing summary
- memory policy / ref counts
- recall trigger / confidence
- verification outcome
- answer type
- source plane

### Chat runtime integration

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/chat-ask-service.ts`

`runChatAsk()` now:

1. builds a prepared kernel immediately after request preparation
2. finalizes the kernel after runtime verification and delivery finalization
3. attaches the finalized kernel into `data.meta.session_kernel`
4. exposes the same kernel through `runtimeMeta`

### Working-mind metadata expansion

Updated:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/memory-refs.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/chat/context-manager/types.ts`

`memory_runtime` now carries:

- `learning_ref_count`
- `summary`

This gives the kernel a stable view of how much of the working mind is derived from interaction-learning memories.

### Interaction learning surface

Updated:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/interaction-learning/extract.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/components/interaction-log/interaction-log-surface.tsx`

Interaction logs now preserve a condensed kernel summary and display it in the UI, including:

- thread action
- relation type
- previous turns
- memory policy
- ref counts
- recall trigger
- verification outcome

## Validation

Focused validation:

- `lib/chat/__tests__/session-kernel.test.ts`
- `lib/chat/__tests__/qna-capability-overview.test.ts`
- `lib/chat/__tests__/business-runtime-baseline.test.ts`
- `lib/chat/__tests__/runtime-verification.test.ts`

Build:

- `npm run build`

Runtime check:

- local env wrapper + live interaction-log write
- `runtimeSource = supabase`
- `session_kernel.kernel_id` captured
- `thread_action = continue`
- `turn_relation_type = new_session`
- `verification_outcome = pass`
- `source_plane = product_docs`

## Acceptance judgment

Accepted as `baseline`.

This step is sufficient because it gives Nexa a formal per-turn runtime snapshot without introducing a heavier session orchestration runtime.

## Out of scope

Not included in this step:

- persistent session-kernel table
- background task lifecycle
- auto compaction / transcript compression
- async sub-agent runtime
- prompt-runtime orchestration redesign

## Next implication

With this baseline in place, future runtime work can target:

- kernel persistence or replay
- task runtime state machine
- stronger verification scheduling
- prompt-runtime assembly tied to kernel state
