# Step 9 Brainstorming V1

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
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_FREEZE_DECISION_2026-03-29.md`

## 1. One-sentence goal

Step 9 exists to block wrong-but-plausible outputs and emit one final user-facing delivery object only after a deterministic critic gate passes.

## 2. What Step 9 owns

Step 9 owns:

1. final response assembly from Step 7 outputs plus Step 8 trace
2. one canonical `CriticDecision`
3. pass / block / clarify / retry decision before user delivery
4. final delivery envelope for Web and TG paths
5. user-facing failure semantics after execution

## 3. What Step 9 does not own

Step 9 does not own:

1. Step 3 intent recognition
2. Step 4 gate logic
3. Step 5 sealing
4. Step 6 routing
5. Step 7 capability execution
6. Step 8 audit writing
7. long-term memory policy

## 4. Trusted upstream artifacts

Step 9 may trust only:

1. Step 7 `capability_outputs`
2. Step 8 `trace_read_model`
3. sealed execution/result status already normalized upstream
4. Step 3 / Step 7 metadata only as supporting evidence, not new authority

Step 9 must not trust:

1. raw query as the only answer authority
2. ad hoc UI summaries generated outside the critic path
3. pre-Step9 `final_answer` strings unless they are re-evaluated by the critic

## 5. Downstream artifact it must emit

Step 9 must emit one official artifact family:

1. `CriticDecision`
2. `DeliveryEnvelope`
3. one final `user_response`
4. one final blocked/clarify/retry reason when delivery is not allowed

## 6. MVP boundary

### 6.1 MVP Must

Step 9 must:

1. build one canonical final response object for normal success
2. run a deterministic critic gate before delivery
3. block delivery when capability/result type obviously mismatches the question type
4. block delivery when blocked or failed execution is being presented as success
5. preserve evidence/trace references in final metadata
6. produce stable user-facing output for:
   - business query success
   - business clarification
   - general qna success
   - out_of_scope failure

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. critic remains mostly deterministic rather than LLM-heavy
2. some final copywriting still reuses existing response builders if they pass critic checks
3. retryable failures may be surfaced as explicit failure instead of auto-retry

### 6.3 Post-MVP

These do not block Step 9 MVP:

1. richer natural-language critic reasoning
2. multi-path repair loops after critic failure
3. channel-specific delivery optimization beyond current Web/TG parity
4. advanced outcome ranking across multiple candidate answers

## 7. Focused acceptance examples

1. Normal success:
   - business query success returns final response with `critic_decision.pass = true`
2. Blocked case:
   - mismatched capability/result type is blocked and not delivered as success
3. Boundary case:
   - general qna stays on qna delivery path and does not reuse business summary shape
4. Tolerated case:
   - an incomplete business result degrades to explicit failure/clarification instead of silent success

## 8. Decision

Coding should start now.

Reason:

1. Step 1-8 are frozen, so upstream authority is stable
2. the current code already has partial response builders and scattered critic metadata
3. the remaining work is to make the return path explicit and enforce `CriticDecision` as a hard gate
