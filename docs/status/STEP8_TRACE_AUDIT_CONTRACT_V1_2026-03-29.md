# Step 8 Trace Audit Contract V1

- Date: 2026-03-29
- Status: Frozen / Accepted for MVP
- Scope: `Step 8 - Trace + Audit`
- Architecture source of truth:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_SEALER_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_ROUTER_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_CAPABILITY_EXECUTION_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/AUDIT_FIELD_CONTRACT_V1_2026-03-12.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 8 writes and reads one canonical audit trail for each execution so the system remains replayable, inspectable, and non-ambiguous after capability execution.

## 2. Responsibilities

Step 8 must:

1. normalize audit event shape and ordering
2. append canonical audit events to `audit_log`
3. preserve `execution_id`, `event_type`, `timestamp`, and normalized `data`
4. expose one stable audit read model for admin and downstream delivery
5. keep replay/retry markers explicit in the trace

Step 8 must not:

1. decide whether an execution should run
2. change execution semantics from prior steps
3. rewrite capability results
4. generate the final user answer

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

None by default. Step 8 is deterministic.

### 3.2 Harness responsibilities

Harness enforces:

1. one canonical audit event vocabulary
2. append-only event history
3. normalized read shape for downstream consumers

### 3.3 Code responsibilities

Code is the sole authority for:

1. event normalization
2. event append semantics
3. audit log read normalization
4. replay marker persistence

## 4. Inputs

Step 8 input contract:

```json
{
  "execution_id": "uuid",
  "status": "created|pending_confirmation|confirmed|completed|failed|rejected|expired",
  "routing_decision": {},
  "capability_outputs": [],
  "audit_seed": {},
  "action": "create|confirm|run|retry|replay|expire|read"
}
```

## 5. Outputs

Step 8 official output contract:

```json
{
  "audit_log": {
    "execution_id": "uuid",
    "created_at": "iso-timestamp",
    "events": [
      {
        "event_type": "string",
        "timestamp": "iso-timestamp",
        "data": {
          "execution_id": "uuid"
        }
      }
    ]
  },
  "trace_read_model": {
    "execution_id": "uuid",
    "events": []
  }
}
```

## 6. MVP rules

1. all Step 8 writes must preserve append-only semantics
2. blocked run paths must write explicit blocked events
3. replay and retry actions must write explicit marker events
4. audit reads must normalize older payload variants
5. Step 8 must not silently drop malformed events; it must normalize or reject them

## 7. Exit criteria

Step 8 is ready to freeze only when:

1. one canonical audit write path exists
2. one canonical audit read path exists
3. focused Step 8 acceptance tests pass
4. replay/retry markers are explicit and queryable
5. downstream read surfaces no longer depend on ad hoc audit parsing

- Freeze decision:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_FREEZE_DECISION_2026-03-29.md`
