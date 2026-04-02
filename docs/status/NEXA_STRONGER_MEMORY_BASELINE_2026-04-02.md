# Nexa Stronger Memory Baseline (2026-04-02)

## Scope
- Promote interaction learning logs from audit-only data into working-memory inputs.
- Keep the current memory system bounded: no user-profile memory, no autonomous memory mutation loop, no prompt-level memory injection redesign.

## What Changed
1. Interaction-derived learning memories are now generated from `interaction_learning_log_op` runtime rows.
2. Router memory selection merges persisted agent memories with derived interaction-learning refs.
3. `WorkingMind` now exposes:
   - `source_policy = hybrid_learning` when interaction-derived refs are present
   - `learning_ref_count`
   - a short summary string for downstream observability
4. Capability memory runtime metadata now preserves whether a request was served with router-only memory or hybrid learning memory.

## Runtime Behavior
- Recent successful interactions can now contribute `experience` memory refs.
- Cross-interaction patterns per capability can now contribute lightweight `insight` refs.
- Memory selection remains bounded:
   - max 6 refs returned
   - interaction learning is additive, not a replacement for stored memory
   - no autonomous writeback into persistent memory tables

## Acceptance Evidence
- Focused tests passed:
  - `lib/interaction-learning/__tests__/memory.test.ts`
  - `lib/router/__tests__/memory-selection.test.ts`
  - `lib/interaction-learning/__tests__/runtime.test.ts`
  - `lib/router/__tests__/router-main-step6.test.ts`
- Production build passed:
  - `npm run build`

## Design Boundary
This is a stronger memory baseline, not a full Working Mind redesign.

Explicitly out of scope:
- customer preference memory
- user long-term memory profiles
- automatic memory compaction/summarization
- verification-aware memory gating
- memory-driven prompt runtime redesign

## Next Implication
The platform now has the first real bridge between:
- structured interaction learning logs
- working memory selection
- downstream capability context

This enables the next layer of work:
1. verification-aware runtime stage design
2. cost/accounting instrumentation
3. stronger customer-specific memory policies
