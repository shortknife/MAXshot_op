> superseded_note: 自 2026-03-25 起，本文件保留为 v5.1 历史计划，当前执行请改看 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/DEVELOPMENT_PLAN_V5.2_HARNESS_2026-03-25.md`

# MAXshot v5.1 开发计划（执行版，Prompt-DB 对齐）

> 版本：v5.1-plan-refresh-2
> 更新日期：2026-02-21
> 依据：
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.1_Small_Team_Growth_OS.md`
> - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/CLARIFIED_ADDENDUM_MEMO_2026-02-21.md`

---

## 1) MVP 目标（唯一对齐口径）

1. 主产品：自然语言查询 MAXshot 业务事实（Business Data Plane）。
2. 次产品：Marketing 内容生成/改写/反馈闭环。
3. 控制面：Admin OS 仅用于治理（Confirm/Run/Replay/Retry/Expire/Audit）。

硬约束：
- 业务查询不得静默降级为治理数据回答。
- 用户可见答案必须含来源证据。
- 输出语言跟随用户输入语言。
- Data Query 必须先澄清关键槽位，再调用 SQL provider。
- Vanna 仅作为 SQL 生成 provider，不承载多轮澄清和产品解释。

---

## 2) 当前状态

### 已完成
- P0/P1/P2 自动化回归通过（phase0/phase1/phase2 + lint）。
- Admin 治理链路可用（confirm/run/replay/retry/expire）。
- FSD 已新增 Clarified Addendum（不覆盖原文）。

### 本轮新增决策（已确认）
1. Prompt 线上读取固定走 Supabase `prompt_library`。
2. DB 不可用允许 fallback 到本地 CSV（只读）。
3. fallback 必须写审计：`prompt_source=fallback_csv`。

---

## 3) P0 剩余开发（按优先级）

### P0-A Business Query First（最高）
- 统一 intent 优先级：`business_query > governance_action > content_operation`。
- 业务问答接入 Business Data Plane（Vault/Execution/Metrics/Allocation）。
- 拒绝码落地：`out_of_business_scope` / `insufficient_business_data` / `source_not_connected` / `unsafe_write_attempt`。
- APY 问题默认走澄清优先：先确认 `vault + 时间范围 + 统计口径`。
- 澄清阶段可返回 vault 候选列表（slug），澄清完成后才生成 SQL。

**完成标准**
- 至少 3 个业务查询场景可用（列表/详情/汇总）。
- 无业务数据时明确拒绝，不返回治理伪答案。

### P0-B Prompt Registry（本轮重点）
- 新增 `PromptRegistry`：
  - 首选 `prompt_library`（Supabase）
  - 失败时 fallback 本地 CSV：
    `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/maxshot/prompts/prompt_library_rows0221.csv`
- 统一输出结构：`system_prompt`, `user_prompt_template`, `model_config`, `version`, `slug`。
- 审计补齐：`prompt_slug`, `prompt_version`, `prompt_source`, `prompt_hash`。

**完成标准**
- DB 可用路径与 fallback 路径都可跑通。
- 同一 query 的 prompt 版本可追溯。

### P0-C Answer Evidence Contract
- 统一答案契约：`summary + evidence`。
- evidence 最小字段：`data_plane/source_type/source_id/evidence_summary`。
- 缺 evidence 不得标记 success。
- 返回结果必须附“我的理解是 …”声明，支持下一轮口径纠偏。

**完成标准**
- 业务回答 100% 含证据字段。

### P0-D Observability 分层
- 拆分审计：`business_answer_audit` vs `governance_audit`。
- 增加失败聚合维度：业务拒绝码、prompt_source 分布。

**完成标准**
- Audit 页面能区分业务与治理事件。

---

## 4) P1 范围（Marketing）

- 继续沿用 PromptRegistry，不允许 hardcode prompt。
- 内容生成、改写、反馈回流的审计字段与业务问答同一规范。

---

## 5) 交付物

1. 代码：PromptRegistry + 路由优先级 + 拒绝语义 + evidence 契约。
2. 文档：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_SCOPE_AND_LIMITS.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/REGRESSION_TESTS.md`（追加 prompt DB/fallback 用例）
3. 报告：phase-all + UAT 最终报告（含 prompt_source 统计）。

---

## 6) 验收门槛

1. 用户自然语言业务查询：1 成功 + 1 拒绝（都可解释）。
2. 成功回答必须带证据来源字段。
3. Prompt 读取：DB-first 成功；断 DB 时 fallback 成功且审计标注。
4. 治理操作链路仍可用（Confirm/Run/Replay）。
5. 自动化回归全绿。
6. `金库 APY 多少` 场景必须先澄清后查数；用户纠偏口径后可直接重算。
