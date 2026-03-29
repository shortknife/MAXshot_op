# Step 9 Delivery Critic Contract V1

- Date: 2026-03-29
- Status: Frozen / Accepted for MVP
- Scope: `Step 9 - Return / Delivery`
- Architecture source of truth:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- Upstream dependencies:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_CAPABILITY_EXECUTION_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP8_TRACE_AUDIT_CONTRACT_V1_2026-03-29.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/QUERY_SEMANTICS_SPEC_V1.md`
- Workflow subset:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Goal

Step 9 is the only layer allowed to deliver a final user-facing response, and it must do so only after one explicit `CriticDecision` is evaluated.

## 2. Responsibilities

Step 9 must:

1. assemble the final response from canonical upstream artifacts
2. evaluate one stable `CriticDecision`
3. allow exactly these outcomes:
   - `deliver`
   - `clarify`
   - `block`
   - `retryable_failure`
4. keep final metadata traceable to execution and audit artifacts
5. preserve user-visible failure semantics

Step 9 must not:

1. rerun intent analysis
2. rerun routing or capability execution
3. mutate audit history
4. let pre-critic response text bypass the critic decision

## 3. LLM / Harness / Code split

### 3.1 LLM responsibilities

Optional in MVP. LLM may be used later for richer semantic criticism, but Step 9 MVP does not require it.

### 3.2 Harness responsibilities

Harness enforces:

1. one `CriticDecision` schema
2. one `DeliveryEnvelope` schema
3. clear final-outcome gating before user delivery

### 3.3 Code responsibilities

Code is the sole authority for:

1. critic pass/fail/block checks
2. final outcome routing
3. delivery envelope assembly
4. channel-safe response conversion

## 4. Inputs

Step 9 input contract:

```json
{
  "execution_id": "uuid",
  "capability_outputs": [],
  "trace": {},
  "status": "completed|failed|blocked",
  "channel": "web|tg"
}
```

## 5. Outputs

Step 9 official output contract:

```json
{
  "critic_decision": {
    "pass": true,
    "outcome": "deliver|clarify|block|retryable_failure",
    "reason": "string|null"
  },
  "delivery_envelope": {
    "execution_id": "uuid",
    "type": "business|qna|content|failure",
    "summary": "string",
    "meta": {}
  }
}
```

## 6. MVP rules

1. final delivery must depend on `CriticDecision`
2. business result type must align with business query semantics
3. blocked or failed execution must not be shown as success
4. qna delivery must not reuse business response shape
5. out_of_scope must remain explicit and not drift into fake success

## 7. Exit criteria

Step 9 is ready to freeze only when:

1. one canonical `CriticDecision` exists
2. one canonical `DeliveryEnvelope` exists
3. focused Step 9 acceptance tests pass
4. delivery no longer depends on scattered route-local response shaping

- Freeze decision:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP9_FREEZE_DECISION_2026-03-29.md`
