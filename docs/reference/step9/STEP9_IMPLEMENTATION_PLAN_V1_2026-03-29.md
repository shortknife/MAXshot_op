# Step 9 Implementation Plan V1

- Date: 2026-03-29
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP9_DELIVERY_CRITIC_CONTRACT_V1_2026-03-29.md`
- Brainstorming source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP9_BRAINSTORMING_V1_2026-03-29.md`

## 1. Objective

Turn the current mixed response builders into a true Step 9 delivery layer with one canonical critic gate and one canonical delivery envelope.

## 2. Implementation phases

### Phase A - Contract alignment

1. define one runtime `CriticDecision`
2. define one runtime `DeliveryEnvelope`
3. centralize final outcome mapping

### Phase B - Critic gating

1. enforce deterministic pass/block/clarify rules
2. reject capability/result mismatches
3. reject blocked or failed execution being delivered as success

### Phase C - Delivery normalization

1. unify business/qna/content/failure output envelopes
2. preserve execution/trace metadata
3. standardize TG/Web conversion from the same delivery source

### Phase D - Validation

1. add focused Step 9 tests
2. add one Step 9 MVP acceptance command
3. run adjacency regression on Step 7 and Step 8 before closure

## 3. MVP scope now

### In MVP now

1. deterministic critic gate
2. canonical delivery envelope
3. business success / business clarification / qna success / out_of_scope explicit failure
4. Web/TG conversion from one normalized source

### Not in MVP now

1. LLM-native critic loop
2. multi-candidate answer selection
3. advanced rewrite/repair loop after critic failure
4. channel-personalized wording layers

## 4. Deliverables

1. focused Step 9 tests
2. Step 9 acceptance evidence
3. stable critic + delivery runtime artifact
