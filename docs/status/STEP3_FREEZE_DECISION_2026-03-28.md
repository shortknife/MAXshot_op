# Step 3 Freeze Decision (MVP Standard)

- Date: 2026-03-28
- Scope: `Step 3 - Intent Harness`
- Status: Frozen / Accepted for MVP
- Governing standard:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step3/STEP3_IMPLEMENTATION_PLAN_V1_2026-03-27.md`

## 1. Final decision

`Step 3` is accepted and frozen for the current MVP boundary as of 2026-03-28.

This means:

1. `Step 3` is no longer an open-ended capability expansion target.
2. `Step 3` is considered complete for `MVP Must` and `MVP Tolerated`.
3. `Post-MVP` composite query understanding does not block current delivery.

## 2. Accepted MVP scope

The frozen MVP scope of `Step 3` is:

1. stable capability match
2. stable slot extraction for normal single-goal business queries
3. stable clarification decision for under-specified normal queries
4. stable `general_qna` vs `out_of_scope` separation
5. stable follow-up intent carry for common business follow-ups
6. stable tolerated downgrade for post-MVP composite queries

`Step 3` does **not** own:

1. SQL generation
2. business data correctness
3. automatic multi-query decomposition
4. deep multi-period comparison contract modeling
5. post-MVP composite query execution

## 3. Freeze criteria met

The following conditions are considered met:

1. `MVP Must` cases pass under one dedicated acceptance script.
2. `MVP Tolerated` cases degrade to clarification rather than silently misrouting.
3. `matched_capability_id`, `slots`, `need_clarification`, `out_of_scope`, and runtime-facing contract state are stable enough for MVP.
4. common follow-up semantics no longer depend on manual ad hoc inspection.

## 4. Evidence

### 4.1 Step 3 MVP acceptance gate

Script:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/step3-mvp-acceptance.ts`

Result:

- `total: 7`
- `passed: 7`
- `failed: 0`

### 4.2 Covered Step 3 MVP Must cases

1. `3月第一周的平均APY是多少？`
2. `当前 vault APY 怎么样？`
3. `你能描述什么是MAXshot么？`
4. `现在ARB链上有那几个Vault？ -> Base呢？`

### 4.3 Covered Step 3 MVP Tolerated cases

1. `3月份的APY均值是多少？最高和最低分别是多少？`
2. `2月份和3月份比较的话，那个vault TVL 提高最多呢？以当月最高的TVL计算即可！`

These tolerated cases are accepted because they now degrade to clarification instead of claiming a wrong ready contract.

## 5. Frozen files

### Contract / design

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP3_INTENT_HARNESS_CONTRACT_V1_2026-03-27.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step3/STEP3_IMPLEMENTATION_PLAN_V1_2026-03-27.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP3_测试矩阵_V1_2026-03-27.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`

### Runtime / tests

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/intent-parsing.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/intent-analyzer/deepseek-client.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/intent-compat.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/handlers/business-intent-handler.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/capabilities/business-query-contract-v2.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/step3-inspect.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/step3-sequence.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/scripts/step3-mvp-acceptance.ts`

## 6. Change control after freeze

From this point onward:

1. do not reopen `Step 3` for opportunistic cleanup
2. do not expand `Post-MVP` composite query support inside the frozen MVP scope
3. only change `Step 3` when a reproduced defect is clearly attributable to intent harness behavior
4. any `Step 3` change must include:
   - defect statement
   - focused reproduction
   - focused acceptance rerun

## 7. Next active workstream

After this freeze, the next active workstream should move downstream from `Step 3`, not back into intent semantics by default.
