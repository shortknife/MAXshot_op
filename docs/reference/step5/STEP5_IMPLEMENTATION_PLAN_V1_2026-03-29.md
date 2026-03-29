# Step 5 Implementation Plan V1

- Date: 2026-03-29
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_SEALER_CONTRACT_V1_2026-03-29.md`
- Brainstorming source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP5_BRAINSTORMING_V1_2026-03-29.md`

## 1. Objective

Turn the current `/api/intent/task/create` path into a true Step 5 sealer that consumes Step 4 authority and emits one canonical sealed execution artifact.

## 2. Implementation phases

### Phase A - Contract alignment

1. define one runtime `SealedExecutionEnvelope` type
2. make Step 5 consume explicit Step 4 gate fields
3. remove remaining caller-authority shortcuts that can override gate semantics

### Phase B - Sealer normalization

1. normalize task/execution payload shape once
2. centralize initial status derivation
3. centralize idempotency and capability-match validation

### Phase C - Output unification

1. return one stable sealed response object
2. make create route and UI consumers rely on the sealed response shape
3. keep compatibility fields only as audit/read metadata, not authority

### Phase D - Validation

1. add focused Step 5 tests
2. add one Step 5 MVP acceptance script if repeated verification is needed
3. run focused regression before any broader sweep

## 3. MVP scope now

### In MVP now

1. read-only pass -> `created`
2. side-effect / confirmation -> `pending_confirmation`
3. block `continue_chat` from sealing
4. idempotency and capability limit checks
5. stable task/execution write shape

### Not in MVP now

1. transactional two-phase commit redesign
2. advanced rollback and replay migrations
3. actor-aware policy matrix
4. complex seal lifecycle states

## 4. Deliverables

1. `SealedExecutionEnvelope` runtime type
2. focused Step 5 tests
3. Step 5 acceptance evidence
