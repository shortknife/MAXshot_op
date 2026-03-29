# Step 6 Router Contract V1

- Date: 2026-03-29
- Status: Frozen / Accepted for MVP
- Scope: `Step 6 - Router`
- Architecture source of truth:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_SEALER_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_GATE_CONTRACT_V1_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 6 converts a sealed execution into one deterministic routing decision and one canonical capability dispatch plan.

## 2. Responsibilities

Step 6 must:

1. validate that the execution is runnable
2. derive the primary capability and capability chain deterministically
3. construct router-time context and memory refs for execution
4. emit router audit events that prove the path taken
5. hand Step 7 a stable execution envelope without semantic reinterpretation

Step 6 must not:

1. redo Step 3 semantics
2. redo Step 4 gate decisions
3. reseal Step 5 payloads
4. execute business logic itself

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

LLM has no new primary role in Step 6.

Step 6 is code-authoritative.

### 3.2 Harness responsibilities

Harness enforces:

1. accepted sealed-input schema
2. deterministic routing output schema
3. reproducible audit event sequence
4. no capability drift after seal

### 3.3 Code responsibilities

Code is the sole authority for:

1. runnable-status checks
2. capability-chain derivation
3. memory/context assembly for router execution
4. audit event emission and execution status transitions

## 4. Inputs

Step 6 input contract:

```json
{
  "execution_id": "uuid",
  "sealed_execution": {
    "primary_capability_id": "capability.id",
    "matched_capability_ids": [],
    "intent_name": "string",
    "slots": {},
    "entry": {},
    "gate": {}
  },
  "status": "created|confirmed"
}
```

## 5. Outputs

Step 6 official output contract:

```json
{
  "routing_decision": {
    "primary_capability_id": "capability.id",
    "capability_chain": [],
    "memory_query": {
      "types": [],
      "context_tags": []
    },
    "memory_refs_ref": [],
    "dispatch_ready": true
  },
  "audit_events": [],
  "execution_runtime": {
    "status": "in_progress|completed|failed",
    "step_status": "executing|completed|failed"
  }
}
```

## 6. MVP rules

1. execution must be in a runnable state before routing begins
2. primary capability id must be present and valid
3. router must use sealed capability ids as authority
4. router must not reopen raw-query interpretation
5. decomposition and memory selection must be visible in audit
6. router must preserve scope and capability intent under follow-up-derived executions

## 7. Exit criteria

Step 6 is ready to freeze only when:

1. one stable routing decision object exists
2. router authority comes from Step 5 sealed data, not raw request reinterpretation
3. focused Step 6 acceptance tests pass
4. router audit proves binding and decomposition deterministically

- Freeze decision:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_FREEZE_DECISION_2026-03-29.md`
