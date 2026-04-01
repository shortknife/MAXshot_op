---
name: faq-fallback
description: 当 FAQ 回答流程触发异常或低置信度时使用，指导 LLM 生成合规 fallback 文案并同步写回字段。
version: v0.1
status: MVP
product: Nexa
created: 2025-11-10
last_updated: 2025-11-23
---

# FAQ Fallback Skill v0.1（MVP）

> **⚠️ 重要说明**：本文档是 Nexa 产品的**架构设计文档**，是**开发实现的强制规范**。开发团队必须严格按照本文档执行，不能脱离 Skill 定义自行实现。

> **产品定位**：本 Skill 是 Nexa 产品架构的核心组件，定义了 FAQ Fallback 处理的触发条件、用户提示、字段写回、SLA 标记，与 PRD、FSD 等文档同等重要。

> **关联文档**：
> - M2 FAQ 引擎 FSD：`Sam-AIDeveloper/3.Design/M2_RAG_Pipeline_Draft_2025-11-09.md`
> - M2 Workflow FSD：`Alex-n8nExpert/3.Design/M2_Workflow_FSD_Alex.md`
> - M2 Prompt FSD：`John-PromptExpert/3.Design/M2_FAQ_Prompt_Strategy_Draft.md`

---

## 1. 触发条件
- RAG 无结果 (`retrieved_chunks` 为空或平均得分 < 0.55)。
- 生成模型连续失败或超时。
- Stage2 判定问题超出知识库范围。
- 输出格式校验失败、引用缺失或包含敏感内容。
- 渠道长度限制无法满足、需要转人工兜底。

## 2. 输出结构
```json
{
  "fallback_code": "f1",
  "user_message": "string",
  "manual_review_required": false,
  "faq_fallback_reason": "none",
  "notes": "string"
}
```
- `fallback_code`：`f1`~`f6`，对应 FSD 场景。
- `user_message`：面向终端用户的提示语。
- `manual_review_required`：是否需要人工兜底。
- `faq_fallback_reason`：`vector_oos`、`context_error`、`generation_fail`、`oos_secondary`、`format_fail`、`sensitive`、`channel_overflow` 等。
- `notes`：提供给 Dashboard/QA 的说明。

## 3. 场景指引
| 场景 | fallback_code | 触发说明 | 用户提示模板 | manual_review_required | 备注 |
|------|---------------|----------|--------------|-----------------------|------|
| F1 Vector OOS | `f1` | 检索无命中 | "抱歉，当前知识库暂无相关内容…" | false | 提供提交建议或客服引导 |
| F2 Context Error | `f2` | 重排、上下文归并失败 | "系统繁忙，请稍后再试…" | true | `notes` 记录错误类型 |
| F3 Generation Fail | `f3` | 主模型/降级模型均失败 | 同 F2，强调后台已记日志 | true | 标记 `faq_fallback_reason=generation_fail` |
| F4 OOS Secondary | `f4` | Stage2 判定超范围 | "抱歉，该问题不在服务范围…" | false | 可附上支持链接 |
| F5 Format Fail | `f5` | JSON/引用校验失败 | "系统繁忙，请稍后再试…" | true | `notes` 写明缺失字段 |
| F6 Sensitive | `f6` | 敏感或合规风险 | "内容涉及敏感信息，请联系人工…" | true | SLA 4 小时内响应 |
| Channel Overflow | `f5` | 渠道字数限制导致截断失败 | "内容较长，已提交人工处理…" | true | 同时标记 `faq_fallback_reason=channel_overflow` |

## 4. 输出编写规范
- 文案语言与用户输入语言保持一致，必要时提醒"暂仅支持简体中文/英文"。
- 避免承诺具体时间，统一使用"请稍后再试"或"稍后有专人联系"。
- 对需人工兜底的情况，`notes` 应包含：触发节点、时间戳、建议处理说明。
- 若触发敏感/安全场景，提醒用户联系客服或提供举报渠道。

## 5. 字段写回
- `faq_response_logs.fallback_code` ← `fallback_code`。
- `faq_response_logs.manual_review_flag` ← `manual_review_required`。
- `faq_response_logs.answer_body` ← `user_message`。
- `kb_ingest_jobs.metrics_json.faq_fallback_reason` ← `faq_fallback_reason`。
- `kb_ingest_jobs.metrics_json.manual_review_required` ← `manual_review_required`。
- 如有渠道裁剪失败，`metrics_json.channel_adaptation.format_warnings` 中追加对应项。

## 6. QA & SLA 提醒
- 当 `manual_review_required=true` 时，在 `notes` 中提供"建议人工操作步骤 + 再次上架条件"。
- 敏感场景（F6）优先级：4 小时内初步回应、24 小时完成；常规问题 24/72 小时。
- 所有 fallback 需在 Dashboard 标注 `faq_fallback_reason`，便于 Lily 团队抽检。

## 7. 与其他技能衔接
- `faq-answering` 若设置 `fallback.enabled=true`，需调用本技能统一生成提示文案。
- `faq-qa-review` 会基于写回字段判断是否创建人工处理任务。

---

**文档版本**: v0.1  
**最后更新**: 2025-11-23  
**维护者**: LEO (Product Manager)  
**迁移说明**: 本文档已从 `Knowledgebase/skills/faq-fallback/SKILL.md` 迁移到产品文档目录

