# Step 4 Implementation Plan V1

- Date: 2026-03-28
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_GATE_CONTRACT_V1_2026-03-28.md`
- MVP baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Objective

Make Step 4 a single deterministic gate authority between:

1. `Step 3 semantic result`
2. `Step 5 sealing`

without redoing semantic interpretation.

## 2. Implementation order

### Phase A - Contract alignment

1. define one stable `GateDecision` runtime shape
2. stop leaking ad hoc booleans as gate authority
3. ensure Step 4 consumes:
   - Step 3 result
   - Query Contract completeness
   - confirmation policy

### Phase B - Hot-path consolidation

1. centralize `continue_chat / pass / require_confirmation`
2. separate read-only pass logic from side-effect confirmation logic
3. keep out_of_scope rejection out of the sealing path

### Phase C - Output unification

1. expose one gate result to downstream sealing
2. expose explicit gate reason and blocking fields
3. ensure no hidden Step 3 reinterpretation remains in gate code

### Phase D - Validation

1. add focused Step 4 tests
2. run Step 4 focused acceptance
3. then run one broader regression only at closure

## 3. MVP scope

### In MVP now

1. read-only complete query -> `pass`
2. read-only incomplete query -> `continue_chat`
3. write-path / side-effect -> `require_confirmation`
4. out_of_scope never passes

### Not in MVP now

1. actor-aware ACL matrix
2. channel-specific confirmation UX
3. complex approval routing

## 4. Non-goals

1. no Step 3 refactor
2. no Step 5 refactor
3. no provider redesign
4. no workflow-wide confirmation redesign

## 5. Deliverables

1. `GateDecision` runtime type
2. focused Step 4 tests
3. Step 4 acceptance summary

## 6. Exit criteria

Implementation phase is complete only when:

1. one official Step 4 output shape exists
2. incomplete read-only requests consistently stay in chat
3. complete read-only requests consistently pass
4. side-effect requests consistently require confirmation
5. focused Step 4 tests pass

- Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP4_FREEZE_DECISION_2026-03-28.md`
