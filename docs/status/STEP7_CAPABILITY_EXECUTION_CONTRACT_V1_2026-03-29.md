# Step 7 Capability Execution Contract V1

- Date: 2026-03-29
- Status: Frozen / Accepted for MVP
- Scope: `Step 7 - Capability Execution`
- Architecture source of truth:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_ROUTER_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_SEALER_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 7 executes the router-approved capability chain and emits stable capability results that downstream trace and answer layers can trust.

## 2. Responsibilities

Step 7 must:

1. execute capability functions via the active capability registry
2. preserve ordered capability outputs
3. preserve capability-local success/failure semantics
4. preserve evidence, audit metadata, and fallback reasons
5. reject missing or inactive capabilities explicitly

Step 7 must not:

1. redo Step 3 semantics
2. redo Step 4 gate decisions
3. redo Step 6 routing decisions
4. shape final user-facing summaries

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

LLM may be used inside individual capabilities, but not for Step 7 dispatch authority.

### 3.2 Harness responsibilities

Harness enforces:

1. stable capability output schema
2. stable failure semantics
3. capability id/version preservation

### 3.3 Code responsibilities

Code is the sole authority for:

1. capability lookup and invocation
2. ordered execution of the capability chain
3. execution-time error semantics
4. capability result aggregation

## 4. Inputs

Step 7 input contract:

```json
{
  "routing_decision": {
    "primary_capability_id": "capability.id",
    "capability_chain": [],
    "dispatch_ready": true
  },
  "capability_input": {
    "execution_id": "uuid",
    "intent": {},
    "slots": {},
    "memory_refs_ref": [],
    "context": {}
  }
}
```

## 5. Outputs

Step 7 official output contract:

```json
{
  "capability_outputs": [
    {
      "capability_id": "capability.id",
      "capability_version": "string",
      "status": "success|failed",
      "result": {},
      "error": "string|null",
      "evidence": {},
      "audit": {},
      "metadata": {}
    }
  ],
  "success": true,
  "error": "string|null"
}
```

## 6. MVP rules

1. capability lookup must use the active registry
2. missing capability must fail explicitly
3. blocked `publisher` path must fail explicitly with confirmation semantics
4. capability outputs must retain id/version/evidence/audit fields
5. Step 7 must not silently convert failed capability outputs into success

## 7. Exit criteria

Step 7 is ready to freeze only when:

1. one stable capability output shape exists
2. focused Step 7 acceptance tests pass
3. main MVP capabilities execute with correct success/failure semantics
4. capability execution no longer depends on hidden semantic reinterpretation

- Freeze decision:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_FREEZE_DECISION_2026-03-29.md`
