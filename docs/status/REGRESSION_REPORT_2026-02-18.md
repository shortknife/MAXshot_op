# Regression Report — 2026-02-18

## Summary
- Overall: ✅ Pass (core chain + compare + KPI)
- Execution: `038f9159-8076-474c-aaf8-dc38658fe510`

## Steps & Evidence

### 1) Create → Confirm → Run
- execution_id: `038f9159-8076-474c-aaf8-dc38658fe510`
- result: ✅ Run completed

### 2) Audit Chain
Events observed:
- `entry_created`
- `execution_confirmed`
- `sql_template_executed`

### 3) Outcome Snapshot
- Snapshot header matches execution_id
- Result present

### 4) Compare
- counterpart_execution_id: `2af618f9-38f9-4109-a08f-790eb1fa28b1`
- delta_count: `22`
- direction: `explicit`

### 5) Audit KPI
- Failure Reasons (recent window):
  - `write_blocked_invalid_token`: 8
  - `Could not find the function public.sql_template_explain(params, sql) in the schema cache`: 6

## Notes
- Replay API returned snapshot payload; audit shows `execution_replay_requested` events.
- Failure Reasons include historical noise from earlier configuration attempts.

## Natural Language Auto Test (2026-02-19)

### Intent Analyze (5 cases)
- `给我最近7天执行状态汇总` -> `ops_summary` ✅
- `查最近20条审计事件` -> `audit_query` ✅
- `列出最近10条insight memory` -> `memory_query` ✅
- `帮我生成一个内容简介` -> `content_brief` ✅
- `这个产品的核心原理是什么` -> `product_qna` ✅

### End-to-End Cases
1. `content_brief` chain
- execution_id: `d10fe609-8d4b-4ee8-bc98-9bdd0f74ac7f`
- result: failed as expected (`missing_topic`)
- audit: `entry_created -> execution_confirmed -> capability_failed`

2. `ops_summary` chain
- execution_id: `ab59926d-586b-428a-960d-66ba07f9f5be`
- result: success
- audit contains: `sql_template_executed`

3. `audit_query` chain
- execution_id: `071ff55f-5b90-42bd-b6da-80ed41ed0cd1`
- result: success
- audit contains: `sql_template_executed`

4. `memory_query` chain
- execution_id: `dafa1f55-7fa9-4beb-bd61-2a8b4ce072b7`
- result: success
- audit contains: `sql_template_executed`
