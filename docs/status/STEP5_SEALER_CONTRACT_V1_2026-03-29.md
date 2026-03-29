# Step 5 Sealer Contract V1

- Date: 2026-03-29
- Status: Frozen / Accepted for MVP
- Scope: `Step 5 - Sealer`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_GATE_CONTRACT_V1_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 5 converts the accepted semantic request into one canonical sealed execution artifact that downstream router/execution code can trust without re-reading raw user input.

## 2. Responsibilities

Step 5 must:

1. validate sealing eligibility from Step 4
2. normalize and persist task/execution payloads
3. create stable ids and initial audit seed
4. enforce idempotency and capability integrity checks
5. expose one deterministic sealed response shape

Step 5 must not:

1. redo Step 3 or Step 4 decisions
2. generate new business semantics
3. schedule execution strategy
4. execute the capability

## 3. Inputs

```json
{
  "entry": {
    "raw_query": "string",
    "session_id": "string|null",
    "entry_channel": "web_app|tg_bot|admin_os|system",
    "requester_id": "string|null"
  },
  "step3": {
    "intent_type": "business_query|general_qna|out_of_scope|content_brief|marketing_gen",
    "matched_capability_id": "capability.id|null",
    "matched_capability_ids": [],
    "slots": {}
  },
  "step4": {
    "gate_result": "continue_chat|pass|require_confirmation",
    "require_confirmation": true,
    "safe_to_seal": false,
    "gate_reason": "string",
    "blocking_fields": []
  }
}
```

## 4. Output

```json
{
  "task_id": "uuid",
  "execution_id": "uuid",
  "status": "created|pending_confirmation",
  "sealed_execution": {
    "primary_capability_id": "capability.id|null",
    "matched_capability_ids": [],
    "intent_name": "string",
    "slots": {},
    "entry": {},
    "gate": {}
  },
  "audit_seed": {
    "event_type": "entry_created"
  }
}
```

## 5. MVP rules

1. `continue_chat` -> never seal
2. `out_of_scope` -> never seal
3. `pass` -> `status=created`
4. `require_confirmation` -> `status=pending_confirmation`
5. side-effect capability cannot be downgraded to `created`
6. no more than `MAX_MATCHED_CAPABILITIES`
7. idempotent request returns the prior task/execution pair

## 6. Exit criteria

Step 5 is ready to freeze only when:

1. one sealed runtime shape exists
2. route consumers no longer need raw request reinterpretation after seal
3. focused Step 5 acceptance tests pass
4. seal/write status is fully determined by Step 4 + capability risk, not ad hoc caller flags
