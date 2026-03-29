# Step 8 Brainstorming V1

- Date: 2026-03-29
- Status: Active / Pre-implementation
- Skill used: `/Users/alexzheng/.codex/skills/maxshot-step-brainstorming/SKILL.md`
- Upstream freeze baseline:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_FREEZE_SYNC_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_FREEZE_DECISION_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_FREEZE_DECISION_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_FREEZE_DECISION_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_FREEZE_DECISION_2026-03-29.md`

## 1. One-sentence goal

Step 8 exists to turn the sealed-to-executed lifecycle into one canonical, replayable audit trail that downstream read, replay, and delivery layers can trust.

## 2. What Step 8 owns

Step 8 owns:

1. canonical audit event normalization
2. append-only execution trace writing
3. audit log integrity for `execution_id`
4. stable audit read shape for downstream pages and APIs
5. replay-ready trace semantics

## 3. What Step 8 does not own

Step 8 does not own:

1. session memory or conversation carry
2. intent inference or clarification
3. gate or sealing authority
4. routing decisions
5. capability execution semantics
6. final user-facing answer generation
7. advanced memory retrieval policy

## 4. Trusted upstream artifacts

Step 8 may trust only:

1. Step 5 `SealedExecutionEnvelope`
2. Step 6 `RoutingDecision`
3. Step 7 `capability_outputs`
4. execution status transitions already decided upstream

Step 8 must not trust:

1. raw query as audit authority
2. ad hoc UI labels as status authority
3. caller-supplied audit events that bypass normalization

## 5. Downstream artifact it must emit

Step 8 must emit one official artifact family:

1. canonical `AuditLog`
2. normalized ordered `AuditEvent[]`
3. replay-ready event chain for one `execution_id`
4. stable read/trace payloads for Step 9 and admin read surfaces

## 6. MVP boundary

### 6.1 MVP Must

Step 8 must:

1. keep one append-only `audit_log` per `execution_id`
2. normalize core event types across Step 5/6/7:
   - `execution_created`
   - `execution_confirmation_requested`
   - `execution_confirmed`
   - `execution_rejected`
   - `router_start`
   - `task_decomposed`
   - `memory_selected`
   - `capability_executed`
   - `router_complete`
   - `router_blocked`
   - `router_error`
3. preserve timestamped event order
4. preserve `execution_id` on every event
5. expose one stable read path for audit consumers
6. ensure replay/retry actions append explicit audit markers instead of mutating history silently

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. some legacy event names remain readable if they are normalized at read time
2. some older routes still write directly to `audit_log` if they pass through the normalizer helpers
3. replay may remain in-place rather than generating a new execution lineage tree

### 6.3 Post-MVP

These do not block Step 8 MVP:

1. full lineage graph normalization across replay/retry/evolve
2. actor-level audit ACL segmentation
3. external export pipelines
4. audit compaction or archival tiers
5. cross-execution causality stitching beyond current APIs

## 7. Focused acceptance examples

1. Normal success:
   - one confirmed execution writes ordered events from `execution_created` through `router_complete`
2. Blocked case:
   - non-runnable execution appends `router_blocked` and does not pretend success
3. Boundary case:
   - replay appends `execution_replay_requested` without destroying prior events
4. Tolerated case:
   - older audit payloads are still readable through normalized audit-read helpers

## 8. Decision

Coding should start now.

Reason:

1. Step 5/6/7 are frozen and now provide stable upstream authority
2. the codebase already has partial audit helpers and routes, but not one explicit Step 8 contract
3. the next work is to consolidate trace writing and reading, not invent a new execution model
