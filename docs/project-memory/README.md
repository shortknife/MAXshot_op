# Project Memory

This directory is the canonical entry point for development memory.

Read this directory before reading scattered `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/*.md` files.

## Files

- `CURRENT_STATE.md`
  - current phase
  - frozen steps
  - validation status
  - active focus

- `DECISION_LOG.md`
  - durable architectural and process decisions
  - short rationale
  - current consequence

- `OPEN_BLOCKERS.md`
  - unresolved blockers only
  - severity
  - owner/next move

- `NEXT_ACTIONS.md`
  - immediate executable next actions
  - intended to be read first when resuming work

- `SESSION_HANDOFF.md`
  - one-screen resume note
  - latest green checks
  - exact next work item
  - things that must not be re-opened casually

## Read Order

1. `SESSION_HANDOFF.md`
2. `CURRENT_STATE.md`
3. `NEXT_ACTIONS.md`
4. `OPEN_BLOCKERS.md`
5. `DECISION_LOG.md`

## Rules

1. Keep these files short and current.
2. Add durable facts, not meeting-style narration.
3. When a status doc matters long-term, summarize it here instead of relying on memory.
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/*.md` remains the evidence layer; `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/project-memory/*` is the working memory layer.
5. `SESSION_HANDOFF.md` must be updated when a release gate changes or the primary workstream changes.
