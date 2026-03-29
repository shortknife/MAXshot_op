# Step 7 Implementation Plan V1

- Date: 2026-03-29
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_CAPABILITY_EXECUTION_CONTRACT_V1_2026-03-29.md`
- Brainstorming source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP7_BRAINSTORMING_V1_2026-03-29.md`

## 1. Objective

Turn the current capability registry path into a true Step 7 execution layer with stable output semantics and focused acceptance coverage.

## 2. Implementation phases

### Phase A - Contract alignment

1. define one runtime `CapabilityExecutionResult` shape
2. normalize capability failure semantics
3. ensure Step 7 consumes only Step 6 authority

### Phase B - Registry normalization

1. centralize capability lookup behavior
2. centralize missing-capability handling
3. normalize blocked publisher behavior

### Phase C - Output unification

1. keep capability id/version/evidence/audit fields stable
2. normalize ordered output aggregation
3. avoid implicit success on failed capability output

### Phase D - Validation

1. add focused Step 7 tests
2. add one Step 7 MVP acceptance command
3. run adjacency regression on Step 6 before closure

## 3. MVP scope now

### In MVP now

1. `data_fact_query` execution path
2. `product_doc_qna` execution path
3. `content_generator` execution path
4. `context_assembler` execution path
5. explicit failure for missing/inactive capability
6. explicit blocked behavior for `publisher`

### Not in MVP now

1. parallel capability execution
2. advanced partial-success orchestration
3. provider-level retry strategy redesign
4. richer capability policy matrix

## 4. Deliverables

1. focused Step 7 tests
2. Step 7 acceptance evidence
3. stable capability execution result shape
