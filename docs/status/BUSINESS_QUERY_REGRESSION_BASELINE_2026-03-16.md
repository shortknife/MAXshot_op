# Business Query Regression Baseline (2026-03-16)

## 1. Baseline Command

```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
BASE_URL=http://127.0.0.1:3003 RUN_E2E=true npm run release:preflight
```

## 2. Baseline Result

- release preflight: PASS
- phase0: 79/79
- phase1: 29/29
- phase2: 30/30
- e2e: 7/7
- UAT: PASS (`phase_report_stale=false`, `missing_artifacts=0`)

## 3. Capability Refactor Impact

### 3.1 What Changed
- `business_data_query` has been split into composable modules:
  - planner/runtime/provider/retry/freeform/normalizer/pipeline/output/contract
- Main file now focuses on orchestration and wiring.

### 3.2 What Stayed Stable
- API behavior and error codes remain compatible with existing smoke tests.
- Clarification flow (including follow-up context) remains unchanged by contract tests.
- Freeform SQL path keeps read-only guard + explain-cost guard.

### 3.3 Verified Risk Areas
- Follow-up conversation constraints (`api-22*`) stayed green.
- Yield clarification and correction flow (`api-15*`, `api-16*`) stayed green.
- Provider fallback path did not regress baseline tests.

## 4. Updated Reports

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/PHASE_ALL_SMOKE_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/UAT_FINAL_REPORT.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/docs/status/RELEASE_PREFLIGHT_REPORT.md`

## 5. Next Refactor Target

- Keep Contract v1 stable.
- Continue reducing orchestration glue in `business-data-query.ts` without changing external behavior.
