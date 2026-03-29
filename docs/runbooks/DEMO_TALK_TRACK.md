# Demo Talk Track (One-Page)

## Opening (20–30s)
- “MAXshot 的核心是：Router 作为确定性调度器，所有执行都可审计、可回放。”
- “LLM 只做意图识别，不参与路由决策。”

## Step 1 — Ops 模板执行（1–2 min）
- 打开 `/ops`，可选展示 Intent Demo（自然语言 → intent）
- 选择 `latest_executions` 模板，填 `{ "limit": 3 }`
- 点击 **Create Execution** → `/confirmations` 中确认 → `/operations` 中 **Run**
- 关键点：人类确认（Human Gate）是写入与执行的唯一开关

## Step 2 — Audit 审计链（30–60s）
- 打开 `/audit?exec_id=...`
- 重点展示：
  - `entry_created` → `execution_confirmed` → `sql_template_*`
  - Router 路径与能力链记录

## Step 3 — Outcome（30–60s）
- 打开 `/outcome?exec_id=...`
- 展示结果与审计快照

## Optional A — Replay / Compare（30–60s）
- `/operations` 里点击 **Replay**
- `/outcome` 里填 `counterpart_execution_id` → Compare With

## Optional B — Writeback（30–60s）
- `/insight-writeback?exec_id=...`
- 填 `operator_id` + `confirm_token` → Approve & Write
- 关键点：写回严格人工审批，审计完整

## Closing (20–30s)
- “所有执行都可追踪、可回放、可解释。”
- “这就是合规与可控的 AI 执行链。”
