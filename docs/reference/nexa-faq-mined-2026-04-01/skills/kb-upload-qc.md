# Skill: kb-upload-qc (Draft v0.1 · 2025-11-10)

> **⚠️ 重要说明**：本文档是 Nexa 产品的**架构设计文档**，是**开发实现的强制规范**。开发团队必须严格按照本文档执行，不能脱离 Skill 定义自行实现。

> **产品定位**：本 Skill 是 Nexa 产品架构的核心组件，定义了知识库上传和质检的完整流程、字段定义、异常处理，与 PRD、FSD 等文档同等重要。

> **关联文档**：
> - M1 AI Pipeline FSD：`Sam-AIDeveloper/3.Design/M1_AI_Pipeline_FSD_Sam.md`
> - M1 Data Architecture FSD：`Mike-DatabaseExpert/3.Design/M1_Data_Architecture_FSD_Mike.md`
> - M1 Workflow FSD：`Alex-n8nExpert/3.Design/M1_Workflow_FSD_Alex.md`
> - M1 QA Risk Control Summary：`Lily-QASpecialist/3.Design/M1_QA_Risk_Control_Summary_2025-11-09.md`

---

## 1. 目的
- 规范知识库上传后的轻量质检流程（Stage0/1/2），确保 Markdown 解析、Chunk 化、质检日志与通知一致。

## 2. 流程概览
1. **上传**：Web 控制台提交 Markdown（必填字段：`title`, `version`, `source_url`, `upload_owner`, `source_type`, `maintainer`, `last_reviewed_at`）。  
2. **解析**：Stage0/1 校验（Frontmatter、标题结构、空内容、基础敏感词）。  
3. **Chunk & Embedding**：按 `M1` 约定拆分并生成 embedding；LLM 重写超长片段。  
4. **Stage2 质检**：DeepSeek Lite/Qwen 校验语义一致性、低置信度；结果写入 `qc_result`, `metrics_json`.  
5. **写回**：  
   - `kb_ingest_jobs.qc_result` + `metrics_json`（包含 `ai_inference`, `channel_adaptation`, `timing`）。  
   - `kb_documents`, `kb_chunks`.  
   - 原始日志如需保存，写入 Supabase Storage (`kb-ingest-logs/{upload_batch_id}/...`).  
6. **通知**：Dashboard 显示成功/失败，失败时提示 `error_detail`, `remediation_hint`.  

## 3. Stage 校验要点
- **Stage0**: Frontmatter 完整性、必填字段。  
- **Stage1**: Markdown 结构、长度、自定义敏感词列表。  
- **Stage2**: LLM 对照原文，生成 `consistency` 分数；<0.8 → 阻断并写入 `manual_review_required=true`.  
- 所有失败场景需记录 `issue_codes`，待 QA 抽检使用。

## 4. 字段写入
| 字段 | 说明 | 备注 |
|------|------|------|
| `kb_ingest_jobs.qc_result` | Stage0/1/2 结果（JSON） | 包含 `stage`, `issue_codes`, `consistency`, `llm_model` |
| `kb_ingest_jobs.metrics_json` | `ai_inference`, `channel_adaptation`, `timing`, `manual_review_required` | 与 FAQ 指标结构对齐 |
| `kb_documents.backup_uri` | 旧版本备份路径（对象存储） | 整库覆盖前自动生成 |
| `kb_chunks` | `clean_text`, `embedding`, `metadata_json` | `metadata_json` 含 `heading_path`, `tags`, `chunk_hash`, `language` 等 |

## 5. 异常处理
- 解析失败 → `upload_format_error`，提示修正 Frontmatter。  
- Chunk 失败 → `chunking_failed`，记录 chunk 索引。  
- Embedding 写入失败 → `vector_write_failed`，重试后若仍失败通知运维。  
- LLM 质检失败 → `qa_check_failed`，阻断上线、Dashboard 提醒。

## 6. 通知与看板
- Dashboard 显示：上传人、版本、解析耗时、质检状态、失败原因。  
- 日报汇总：成功/失败次数、人工兜底待办。  
- 无即时告警（Slack/TG），纳入 P1。

## 7. TODO
- [ ] 提供样例 Markdown 与对应解析输出（Sam → John）。  
- [ ] Supabase Storage 日志命名规范（Sam 已在 FSD §5.4.1 提供，可复制）。  
- [ ] 考虑是否保留 `kb_chunk_quality_logs` (P1)。  

---

**文档版本**: v0.1  
**最后更新**: 2025-11-23  
**维护者**: LEO (Product Manager)  
**迁移说明**: 本文档已从 `Knowledgebase/3rdparty/skills/kb-upload-qc.md` 迁移到产品文档目录

