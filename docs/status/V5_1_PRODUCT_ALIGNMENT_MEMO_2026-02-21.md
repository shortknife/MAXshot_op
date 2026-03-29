# v5.1 Product Alignment Memo (For Review)

- Date: 2026-02-21
- Scope: `MAXshot_opencode` only
- Purpose: align product definition with MAXshot business-query reality

---

## 1) Clarified Product Definition

The v5.1 product should be interpreted as:

1. Primary product:
- Customer/operator asks natural language questions about MAXshot business logs and vault operations.
- System answers from business data (RPC + structured query + RAG), not only internal admin execution tables.

2. Secondary product:
- AI-assisted social/media operations (content generation, publishing, feedback loop).

3. Governance plane:
- Admin OS remains control/audit plane (confirm/run/replay/retry/expire), not the main customer value.

---

## 2) Why Alignment Was Needed

Observed gap:
- Current implementation over-indexed on `task_executions_op` governance flow.
- User value target is "query MAXshot business logs and vault facts".

Impact:
- User-facing correctness may drift from business data reality.
- PM/UAT scenarios become "system self-observation" instead of "business insight retrieval".

---

## 3) Reference Assets Copied (Curated)

Copied into:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows`

Included:

1. Query assistant:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/15_Telegram_Data_Query_Assistant_deploy_v0113.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/15_Telegram_Data_Query_Assistant_deploy_v0113_结构事实_v1.0.json`

2. Log ingestion:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/18_Native_Clean_Execution_Log_deploy_v2.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/18_Native_Clean_Execution_Log_deploy_v2_结构事实_v1.0.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/19_Morpho_Clean_Execution_Log_deploy_v2.00106.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/19_Morpho_Clean_Execution_Log_deploy_v2.00106_结构事实_v1.0.json`

3. Publishing:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/06_Single_Post_Executor_v3.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/13_Thread_Post_Executor_v4 0207.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/22_Master_Publisher_Router0207.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/workflows/23_Notion_Content_Generator_deploy_v1.0.json`

---

## 4) FSD Detailed Doc Change Memo (Proposed, Not Yet Applied)

### A. Product Intent and One-Pager

1. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/00_Read_First/00.1_One-Pager_System_Intent.md`

Proposed update:
- Explicitly define "business-log NL query" as primary user value.
- Demote Admin governance to "control plane".

2. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/00_Read_First/00.2_Core_Principles_And_Non-Goals.md`

Proposed update:
- Add principle: "Business data truth first; platform telemetry is secondary."
- Add non-goal: "Do not confuse governance telemetry with business insight."

### B. User Journey and Entry Separation

1. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/01_User_Journey/01.1_User_Journey_Map_Happy_Path.md`

Proposed update:
- Add primary journey: NL question -> classify -> business RPC/query -> answer + evidence.

2. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/01_User_Journey/01.2_User_Journey_Map_Rejection_Paths.md`

Proposed update:
- Add rejection classes for business query:
`out_of_business_scope`, `insufficient_business_data`, `unsafe_write_attempt`.

### C. Layer Boundaries

1. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/02_Layer_Model/02.1_Layer_Overview.md`

Proposed update:
- Split data domain into:
  - Business Data Plane (vault/execution/market/allocation facts)
  - Governance Data Plane (task execution/audit controls)

2. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/02_Layer_Model/02.4_Cross_Layer_Failure_Handling.md`

Proposed update:
- Add cross-plane fallback rule: business query must not silently fallback to governance-only answer.

### D. Execution and Intent

1. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/03_Execution_Model/03.1_Task_Definition.md`

Proposed update:
- Define task families:
`business_query`, `governance_action`, `content_operation`.

2. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/06_Intent_Analyzer/06.1_Intent_Analyzer_Capability_Spec_v1.0.md`

Proposed update:
- Clarify intent routing precedence:
business-query intents must target business RPC/query capabilities first.

### E. Observability

1. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/09_Observability/09.1_Log_Types_And_Schemas_v1.0.md`

Proposed update:
- Distinguish:
  - business_answer_audit (source RPC/table/evidence)
  - governance_audit (confirm/replay/retry/expire/write_blocked)

2. File:
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/09_Observability/09.2_Audit_Trails_v1.0.md`

Proposed update:
- Require "answer evidence provenance" for customer-facing business answers.

---

## 5) Immediate Implementation Implications

1. `/chat` should prioritize MAXshot business query capabilities.
2. `task_executions_op` should be treated as governance telemetry, not primary customer fact source.
3. Product acceptance should include business query correctness cases (vault list, execution detail, metrics summary).

---

## 6) Review Request

Please review this memo before we apply FSD file-by-file patches.
