# MVP Scope And Limits (v5.1, Clarified)

> Updated: 2026-02-21

## In Scope

1. Business Query Copilot（主产品）
- 自然语言查询 MAXshot 业务事实（Vault、执行、指标、分配）。
- 输出：用户可读总结 + 证据来源（evidence）。
- 语言：跟随用户输入语言。

2. Marketing Copilot（次产品）
- 自然语言生成内容草稿。
- 支持最小改写（shorter / stronger_cta / casual）。
- 反馈闭环记录可追踪。

3. Admin Governance（控制面）
- Confirm / Run / Replay / Retry / Expire / Audit。
- 高风险动作 Human Gate。

4. Prompt 管理基线（本次新增）
- Prompt 线上读取：filesystem markdown（Git-managed, repo-first）。
- DB 不可用：允许只读 fallback 本地 CSV。
- 审计记录：`prompt_slug/prompt_version/prompt_source/prompt_hash`。

---

## Out of Scope

- 自动发布到外部渠道（生产级 TG/Notion 自动写入）。
- 无审批写入。
- 企业级 SSO/IAM 完整接入。
- 多租户控制平面。

---

## Product Boundaries

1. 禁止静默降级
- 业务查询失败时，不允许返回治理日志伪装业务答案。

2. 必须可追溯
- 客户可见业务结论必须携带来源证据。

3. Prompt 不硬编码
- 运行期 Prompt 必须来自 `filesystem markdown prompt docs，不接受散落 hardcode。

---

## MVP Acceptance

1. 业务问答
- 至少 2 条自然语言用例：
  - 1 条业务查询成功（含 evidence）
  - 1 条业务拒绝（含明确拒绝码和可读文案）

2. 治理链路
- 至少 1 次完整 `Entry -> Confirm -> Run -> Outcome -> Audit`。

3. Prompt 可用性
- DB 可用场景通过。
- DB 不可用时 fallback 通过且审计字段正确。

4. 自动化
- Phase All Smoke = PASS。
- UAT Final Report = PASS。
