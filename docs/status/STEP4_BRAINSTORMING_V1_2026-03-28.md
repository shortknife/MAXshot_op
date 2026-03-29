# Step 4 Brainstorming V1

- Date: 2026-03-28
- Method: `$maxshot-step-brainstorming`
- Scope: `Step 4 - Gate`
- Upstream:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Current contract:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_GATE_CONTRACT_V1_2026-03-28.md`

## 1. One-sentence goal

Step 4 decides whether the current request should stay in the chat loop, pass to sealing, or require explicit confirmation, without redoing Step 3 semantics.

## 2. What Step 4 owns

Step 4 owns:

1. completeness gating
2. read-only vs side-effect gating
3. explicit `continue_chat / pass / require_confirmation` decision
4. explicit blocking reason / blocking fields
5. protection against incomplete requests silently entering Step 5

## 3. What Step 4 does not own

Step 4 does not own:

1. turn relation
2. capability match
3. slot extraction
4. business data correctness
5. SQL generation
6. execution payload sealing
7. final user answer phrasing

If any of those need to change, that is not Step 4 work.

## 4. Trusted upstream artifacts

Step 4 may trust:

1. `Step 2 ContextPacket`
2. `Step 3 IntentHarnessResult`
3. `Query Contract` completeness when present

Step 4 may not reinterpret these as a new semantic source of truth.

## 5. Downstream artifact Step 4 must emit

Step 4 must emit one stable artifact:

```json
{
  "gate_result": "continue_chat|pass|require_confirmation",
  "require_confirmation": false,
  "gate_reason": "string",
  "blocking_fields": [],
  "safe_to_seal": false
}
```

This is the only artifact Step 5 should consume as gate authority.

## 6. MVP Must

Step 4 MVP Must:

1. incomplete read-only query -> `continue_chat`
2. complete read-only query -> `pass`
3. side-effect intent -> `require_confirmation`
4. out_of_scope -> never `pass`
5. Step 4 does not modify or reinterpret Step 3 semantic meaning

## 7. MVP Tolerated

These are acceptable in MVP:

1. write-path confirmation policy is simple and conservative
2. gate reason taxonomy is still small
3. confirmation UX is channel-agnostic
4. tolerated complex query may still stay in `continue_chat`

Constraint:

- tolerated cases must not silently pass if the request is incomplete

## 8. Post-MVP

Do not block Step 4 MVP closure on:

1. actor-aware ACL
2. role-aware policy matrix
3. multi-stage approval
4. per-channel confirmation UX
5. advanced operator escalation

## 9. Focused acceptance examples

### A. Normal pass

Input:
- `3月第一周的平均APY是多少？`

Expected:
- `gate_result = pass`
- `require_confirmation = false`
- `safe_to_seal = true`

### B. Continue chat

Input:
- `当前 vault APY 怎么样？`

Expected:
- `gate_result = continue_chat`
- `blocking_fields` contains missing fields
- `safe_to_seal = false`

### C. Reject never passes

Input:
- `今天天气怎么样？`

Expected:
- never `pass`

### D. Side-effect confirmation

Input:
- any publish/write intent sample

Expected:
- `gate_result = require_confirmation`
- `require_confirmation = true`

## 10. Coding start decision

Coding should start now.

Reason:

1. Step 4 ownership is explicit
2. MVP vs Post-MVP is explicit
3. output artifact is explicit
4. focused acceptance examples are explicit

The next implementation target should be:

1. define one runtime `GateDecision`
2. consolidate current gate hot path under that object
3. add focused Step 4 acceptance tests
