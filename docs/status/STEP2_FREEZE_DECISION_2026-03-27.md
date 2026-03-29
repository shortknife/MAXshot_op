# Step 2 Freeze Decision (v5.2 Standard)

- Date: 2026-03-27
- Scope: `Step 2 - Session Harness`
- Status: Frozen / Accepted
- Governing standard:
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/DEVELOPMENT_PLAN_V5.2_HARNESS_2026-03-25.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/TECHNICAL_PLAN_V5.2_HARNESS_2026-03-25.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP1_STEP2_STEP3_MVP_ACCEPTANCE_2026-03-28.md`
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/SUPERPOWERS_FOR_MAXSHOT_SUBSET_V1_2026-03-28.md`

## 1. Final decision

`Step 2` is accepted and frozen as of 2026-03-27.

This means:

1. `Step 2` no longer counts as a transitional shell.
2. `Step 2` is no longer the active refactor target.
3. Subsequent work should treat `Step 2` as stable infrastructure unless a new defect is found in real usage.

## 2. Accepted scope

The frozen scope of `Step 2` is:

1. session resolution
2. turn relation classification
3. clarification-state carry / reset
4. active context carry / reset
5. `ContextPacket` assembly
6. context inheritance policy enforcement
7. TG / Web shared conversation semantics baseline

`Step 2` does **not** own:

1. capability match
2. final intent label
3. SQL generation
4. business answer correctness
5. data source correctness

Those remain downstream concerns.

## 3. Freeze criteria met

The following conditions are considered met:

1. `turn_relation` is `LLM-first` on the hot path, with fallback explicitly tagged.
2. code acts as boundary enforcement, not semantic primary judge.
3. `ContextPacket` is the stable Step 2 output artifact.
4. stale clarification contamination is blocked.
5. natural follow-up and correction flows no longer rely on query-string fabrication as the primary mechanism.
6. `phase0` business follow-up regressions that were attributable to Step 2 are cleared.

## 4. Evidence

### 4.1 Step 2 unit coverage

File:

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/__tests__/context-manager.test.ts`

Covered:

1. clarification reply remains raw user input
2. stale clarification does not swallow a new topic
3. continuation no longer fabricates patched intent query

### 4.2 Main regression gate

Result:

- `phase0 = 108 / 108 PASS`

This is treated as the main regression gate proving Step 2 changes did not break the current hot path.

### 4.3 Targeted runtime checks used during closure

The following behaviors were explicitly exercised during Step 2 closure:

1. `当前 vault APY 怎么样？ -> 最近7天 -> 看 arbitrum 的 APY`
2. `最近7天 vault APY 走势如何？ -> 不是平均，是最高`
3. `当前 vault APY 怎么样？ -> 最近7天 -> 你能描述什么是 MAXshot 么？`
4. `MAXshot 有哪些 vault 可以用？ -> 那 base 上的呢？`
5. `当前 vault APY 怎么样？ -> 最近7天 -> 回到刚才那个问题`

## 5. Frozen files

The following files are now the Step 2 frozen baseline:

### Contract / design

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/STEP2_SESSION_HARNESS_CONTRACT_V2_2026-03-26.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_IMPLEMENTATION_PLAN_V2_2026-03-26.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_编码执行清单_V2_2026-03-26.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_测试矩阵_V2_2026-03-26.md`

### Runtime

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/index.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/context-manager/types.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/chat-request-preprocess.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/session-context.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/lib/chat/query-clarification.ts`

## 6. Change control after freeze

From this point onward:

1. do not reopen `Step 2` for opportunistic cleanup
2. do not mix `Step 2` fixes with `Step 3` feature work
3. only change Step 2 when a reproduced defect is clearly attributable to session harness behavior
4. any Step 2 change must include:
   - defect statement
   - targeted reproduction
   - regression test

## 7. Next active workstream

After this freeze, the next active workstream is:

- `Step 3 - Intent Harness`

But `Step 3` work must treat Step 2 as an already-frozen input boundary.
