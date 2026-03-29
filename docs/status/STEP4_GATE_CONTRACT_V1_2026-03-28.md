# Step 4 Gate Contract V1

- Date: 2026-03-28
- Status: Frozen / Accepted for MVP
- Scope: `Step 4 - Gate`
- Architecture source of truth:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 4 exists to answer one question only:

> Given the Step 3 semantic result, is the request ready to proceed, should it stay in the chat loop, or does it require explicit confirmation before sealing?

Step 4 does not reinterpret user meaning.

## 2. Responsibilities

Step 4 must:

1. enforce completeness and boundary rules
2. decide one gate result:
   - `continue_chat`
   - `pass`
   - `require_confirmation`
3. preserve the upstream Step 3 semantic authority
4. explain why execution is blocked when it is blocked
5. distinguish:
   - missing information
   - side-effect confirmation requirement
   - out-of-scope / rejected requests

Step 4 must not:

1. redo capability match
2. rewrite slots
3. invent missing business semantics
4. silently coerce incomplete intent into `pass`

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

LLM has no new primary role in Step 4.

Step 4 is code-authoritative.

### 3.2 Harness responsibilities

Harness enforces:

1. accepted gate output schema
2. explicit stop/pass/confirm decision
3. reproducible gate reasons
4. no semantic authority drift from Step 3 to Step 4

### 3.3 Code responsibilities

Code is the sole authority for:

1. contract completeness checks
2. side-effect confirmation policy
3. read-only vs side-effect path separation
4. final gate result emission

## 4. Inputs

Step 4 input contract:

```json
{
  "raw_query": "string",
  "step2_context_packet": {},
  "step3_result": {
    "intent_type": "business_query|general_qna|out_of_scope|content_brief|marketing_gen",
    "matched_capability_id": "capability.id|null",
    "matched_capability_ids": [],
    "in_scope": true,
    "need_clarification": false,
    "slots": {},
    "trace": {}
  }
}
```

## 5. Outputs

Step 4 official output contract:

```json
{
  "gate_result": "continue_chat|pass|require_confirmation",
  "require_confirmation": false,
  "gate_reason": "string",
  "blocking_fields": [],
  "safe_to_seal": false
}
```

### 5.1 Output meanings

1. `continue_chat`
   - request is not ready to seal
   - missing information or clarification still required

2. `pass`
   - request is read-only and complete enough to seal

3. `require_confirmation`
   - semantic understanding is sufficient
   - but side-effect policy blocks immediate sealing/execution

## 6. MVP decision rules

### 6.1 MVP Must

Step 4 must correctly do the following:

1. incomplete read-only query -> `continue_chat`
2. complete read-only query -> `pass`
3. side-effect path -> `require_confirmation`
4. out_of_scope -> never `pass`
5. Step 4 must not reclassify the user query

### 6.2 MVP Tolerated

These are acceptable in MVP:

1. write-path stays conservatively blocked behind confirmation
2. confirmation policy is simple and channel-agnostic
3. gate reason granularity is minimal as long as it is explicit

### 6.3 Post-MVP

The following do not block Step 4 MVP closure:

1. richer actor/ACL policy
2. channel-specific confirmation UX
3. multi-stage confirmation workflows
4. dynamic operator escalation policy

## 7. Gate rules

### Rule A - Missing information

If Step 3 or Query Contract indicates missing required information:

- `gate_result = continue_chat`
- `require_confirmation = false`

### Rule B - Read-only ready

If the request is read-only and complete:

- `gate_result = pass`
- `require_confirmation = false`

### Rule C - Side-effect ready but not approved

If the request is semantically ready but is a write/side-effect path:

- `gate_result = require_confirmation`
- `require_confirmation = true`

### Rule D - Rejected

If Step 3 is out-of-scope:

- never return `pass`

## 8. Non-goals

This Step 4 round must not:

1. redesign Step 3
2. redesign Step 5 sealing
3. redesign side-effect providers
4. widen write-path capability surface

## 9. Exit criteria

Step 4 is ready to freeze only when:

1. one stable gate output object exists
2. Step 4 no longer redoes intent semantics
3. focused Step 4 acceptance cases pass
4. `continue_chat / pass / require_confirmation` behavior is stable under MVP scenarios

- Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_FREEZE_DECISION_2026-03-28.md`
