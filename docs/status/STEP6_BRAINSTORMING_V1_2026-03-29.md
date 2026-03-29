# Step 6 Brainstorming V1

- Date: 2026-03-29
- Status: Active / Pre-implementation
- Skill used: `/Users/alexzheng/.codex/skills/maxshot-step-brainstorming/SKILL.md`
- Upstream freeze baseline:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_FREEZE_SYNC_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_FREEZE_DECISION_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_FREEZE_DECISION_2026-03-29.md`

## 1. One-sentence goal

Step 6 exists to take one sealed execution artifact and deterministically derive the capability chain, working context, and dispatch plan that Step 7 can execute without re-reading raw user input.

## 2. What Step 6 owns

Step 6 owns:

1. reading one `SealedExecutionEnvelope` as the only semantic authority
2. deriving deterministic capability binding from sealed capability ids
3. producing one decomposition plan:
   - `capability_chain`
   - `context_tags`
   - `memory_query`
4. building router runtime context passed into capability execution
5. writing router-scoped audit events for:
   - router start
   - decomposition
   - memory selection
   - dispatch completion or failure
6. enforcing router-time invariants:
   - confirmed execution only
   - no missing primary capability
   - no capability drift from the sealed artifact

## 3. What Step 6 does not own

Step 6 does not own:

1. session carry or clarification logic
2. semantic understanding or slot extraction
3. gate decisions
4. seal/idempotency decisions
5. business query correctness itself
6. capability implementation logic
7. final user-facing response wording

## 4. Trusted upstream artifacts

Step 6 may trust only:

1. Step 5 `SealedExecutionEnvelope`
2. persisted execution/task rows created by Step 5
3. capability registry / catalog as runtime truth for capability metadata
4. router-owned memory runtime builders

Step 6 must not trust:

1. raw request body fields once seal is complete
2. compatibility intent labels as routing authority
3. ad hoc caller overrides for capability chain

## 5. Downstream artifact it must emit

Step 6 must emit one official artifact family:

1. `RoutingDecision`
2. deterministic execution-time capability input envelope(s)
3. router audit events with stable event types
4. execution status transition into router runtime states

## 6. MVP boundary

### 6.1 MVP Must

Step 6 must:

1. accept only sealed executions in a runnable state
2. reject missing or invalid primary capability binding
3. derive deterministic `capability_chain` from the sealed artifact and registry
4. keep routing capability-first and avoid scope drift
5. build stable memory/context input for capability execution
6. log router audit events that prove decomposition and dispatch path
7. avoid reinterpreting raw user query semantics after seal

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. some legacy compatibility fields may still exist inside router payloads as read metadata
2. decomposition can stay simple if only one primary capability is needed
3. memory selection can remain conservative as long as ref ids and source policy stay stable
4. router status transitions can remain minimal if audit is explicit

### 6.3 Post-MVP

These do not block Step 6 MVP:

1. multi-capability branching and fan-out execution
2. richer router policy matrix by actor/channel
3. dynamic retry strategy selection
4. more advanced memory ranking and pruning
5. router-only capability rebinding independent of sealed ids

## 7. Focused acceptance examples

1. Normal success:
   - sealed read-only business execution enters Step 6
   - result: deterministic `capability_chain` and router audit path
2. Blocked case:
   - execution status is not runnable
   - result: router refuses dispatch
3. Boundary case:
   - follow-up-derived yield execution is sealed with `scope=yield`
   - result: router does not drift into vault or execution scope
4. Tolerated case:
   - compatibility-heavy sealed payload still routes through the canonical primary capability without rereading raw query

## 8. Decision

Coding should start now.

Reason:

1. Step 6 boundary is now narrower than the legacy router implementation
2. Step 1-5 are frozen and provide enough authority artifacts
3. the current router code already exists, so Step 6 is mainly a contract-hardening and authority-cleanup step
