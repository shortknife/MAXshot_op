# Step 7 Brainstorming V1

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

## 1. One-sentence goal

Step 7 exists to execute the router-approved capability chain and produce one canonical capability output family with correct success or failure semantics.

## 2. What Step 7 owns

Step 7 owns:

1. capability invocation against the runtime registry
2. capability input envelope integrity at execution time
3. capability success/failure semantics
4. capability-local evidence, audit metadata, and fallback metadata
5. aggregation of capability outputs for downstream trace/answer steps

## 3. What Step 7 does not own

Step 7 does not own:

1. session carry or clarification logic
2. semantic understanding or slot extraction
3. gate decisions
4. sealing
5. router decomposition/binding authority
6. final user-facing answer formatting
7. long-term memory policy

## 4. Trusted upstream artifacts

Step 7 may trust only:

1. Step 6 `RoutingDecision`
2. Step 6 execution-time capability input envelope
3. capability registry as runtime truth for active capability mapping
4. sealed slots/context already normalized upstream

Step 7 must not trust:

1. raw query for re-inference
2. caller-injected capability ids that bypass Step 6
3. ad hoc output shaping that hides capability failure

## 5. Downstream artifact it must emit

Step 7 must emit one official artifact family:

1. `CapabilityExecutionResult`
2. one ordered list of `capability_outputs`
3. stable execution success/failure semantics
4. capability-local audit/evidence metadata suitable for Step 8 trace

## 6. MVP boundary

### 6.1 MVP Must

Step 7 must:

1. execute the Step 6 capability chain deterministically
2. return stable success/failure semantics per capability
3. preserve capability id and version in outputs
4. propagate capability evidence and metadata
5. fail explicitly when capability is missing or rejected
6. keep main MVP capabilities working:
   - `capability.data_fact_query`
   - `capability.product_doc_qna`
   - `capability.content_generator`
   - `capability.context_assembler`

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. some capabilities still rely on fallback modes internally
2. `publisher` may remain confirmation-blocked rather than fully executable
3. multi-capability chains may stay simple if outputs remain ordered and explicit

### 6.3 Post-MVP

These do not block Step 7 MVP:

1. richer capability retry policies
2. advanced partial-success handling
3. capability-level concurrency
4. stronger provider abstraction for each capability

## 7. Focused acceptance examples

1. Normal success:
   - routed `data_fact_query` executes and returns success output
2. Blocked case:
   - missing capability id or inactive capability returns explicit failure
3. Boundary case:
   - `product_doc_qna` stays on the QnA path and does not drift into business query execution
4. Tolerated case:
   - `publisher` remains blocked with `pending_confirmation_required` instead of silently executing

## 8. Decision

Coding should start now.

Reason:

1. Step 6 is frozen and now supplies a stable router boundary
2. Step 7 already exists in runtime form inside the capability registry
3. the next work is contract-hardening and evidence normalization, not greenfield implementation
