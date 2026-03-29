# Step 3 Implementation Plan V1

> Status: Frozen baseline  
> Contract source: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
> MVP baseline: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
> Workflow subset: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`
> Freeze decision: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_FREEZE_DECISION_2026-03-28.md`

## 1. Objective

Refactor Step 3 so that the codebase has a single **Intent Harness** authority aligned with v5.2:

- registry-first
- LLM-first for semantics
- harness-enforced for reliability
- no Step 2 bleed-through

This plan is now constrained by the MVP boundary:

1. finish `MVP Must`
2. ensure `MVP Tolerated` cases do not silently misroute
3. defer `Post-MVP` composite contracts explicitly instead of half-implementing them

## 2. Implementation order

### Phase A - Contract alignment

1. Introduce a dedicated Step 3 runtime type:
   - `IntentHarnessResult`
2. Stop treating legacy intent labels as the primary routing signal.
3. Keep compatibility intent labels only as audit fields.

Target files:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/intent-parsing.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/intent-compat.ts`

### Phase B - Compatibility shell tightening

1. Shrink `normalizeChatIntent()` into a compatibility shell only.
2. Remove authority decisions that should come from Prompt V2 output.
3. Allow narrow fallback only for:
   - analyzer hard failure
   - JSON parse failure
   - explicit degraded mode

### Phase C - API and runtime unification

1. Make `/api/intent/analyze` expose the Step 3 official contract.
2. Ensure `prepareChatRequest()` consumes one Step 3 result object instead of multiple ad hoc repairs.
3. Ensure downstream router sees:
   - `matched_capability_ids`
   - `matched_capability_id`
   - `slots`
   - `need_clarification`
   as the canonical Step 3 output.

### Phase D - Validation

1. Add Step 3 focused tests.
2. Run Step 3 focused baseline set.
3. Then run `phase0`.

## 3. Explicit non-goals

This implementation round must not:

1. redesign Step 2
2. chase `Post-MVP` composite query understanding as a closure blocker
3. implement automatic multi-query decomposition for one complex user turn
4. redesign capability execution
5. widen active capability surface

Examples that are explicitly outside Step 3 MVP closure:

1. `均值是多少，最高和最低分别是多少`
2. `2月和3月比较，哪个 vault TVL 提高最多`
3. one-turn requests that simultaneously require:
   - comparison
   - ranking
   - aggregation override
   - explanation

## 4. Code migration rules

### Rule 1

Do not let `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/intent-compat.ts` remain the hidden source of truth.

### Rule 2

Do not add new regex-first intent routing to compensate for weak runtime plumbing.

### Rule 3

If a semantic fix is needed, prefer:

1. prompt contract
2. critic repair
3. normalizer canonicalization

Only then add code enforcement.

### Rule 4

Step 3 must consume Step 2 `ContextPacket` as input, not bypass it.

## 5. Deliverables

1. runtime type and contract alignment in code
2. Step 3 focused tests
3. Step 3 acceptance summary
4. explicit classification of:
   - `MVP Must`
   - `MVP Tolerated`
   - `Post-MVP`

## 6. Exit criteria

Implementation phase is complete only when:

1. one official Step 3 response shape exists
2. legacy intent labels are no longer authoritative
3. focused Step 3 tests pass
4. `MVP Must` cases are stable
5. `MVP Tolerated` cases do not silently misroute
6. `phase0` still passes
