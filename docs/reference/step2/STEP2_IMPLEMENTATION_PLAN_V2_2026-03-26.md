# Step 2 Implementation Plan V2

- Date: 2026-03-26
- Status: Frozen baseline
- Scope: Step 2 redesign under v5.2 standard
- MVP baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
- Workflow subset: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`
- Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_FREEZE_DECISION_2026-03-27.md`

## 1. Goal

Replace the transitional Step 2 shell with an LLM-first Session Harness.

## 2. Build sequence

### Phase A - Standard reset
1. Mark old Step 2 V1 docs as historical baseline only.
2. Freeze v2 `ContextPacket` as the only official Step 2 output.
3. Freeze turn relation taxonomy.

### Phase B - Runtime module reset
1. Session resolver
2. Turn relation classifier (LLM-led)
3. Context assembler
4. Context policy engine
5. Recall adapter
6. Step 2 aggregator

### Phase C - Integration boundary reset
1. `chat-request-preprocess` becomes orchestration shell only.
2. Step 3 consumes only `ContextPacket`.
3. No helper may bypass `ContextPacket` to mutate Step 3 inputs.

### Phase D - Acceptance reset
1. Step 2 module tests
2. TG/Web shared acceptance matrix
3. Then phase0/1/2 regression

## 3. Design constraints

1. LLM decides relation semantics.
2. Code enforces only policy and contract.
3. Heuristics are fallback only.
4. Step 2 never emits capability match / intent label.
5. Step 2 must remain channel-agnostic.

## 4. Key migration decisions

### Keep
- session TTL shell
- clarification store shell
- memory runtime shell
- registry load shell

### Replace
- heuristic-led follow-up logic
- query concatenation continuation logic
- Step 2/3 mixed preprocess path
- business-only context assumptions

### Add
- strict `ContextPacket`
- LLM-led relation prompt/runtime
- TG/Web shared acceptance set
- explicit fallback markers when heuristics are used
