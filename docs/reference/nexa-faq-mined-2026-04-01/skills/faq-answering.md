---
name: faq-answering
description: 在 FAQ 工作流中，当需要基于 M1 知识库检索并生成回答时启用，指导 LLM 完成检索摘要、回答生成、引用整理与字段写回指令。
version: v0.1
status: MVP
product: Nexa
created: 2025-11-10
last_updated: 2025-11-23
---

# FAQ Answering Skill v0.1（MVP）

> **⚠️ 重要说明**：本文档是 Nexa 产品的**架构设计文档**，是**开发实现的强制规范**。开发团队必须严格按照本文档执行，不能脱离 Skill 定义自行实现。

> **产品定位**：本 Skill 是 Nexa 产品架构的核心组件，定义了 FAQ 问答的 RAG + LLM 主流程，与 PRD、FSD 等文档同等重要。

> **关联文档**：
> - M2 FAQ 引擎 FSD：`Sam-AIDeveloper/3.Design/M2_RAG_Pipeline_Draft_2025-11-09.md`
> - M2 Workflow FSD：`Alex-n8nExpert/3.Design/M2_Workflow_FSD_Alex.md`
> - M2 Prompt FSD：`John-PromptExpert/3.Design/M2_FAQ_Prompt_Strategy_Draft.md`

---

## 1. 适用场景
- n8n `step1_RAGAnswer` 节点通过此技能调用 LLM，生成结构化回答草稿。
- 输入问题来自用户终端，知识来源限定为 `kb_chunks` 中 Top-K=3 的检索结果。
- 生成后的结构化结果传递给 `step2_OutputFormatter` 与 `step3_ChannelAdapter`。

## 2. 激活前提
- 必须已拿到：
  - `project_id`、`request_id`、`channel`、`question`。
  - 检索结果数组 `retrieved_chunks`，每项包含 `heading_path`、`content`、`source_url`、`chunk_hash`、`language`、`tags`。
  - `kb_ingest_jobs.metrics_json.ai_inference` 中需回写的字段清单。
- 若 `retrieved_chunks` 为空，改由 `faq-fallback` 技能处理（F1）。

## 3. 输出结构（JSON Schema）
```json
{
  "answer": "string",
  "confidence": 0.0,
  "citations": [
    {
      "label": "[来源1]",
      "url": "https://...",
      "chunk_hash": "..."
    }
  ],
  "channel_note": {
    "web": "string",
    "telegram": "string",
    "discord": "string",
    "twitter": "string"
  },
  "fallback": {
    "enabled": false,
    "reason": "none"
  },
  "notes": "string"
}
```
- `answer`：完整回答文本，包含 Markdown 引用占位。
- `confidence`：0-1 浮点，结合检索均值与 LLM 自评，默认阈值 0.80。
- `citations`：至少一条，`label` 需与正文引用对应。
- `channel_note`：为 `step3_ChannelAdapter` 提供多端裁剪参考（长度提示/重点句）。
- `fallback.enabled` 如为 `true`，需转交 `faq-fallback`。
- `notes`：补充给 QA/运营的说明（如敏感提示、模型降级记录）。

## 4. 生成步骤
1. **理解问题**：确认语言、渠道偏好、上下文；若问题包含敏感关键词，标记 `notes`。
2. **检索摘要**：对 Top-K=3 内容进行要点抽取，保留 `heading_path`、核心事实、关键参数。
3. **决策回答结构**：按照"直接回答 → 关键步骤/要点 → 延伸建议（如需）"组织，保持 3 段内完成。
4. **引用绑定**：正文每个事实段至少引用一条 `citations`，引用格式：
   - Web/Telegram/Discord: `[说明](url)`。
   - Twitter: 仅保留短链（交由适配节点注入）。
5. **置信度评估**：
   - 以检索得分均值为基础。
   - 若存在内容不确定、冲突、跨语言拼接，置信度 ≤0.7 并在 `notes` 标注原因。
6. **多端提示**：
   - `channel_note.web`：可直接沿用 `answer`。
   - `channel_note.telegram/discord`：输出 2-3 个要点句；控制在 400 字内。
   - `channel_note.twitter`：提供 ≤270 字的摘要 + 可选短链占位。
7. **字段校验**：
   - 确认 `answer` 中引用次序与 `citations` 数组一致。
   - 若生成失败或置信度<0.6，设置 `fallback.enabled=true`、`reason="low_confidence"`。

## 5. 写回要求
- 将以下信息写入 `faq_response_logs`：
  - `question`、`answer_body`、`channel`（原渠道）、`prompt_template`、`llm_model`。
  - `response_tokens_original`、`fallback_code`（若触发）。
- 同步更新 `kb_ingest_jobs.metrics_json.ai_inference`：
  - `model`、`prompt_template`、`temperature`、`max_output_tokens`、`retry_count`、`total_tokens`、`cost_usd`（如可估算）。
  - `faq_confidence` ← `confidence` 值。
  - `manual_review_required`：当 `confidence < 0.7` 或引用不足时设为 `true`。

## 6. 失败与降级策略
- 若 DeepSeek-V2 超时或报错：
  - 记录 `notes="primary_model_timeout"`，尝试 DeepSeek-Lite 再生成。
  - 如仍失败，返回 `fallback.enabled=true`，`reason="generation_fail"`。
- 若检索结果语言与问题不同，需在回答中注明来源语言并进行必要翻译。
- 严禁编造引用；若缺乏可靠信息，直接触发 F4（OOS）。

## 7. QA 对接
- 当 `manual_review_required=true` 时，在 `notes` 中提供建议处理方式或缺失信息说明。
- 对敏感或需人工确认的回答，建议追加 `notes="requires_manual_review"`，便于 Lily 团队识别。

---

**文档版本**: v0.1  
**最后更新**: 2025-11-23  
**维护者**: LEO (Product Manager)  
**迁移说明**: 本文档已从 `Knowledgebase/skills/faq-answering/SKILL.md` 迁移到产品文档目录

