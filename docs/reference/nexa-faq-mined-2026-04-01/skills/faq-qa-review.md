# Skill: faq-qa-review (Draft v0.1 · 2025-11-10)

> **⚠️ 重要说明**：本文档是 Nexa 产品的**架构设计文档**，是**开发实现的强制规范**。开发团队必须严格按照本文档执行，不能脱离 Skill 定义自行实现。

> **产品定位**：本 Skill 是 Nexa 产品架构的核心组件，定义了 FAQ 模块的 QA 抽检与人工兜底流程，与 PRD、FSD 等文档同等重要。

> **关联文档**：
> - M2 FAQ 引擎 FSD：`Sam-AIDeveloper/3.Design/M2_RAG_Pipeline_Draft_2025-11-09.md`
> - M2 QA FSD：`Lily-QASpecialist/3.Design/M2_QA_FSD_Lily.md`
> - M2 Workflow FSD：`Alex-n8nExpert/3.Design/M2_Workflow_FSD_Alex.md`

---

## 1. 目的
- 规范 FAQ 模块的 QA 抽检与人工兜底流程，统一触发条件、字段回写、SLA 与沟通话术。

## 2. 抽检触发条件
- 任一满足即写入待办：
  1. `metrics_json.manual_review_required = true`
  2. `faq_response_logs.fallback_code ∈ {generation_fail, sensitive_flag, context_error, format_fail, channel_overflow, low_confidence}`
  3. `kb_ingest_jobs.qc_override_flag = true`

## 3. 字段回写
| 字段 | 说明 | 给予者 |
|------|------|---------|
| `faq_response_logs.manual_review_flag` | 是否需人工介入 | Validator / QA |
| `metrics_json.manual_review_required` | 与上同步（布尔） | Validator |
| `metrics_json.faq_confidence` | 0-1 置信度，用于策略 | RAG/Prompt |
| `metrics_json.faq_fallback_reason` | Fallback 触发原因 | RAG/Validator |
| `faq_response_logs.assigned_reviewer` | QA 负责人 | Dashboard |
| `faq_response_logs.qa_due_at` | SLA 截止时间 | Dashboard/QA |

## 4. SLA 设置
- **高优** (敏感/LLM失败)：响应 ≤4h，处理 ≤24h。
- **普通** (低置信度/截断等)：响应 ≤24h，处理 ≤72h。
- Dashboard 显示：`faq_session_id`, `channel`, `fallback_code`, `manual_review_flag`, `assigned_reviewer`, `qa_due_at`.

## 5. QA 操作流程
1. 监控 Dashboard 待办 → 筛选高优先的记录。  
2. 复核问题/答案/引用 → 核实日志字段。  
3. 若确认需修复：  
   - 更新知识库或 Prompt；  
   - 在 `faq_response_logs` 写入处理结果（可用 `qc_result_ref` 补充备注）；  
   - 标记 `manual_review_flag=false` 并更新 `updated_at`.  
4. 超时风险：记录在 QA 风控文档，并 @LEO 协调资源。

## 6. 沟通话术（摘自 QA FSD）
- **高优**：`"该问题触发高等级风控，请在{deadline}前完成复核。"`
- **普通**：`"该问题触发常规抽检，请在{deadline}前完成处理。"`
- 处理结果反馈：`"已完成审核，结论：{result}，后续动作：{action}。"`

## 7. TODO
- [ ] Dashboard 展示字段与筛选条件确认（Alex）。  
- [ ] 追加 QA 抽检模板/Checklist 链接（Lily）。  
- [ ] 评估是否记录 QA 行为日志（P1 留白）。  

---

**文档版本**: v0.1  
**最后更新**: 2025-11-23  
**维护者**: LEO (Product Manager)  
**迁移说明**: 本文档已从 `Knowledgebase/3rdparty/skills/faq-qa-review.md` 迁移到产品文档目录

