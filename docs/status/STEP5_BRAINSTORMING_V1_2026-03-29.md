# Step 5 Brainstorming V1

- Date: 2026-03-29
- Status: Active / Pre-implementation
- Skill used: `/Users/alexzheng/.codex/skills/maxshot-step-brainstorming/SKILL.md`
- Upstream freeze baseline:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_FREEZE_SYNC_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_FREEZE_DECISION_2026-03-28.md`

## 1. One-sentence goal

Step 5 exists to take a `pass` or `require_confirmation` result from Step 4 and seal it into one immutable, auditable task/execution artifact pair for deterministic downstream routing.

## 2. What Step 5 owns

Step 5 owns:

1. creating the canonical sealed payload written to `tasks_op` and `task_executions_op`
2. assigning stable `task_id` / `execution_id`
3. persisting capability binding, slots, entry metadata, and audit seed in one normalized shape
4. enforcing idempotency, match-count, and sealing-time integrity checks
5. deciding initial execution status from the Step 4 gate result
   - `created`
   - `pending_confirmation`
6. ensuring downstream Step 6 consumes one sealed artifact rather than raw Step 3/4 output

## 3. What Step 5 does not own

Step 5 does not own:

1. turn relation or session carry
2. intent match or slot extraction
3. gate semantics or confirmation policy itself
4. router scheduling decisions
5. capability execution
6. user-facing answer wording
7. post-seal execution retry/evolve logic

## 4. Trusted upstream artifacts

Step 5 may trust only:

1. Step 1 normalized entry metadata
2. Step 2 context packet identity fields if present
3. Step 3 semantic result
4. Step 4 `GateDecision`
5. capability catalog / registry as runtime truth for risk and capability validity

Step 5 must not trust:

1. caller-supplied legacy intent labels as execution authority
2. caller-supplied `require_confirmation` if it conflicts with capability risk or gate result
3. arbitrary payload strings that bypass the sealed shape

## 5. Downstream artifact it must emit

Step 5 must emit one official artifact family:

1. `SealedExecutionEnvelope`
2. persisted rows in:
   - `tasks_op`
   - `task_executions_op`
3. one initial audit seed
4. response fields needed by Step 6:
   - `task_id`
   - `execution_id`
   - `status`
   - `primary_capability_id`
   - `matched_capability_ids`

## 6. MVP boundary

### 6.1 MVP Must

Step 5 must:

1. accept only Step 4 outcomes that are sealable:
   - `pass`
   - `require_confirmation`
2. reject `continue_chat` and `out_of_scope` paths from sealing
3. normalize one immutable sealed payload shape
4. persist task + execution rows consistently
5. set initial status correctly:
   - `pass` + read-only -> `created`
   - `require_confirmation` or side-effect -> `pending_confirmation`
6. enforce idempotency when `idempotency_key` is provided
7. enforce matched capability limits and primary capability validity
8. create an audit seed event at seal time

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. the sealed payload still contains some compatibility fields for audit/read tooling
2. manual UI create flow and NL create flow share one route even if the request shapes differ slightly before normalization
3. the audit seed is minimal as long as it is stable and replayable
4. confirmation policy remains simple and capability-risk-driven

### 6.3 Post-MVP

These do not block Step 5 MVP:

1. richer actor/ACL-aware sealing policy
2. multi-stage sealing with draft/review/pre-seal states
3. stronger transactional rollback between task and execution writes
4. more granular idempotency scopes
5. versioned sealed envelope migrations and replay adapters

## 7. Focused acceptance examples

1. Normal success:
   - complete read-only business query reaches Step 5
   - result: task/execution sealed with `status=created`
2. Confirmation path:
   - side-effect capability reaches Step 5
   - result: `pending_confirmation` with confirmation payload
3. Blocked case:
   - Step 4 returns `continue_chat`
   - result: Step 5 refuses sealing
4. Tolerated case:
   - caller sends compatibility-heavy payload but valid gate + capability data
   - result: Step 5 seals normalized artifact without reinterpreting semantics

## 8. Decision

Coding should start now.

Reason:

1. Step 5 boundary is clear enough
2. upstream Step 1-4 are frozen
3. current live code already contains a sealer route, so Step 5 is primarily a contract-hardening step rather than a greenfield build
