# Step 6 Implementation Plan V1

- Date: 2026-03-29
- Status: Frozen baseline
- Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_ROUTER_CONTRACT_V1_2026-03-29.md`
- Brainstorming source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP6_BRAINSTORMING_V1_2026-03-29.md`

## 1. Objective

Turn the current router path into a true Step 6 execution router that consumes Step 5 sealed authority and emits one deterministic routing decision plus auditable dispatch flow.

## 2. Implementation phases

### Phase A - Contract alignment

1. define one runtime `RoutingDecision` type
2. make router consume Step 5 sealed payload as the only semantic authority
3. remove remaining raw-query or legacy-label routing shortcuts after seal

### Phase B - Router normalization

1. centralize runnable-status checks
2. centralize capability-chain derivation
3. centralize router-time memory/context assembly

### Phase C - Audit and runtime unification

1. normalize router audit event sequence
2. normalize execution status transition rules
3. expose one stable router result object to `/api/execution/run`

### Phase D - Validation

1. add focused Step 6 tests
2. add one Step 6 MVP acceptance script if repeated verification is needed
3. run focused regression before broader sweeps

## 3. MVP scope now

### In MVP now

1. read-only sealed execution routes through the primary capability correctly
2. missing/invalid runnable state blocks router start
3. follow-up-derived sealed executions do not drift capability or scope
4. router audit shows:
   - `router_start`
   - `task_decomposed`
   - `memory_selected`
   - `capability_executed`
   - `router_complete|router_error`

### Not in MVP now

1. multi-capability branch execution redesign
2. dynamic retry planning
3. sophisticated memory ranking policies
4. actor/channel-specific routing policy matrix

## 4. Deliverables

1. `RoutingDecision` runtime type
2. focused Step 6 tests
3. Step 6 acceptance evidence
