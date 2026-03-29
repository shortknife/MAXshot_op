> superseded_note: 自 2026-03-25 起，本文件保留为 v5.1 技术阶段基线，当前执行请改看 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/TECHNICAL_PLAN_V5.2_HARNESS_2026-03-25.md`

# 技术开发计划（对齐 v5.1 产品 MVP）

> 更新日期：2026-02-20
> 对齐文档：
> - /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/runbooks/MVP_PRODUCT_BRIEF.md
> - /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MVP_SCOPE_AND_LIMITS.md

---

## 1. 产品目标 -> 技术目标映射

1. Ops Copilot（查得准）
- 技术目标：自然语言查询 -> Router -> SQL Template -> 可读结果卡片

2. Marketing Copilot（发得快）
- 技术目标：自然语言生成 -> content_generator -> 草稿 + 改写动作

3. Admin Governance（可控）
- 技术目标：Confirm/Replay/Retry/Expire + Audit 可读化 + Failure Reason 聚合

---

## 2. 当前状态（基线）

## 已完成
- Router 主链路（Entry -> Confirm -> Run -> Outcome -> Audit）
- SQL template 执行与 EXPLAIN 预检（sql_template_explain_op）
- Admin 操作动作（confirm/run/replay/retry/expire）
- Outcome/Audit 基础页面与回归文档

## 待完成（MVP 产品化缺口）
- 缺独立用户入口（当前仍偏管理台交互）
- 错误语义未完全人话化（技术 JSON 暴露）
- Marketing 快捷改写动作未形成完整 UX
- 自动化 smoke 回归脚本未固化为一键执行

---

## 3. 执行计划（P0 优先）

## Phase P0-A：用户入口成型（Ops + Marketing）
1. 新增 `User Chat MVP` 页面
- 单输入框（自然语言）
- 输出两类卡片：查询结果卡、内容草稿卡
- 隐藏 operator_id / confirm_token / raw JSON

2. 意图分流与响应编排
- ops_summary/audit_query/memory_query -> data_fact_query
- content_brief -> content_generator
- product_qna -> product_doc_qna

3. 错误文案映射
- missing_topic / missing_slot / guard_fail / write_blocked_* -> 中文可读提示 + 下一步建议

## 验收
- 用户可跑通 2 条 case：
  - Case-1 查询成功
  - Case-2 内容生成成功（含至少 1 次改写）

---

## Phase P0-B：Admin 治理体验补齐
1. 统一导航
- ops / operations / outcome / audit 可互跳

2. 动作反馈统一
- replay/retry/expire 显示 mode + message + execution_id

3. 审计可读增强
- Failure reasons 默认按时间窗过滤
- 关键事件模板化展示（不强制看 JSON）

## 验收
- 管理员可完成：Confirm -> Run -> Replay，并在 Audit 看到完整链路

---

## Phase P0-C：回归自动化
1. 新增一键 smoke 脚本
- 覆盖：成功链路 + 拒绝链路
- 输出：execution_id、outcome、audit关键事件

2. 报告落盘
- 生成当日回归报告（md）

## 验收
- 一键回归通过率 >= 90%

---

## 4. P1（Marketing 策略闭环，MVP+）

1. 内容标签化（style/time/topic/channel）
2. 反馈记录（阅读/互动）
3. 简易归因与周期复盘

> 前提：P0 的用户可用性与审计稳定先达标。

---

## 5. 交付定义（MVP Beta）

交付完成时，系统应具备：
1. 用户侧：自然语言“问数+生文”可直接使用
2. 管理侧：关键动作有闸门、可审计、可回放
3. 工程侧：有可重复的一键回归

---

## 6. 不做项（本轮）

- TG/Notion 生产级接入
- 自动发布外部渠道
- 企业级 SSO/IAM 完整集成

---

## 7. 最新进度（2026-02-23）

1. 总体进度（技术）：`99%`
2. P0-A 用户入口：`100%`（自然语言问数 + 生文 + 改写 + 业务结果卡片化）
3. P0-B Admin 治理：`99%`（状态机禁用原因可视化 + 业务审计指标已入 Audit + 页面状态持久化）
4. P0-C 自动化回归：`100%`（新增 `test:all:with-dev`，可自动拉起服务后回归）
5. P1 Marketing 闭环：`78%`（反馈与周期报告已接入，页面结果卡片与回执已产品化）
6. P2 演进能力：`68%`（hypothesis/report 已可用，继续完善策略落地）

## 8. 剩余技术 TODO（按优先级）

1. 内容生成质量继续中文化（平台语气策略 + 模板迭代）
2. Data Query v2 平台化改造（Contract-first）
3. Provider 可插拔适配（template_provider / vanna_provider）
4. 澄清优先交互固化（vault/time/aggregation）

---

## 9. Data Query v2 执行口径（新增）

### 9.1 交互流程（产品主线）
1. 用户提问进入 `business_query(scope=yield/vault/execution...)`。
2. 先做槽位完整性检查，不完整时先澄清（最多 2 轮）。
3. APY 类问题默认澄清：`vault`、`时间范围`、`统计口径（平均/最高/最低）`。
4. 澄清阶段返回可选项（例如现有 vault 列表 + slug），不先写 SQL。
5. 槽位完整后再调用 SQL provider 生成 SQL 并执行。
6. 结果返回包含“我的理解是 …”声明，允许用户下一轮纠偏。

### 9.2 分工边界（平台 vs Provider）
- 系统层负责：澄清编排、候选项输出、Gate、审计、重试、降级、结果解释。
- Provider 层负责：在清晰问题上生成 SQL（及可选候选排序）。
- `Vanna` 定位：仅作为 `data_query` provider，不承担多轮澄清与产品文案职责。

### 9.3 Gate 增补（落地要求）
- 新增前置门禁：`ClarificationComplete=true` 前禁止调用 SQL provider。
- SQL 执行前必须通过只读与 explain 校验。
- 结果必须附 evidence；无 evidence 不得标记 success。

### 9.4 验收补充
- Case-A：`金库 APY 多少` 必须先触发澄清而不是直接查数。
- Case-B：用户纠偏 `不是平均是最高` 后仅更新口径并重算 SQL。
- Case-C：Provider 可切换（template/Vanna）且 API 契约不变。
