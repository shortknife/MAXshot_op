# M2 FAQ 编排 & AI 引擎 FSD（v1.4 Final）

> **发布日期**: 2025-11-10  
> **最后更新**: 2025-12-16  
> **责任人**: LEO (Product Manager)  
> **共创团队**: Sam (AI Dev) · John (Prompt) · Alex (n8n) · Mike (DB) · Lily (QA) · Cat (Technical Lead)

**更新记录**：
- v1.0 (2025-11-10): 初始版本
- v1.1 (2025-12-16): 产品部分更新（模块定位、与M2.5的关系、用户旅程、系统流程）
- v1.2 (2025-12-16): 技术设计确认完成（API接口设计、错误码定义、数据库设计、工作流实现、测试策略）
- v1.3 (2025-12-16): API Key管理设计确认完成（生成方式、格式规范、管理接口）
- v1.4 (2025-12-16): 数据库设计补充、工作流实现细节、测试策略章节补充完成

---

## 1. 目标与范围

### 1.1 模块定位

- **M2定位**：后端API服务层，提供FAQ问答核心服务
- **服务对象**：
  - M2.5（渠道配置与部署模块）：M2.5生成的客户端代码/Bot配置通过调用M2的API提供服务
  - 客户端（Widget/Bot）：终端用户通过M2.5配置的客户端使用FAQ服务
- **核心职责**：处理FAQ问答的核心逻辑（RAG检索、答案生成、超出范围检测、多端适配）
- **输出**：统一的RESTful API接口，供客户端调用
- **特点**：后端服务，不直接面向终端用户，通过API接口提供服务

### 1.2 与M2.5的关系

- **M2**：后端API服务，提供FAQ问答核心功能
- **M2.5**：前端配置界面，让客户配置和部署客户端（Widget/Bot）
- **依赖关系**：M2.5依赖M2，M2.5生成的客户端代码/Bot配置通过调用M2的API提供服务
- **开发顺序**：M2 → M2.5（M2必须先完成，M2.5才能开发）
- **架构关系**：
  ```
  客户（项目方）→ M2.5（配置界面）→ 生成客户端代码/Bot配置
  终端用户 → 客户端（Widget/Bot）→ 调用M2 API → 获得FAQ答案
  ```

### 1.3 产品目标

- **产品目标**: 在 MVP 阶段完成 FAQ 自动应答链路（检索 → 生成 → 检测 → 多端输出）的最小可用版本，确保知识库答案可控、安全、可追踪。  
- **范围聚焦**:
  - 单轮问答（不包含会话记忆）。
  - 数据来源限定为 M1 知识库（Markdown 上传 + RAG）。
  - 多端输出覆盖 Web / Telegram / Discord / Twitter，统一由 n8n 工作流调度。
  - QA 抽检与人工兜底复用 M1 `kb_ingest_jobs` 机制，不新建额外事件系统。
  - **API服务**：提供统一的RESTful API接口，供M2.5生成的客户端调用。
- **非目标（P1/P2 留白）**: FAQ 评分/点赞、主动推荐列表、FAQ Events/QA Review Logs 独立建表、实时推送告警、多模型自适应调度、个性化记忆、客户端部署和配置（属于M2.5）。

---

## 2. 用户旅程（MVP）

**说明**：以下用户旅程描述的是终端用户使用FAQ服务的完整流程。终端用户通过M2.5配置的客户端（Widget/Bot）使用服务，客户端通过调用M2的API接口获取FAQ答案。

| 步骤 | 触发者 | 主要动作 | 数据写入 | 备注 |
|------|--------|----------|----------|------|
| 0 | 客户（项目方） | 在M2.5 Dashboard中配置渠道（Widget/Bot） | M2.5配置数据 | 客户端部署和配置属于M2.5，不在M2范围内 |
| 1 | 终端用户 | 在任一渠道提问（通过M2.5配置的客户端） | 无 | 客户端调用M2 API，请求携带 `project_id`、`channel`、`question` |
| 2 | M2 API接口 | 接收客户端请求，Pre-Processing：归一化问题、生成 `request_id`、识别渠道配置 | n8n 内存态 | 若解析失败 → 返回通用错误 |
| 3 | M2 RAG 检索 | Top-K=3，阈值 0.80，必要时重排 | Supabase `kb_chunks` | 无结果 → 进入 F1 Fallback |
| 4 | M2 生成/检测 | DeepSeek-V2 + Stage2 OOS 校验 + Formatter | 不落库 | 失败触发 F2-F6 Fallback |
| 5 | M2 多端适配 | 依据渠道裁剪 / 模板输出 | `faq_response_logs`（写入） | 字符超限 → 记录 `manual_review_flag` |
| 6 | M2 API响应 | 返回JSON格式答案给客户端 | `kb_ingest_jobs.metrics_json` 更新 | 成功后展示引用与置信度 |
| 7 | 客户端展示 | 客户端接收答案并展示给终端用户 | 无 | 客户端实现属于M2.5生成的代码 |
| 8 | QA 兜底 | 当 `manual_review_flag=true` 或触发敏感/低置信度 | Dashboard 待办 | SLA：高优 4h、普通 24h |

---

## 3. 系统流程概览

### 3.1 API服务流程（产品视角）

```
终端用户
  ↓ 通过M2.5配置的客户端（Widget/Bot）提问
客户端（Widget/Bot）
  ↓ POST /webhook/faq/query (调用M2 API)
M2 API接口层（n8n Webhook）
  ↓ 解析请求（project_id、channel、question）
Pre-Processing（归一化、生成request_id）
  ↓
RAG检索（Top-K=3，阈值0.80）
  ↓
答案生成（DeepSeek-V2）
  ↓
超出范围检测（双重检测）
  ↓
多端适配（格式转换）
  ↓
响应返回（JSON格式）
  ↓
客户端接收并展示
  ↓
终端用户获得FAQ答案
```

### 3.2 工作流实现（技术实现，n8n）

**说明**：以下n8n工作流节点是M2 API服务的实现方式，API接口定义见第4.6节。

```
User Query
  └─► step0_PreProcess → 标准化/渠道识别/生成 request_id
        └─► step1_RAGAnswer → 检索(Top-K=3, 阈值0.80) + 可选重排 + DeepSeek 生成
              └─► step2_OutputFormatter → 结构化输出(JSON Schema)
                    └─► step3_ChannelAdapter → 渠道裁剪/模板应用
                          └─► step4_ResponseValidator → 格式/OOS/敏感校验
                                └─► step5_ResponseLogger → 写入 `faq_response_logs` + `metrics_json`
                                      └─► step6_ResponseReturn → 返回JSON响应给客户端
```

- 所有节点运行于 n8n，日志与指标写回 Supabase；未新增独立微服务。
- 若任一节点失败，统一写入 `fallback_code` 并触发人工兜底字段，避免静默失败。
- **API接口**：通过n8n Webhook提供RESTful API接口，供客户端调用。

---

## 4. 核心组件设计
### 4.1 AI Pipeline（Sam）
- **检索策略**: pgvector HNSW（m=16, ef_search=64），Top-K=3。无命中时立即返回 F1。
- **生成模型**: DeepSeek-V2（温度 0.2，max tokens 700，timeout 6s，重试 2 次）；失败时降级 DeepSeek Lite，再失败进入 F2/F3。
- **检测机制**:
  - Stage0/1: 规则校验（格式/引用）→ 硬阻断。
  - Stage2: 免费 LLM 进行 OOS/敏感判定（默认开启，可后台关闭但需标记人工兜底）。
  - Stage3/4: 敏感/事实检测默认关闭，仅保留占位。
- **Fallback 写入**: 在场景表中明确 `faq_response_logs.manual_review_flag`、`metrics_json.manual_review_required`、`metrics_json.faq_confidence`、`metrics_json.faq_fallback_reason` 的赋值规则。

### 4.2 Prompt 策略（John）
- **四层 Prompt**: Persona (200-260 tokens) / Style (100-140) / Behavior (120-180) / Dynamic Context (200-320)。
- **输出 Schema**: `answer` + `citations[]` + `confidence` + `channel` + `fallback` + `notes`。
- **多端模板**: Web/TG/Discord/Twitter 各三类兜底文案（超出范围、敏感、低置信度），变量包括 `support_url`、`short_link`、`related_links` 等。
- **引用规范**: Markdown 渠道使用 `[文本](url)`；Twitter 输出纯文本 + 短链；引用强制 ≥1 条，若无引用则返回拒答模板。

### 4.3 Workflow & Delivery（Alex）
- **节点顺序**: WebhookTrigger → ExtractAuth → ValidateApiKey → ParseRequest → RAGAnswer → OutputFormatter → ChannelAdapter → ResponseValidator → ResponseLogger → ResponseReturn。
- **认证流程**: 在`step0_WebhookTrigger`后添加`step0_5_ExtractAuth`（提取API Key）和`step0_6_ValidateApiKey`（验证API Key有效性）。
- **请求解析**: 在`step0_6_ValidateApiKey`后添加`step0_7_ParseRequest`（解析请求参数，验证必填参数和参数格式）。
- **多端裁剪**: `metrics_json.channel_adaptation` 记录动作（summarize/truncate/thread）；无法满足硬限制时标记 `manual_review_flag`。
- **失败回退**: 每个节点具备重试策略与兜底路径（详见节点写回草表）。
- **缓存策略**: Web 完整答案可复用至 TG/DC；Twitter 独立摘要，减少重复调用。
- **响应返回**: 使用`Respond to Webhook`节点返回JSON格式响应，根据错误码设置HTTP状态码。

**详细工作流实现**：见第11节

### 4.4 数据架构（Mike）
- **新增/扩展**:
  - `faq_response_logs`（jsonb 指标同 `metrics_json`）：记录问题、渠道、模型、裁剪策略、fallback、人工兜底标记等。
  - `kb_ingest_jobs.metrics_json` 扩展 `ai_inference`、`channel_adaptation`、`timing` 小节；不建立额外事件表。
  - **`api_keys`表**（新增）：API Key管理表，用于存储和管理API Key（哈希存储，支持过期时间、激活状态）。
  - **`api_request_logs`表**（新增）：请求日志表，用于记录API调用统计和追踪（包括成功和失败的请求）。
- **字段命名准则**: 与 Sam/Alex 文档保持一致，所有新字段在 FSD 中列出类型/默认值/写入来源，避免重复维护。
- **版本管理**: 仍采用"活跃版 + 上一版备份"，对象存储路径记录在 `kb_documents.backup_uri`。

**详细数据库设计**：见第10节

### 4.5 QA 机制（Lily）
- **抽检触发**: 当 `metrics_json.manual_review_required = true` 或 `faq_fallback_reason ∈ {llm_error, low_confidence, sensitive, channel_overflow}` 时，Dashboard 生成待办。
- **字段复用**: 继续使用 `kb_ingest_jobs.qc_override_flag` 标记人工兜底责任；FAQ 特有细项写入 `metrics_json` 与 `faq_response_logs`。
- **SLA**: 高优 4 小时初响 / 24 小时完结；普通 24 小时初响 / 72 小时完结。
- **测试关注**: Twitter 截断、引用缺失、敏感词命中、LLM 降级路线。

---

## 5. 数据结构细节
### 5.1 `faq_response_logs`
| 字段 | 类型 | 必填 | 默认 | 来源节点 | 说明 |
|------|------|------|------|----------|------|
| id | uuid | ✅ | gen_random_uuid() | DB | 主键 |
| project_id | uuid | ✅ | - | step1_RAGAnswer | 租户 ID |
| request_id | text | ✅ | - | step1_RAGAnswer | 流水追踪 |
| question | text | ✅ | - | Pre-Processing | 用户原始提问 |
| answer_body | text | ✅ | - | step3_ChannelAdapter | 最终答案（含截断） |
| answer_excerpt | text | ❌ | - | step3_ChannelAdapter | 280 字预览 |
| channel | text | ✅ | 'web' | step3_ChannelAdapter | `web/tg/discord/x` |
| prompt_template | text | ❌ | - | step1_RAGAnswer | Prompt 版本 |
| llm_model | text | ✅ | - | step1_RAGAnswer | 最终模型 |
| adaptation_strategy | text | ❌ | 'full' | step3_ChannelAdapter | full/summarize/thread |
| response_tokens_original | int | ❌ | 0 | step2_OutputFormatter | 原始 token |
| response_tokens_final | int | ❌ | 0 | step3_ChannelAdapter | 裁剪后 token |
| fallback_code | text | ❌ | 'none' | step3_ChannelAdapter | F1-F6 |
| manual_review_flag | boolean | ✅ | false | step4_ResponseValidator | 是否人工兜底 |
| qc_result_ref | jsonb | ❌ | '{}' | step4_ResponseValidator | 校验摘要 |
| created_at | timestamptz | ✅ | now() | DB | 写入时间 |

### 5.2 `metrics_json`（扩展段落）
```json
metrics_json = {
  "ai_inference": {
    "model": "deepseek-v2",
    "prompt_template": "faq_answer_v1",
    "temperature": 0.2,
    "max_output_tokens": 700,
    "retry_count": 1,
    "total_tokens": 860,
    "cost_usd": 0.0025
  },
  "channel_adaptation": {
    "channel": "twitter",
    "original_tokens": 820,
    "final_tokens": 118,
    "truncated": true,
    "actions": ["summarize", "truncate"],
    "link_injected": true,
    "format_warnings": ["markdown_stripped"]
  },
  "timing": {
    "retrieval_ms": 320,
    "generation_ms": 920,
    "adaptation_ms": 210,
    "total_ms": 1530
  },
  "faq_confidence": 0.62,
  "faq_fallback_reason": "low_confidence",
  "manual_review_required": true
}
```
- 字段含义：
  - `faq_confidence`：0-1 浮点值，来源于检索得分 + Stage2 判断。
  - `faq_fallback_reason`：`none/context_error/generation_fail/low_confidence/sensitive/channel_overflow` 等。
  - `manual_review_required`：布尔值，与 `manual_review_flag` 一致。

---

## 6. Fallback 与文案策略
| 场景 | 触发条件 | 用户提示（摘要） | 字段写入 | SLA |
|------|----------|------------------|----------|-----|
| F1 Vector OOS | Top-K 无命中 | 抱歉，知识库暂无相关内容 | `fallback_code=vector_oos`；`faq_confidence` 写入检索均值；`manual_review_required=false` | 无需人工 |
| F2 Context Error | 重排/拼接失败 | 系统繁忙，请稍后再试 | `fallback_code=context_error`；`faq_fallback_reason=context_error`；`manual_review_required=true` | 普通 |
| F3 Generation Fail | 主模型失败且降级无果 | 系统繁忙，请稍后再试 | 同上，标记 `generation_fail` | 高优 |
| F4 OOS Secondary | Stage2 判定超范围 | 抱歉，该问题不在范围内 | `manual_review_required=false` | 无需人工 |
| F5 Format Fail | JSON 校验失败 | 系统繁忙，请稍后再试 | `manual_review_required=true` | 普通 |
| F6 Sensitive | 敏感词命中 | 内容涉及敏感信息，请联系人工 | `faq_fallback_reason=sensitive`；`manual_review_required=true` | 高优（4h） |

- 文案详情与变量见 John §5；字段落点在 Sam/Alex/Mike 文档中已同步。

---

## 7. 指标与监控
- **Dashboard**（延续 M1）:
  - 上传成功率、解析耗时、质检通过率（按 `project_id` 聚合）。
  - FAQ 新增指标：
    - 每渠道请求量、fallback 次数、人工兜底次数、低置信度占比。
    - `manual_review_required=true` 的 SLA 统计（4h/24h & 24h/72h）。
- **告警策略**: MVP 阶段仅提供 Dashboard + 日汇总报表；Slack/邮件/TG 推送置于 P1。
- **采样/QA**: QA 根据 `faq_fallback_reason` 和 `manual_review_required` 制定抽检计划；敏感事件由 Lily 团队汇总。

---

## 8. 风险与缓解
| 编号 | 风险 | 影响 | 缓解措施 | 责任人 |
|------|------|------|----------|--------|
| R1 | DeepSeek 免费额度不足 | 质检或生成链路中断 | 监控调用量；超限时自动降级 Lite 或人工兜底提示 | Sam
| R2 | Twitter 字数超限频繁触发人工兜底 | 工程/QA 负担增加 | 优先尝试 summarize；若长尾需求大，转入 P1 讨论 thread 方案 | Alex/John
| R3 | 引用缺失或路径错误 | 品控失真 | 在 Prompt 层强制引用校验；失败即 fallback | John/Sam
| R4 | QA 待办积压 | SLA 失效 | Dashboard 标记 `manual_review_required` 并定期复盘；若溢出，考虑 P1 引入自动提醒 | Lily
| R5 | 字段命名漂移 | 多模块集成失败 | 本 FSD 冻结字段表，禁止会后擅自改名；变更需记录于 M2 变更日志 | 全员
| R6 | API接口设计不明确 | M2.5开发受阻 | 尽快确认API接口设计，补充到FSD中 | Sam/Alex/Cat

---

## 9. API接口设计（已确认）

**说明**：以下API接口设计已由技术团队（Sam、Alex、Cat）确认。详细讨论记录见：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md`

### 9.1 统一FAQ查询接口

**接口路径**: `/webhook/faq/query`  
**HTTP方法**: POST  
**Content-Type**: `application/json`  
**认证方式**: API Key（通过Header传递：`Authorization: Bearer {api_key}`）

**确认依据**：
- ✅ Cat建议：与M0模块保持一致，使用`/webhook`前缀，POST方法
- ✅ Alex确认：n8n Webhook路径配置一致
- ✅ Sam确认：符合RESTful API标准，便于前端统一处理

### 9.2 请求格式

**请求Header**：
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**请求体**（必需参数）：
```json
{
  "project_id": "uuid",
  "channel": "web|tg|discord|x",
  "question": "用户提问内容"
}
```

**请求体**（可选参数）：
```json
{
  "project_id": "uuid",
  "channel": "web",
  "question": "用户提问内容",
  "user_id": "optional_user_id",
  "session_id": "optional_session_id",
  "metadata": {
    "source": "widget",
    "user_agent": "..."
  }
}
```

**参数说明**：
| 参数名称 | 类型 | 必填 | 说明 | 示例 |
|---------|------|------|------|------|
| `project_id` | uuid | ✅ | 项目ID（关联`projects.id`） | `"123e4567-e89b-12d3-a456-426614174000"` |
| `channel` | string | ✅ | 渠道标识（`web|tg|discord|x`） | `"web"` |
| `question` | string | ✅ | 用户提问内容（非空，最大长度待定） | `"如何使用产品？"` |
| `user_id` | string | ❌ | 终端用户ID（用于统计） | `"user_123"` |
| `session_id` | string | ❌ | 会话ID（用于追踪） | `"session_456"` |
| `metadata` | object | ❌ | 其他元数据 | `{"source": "widget"}` |

**确认依据**：
- ✅ Cat建议：基础请求参数（`project_id`、`channel`、`question`）+ 可选参数（`user_id`、`session_id`、`metadata`）
- ✅ Sam确认：请求参数结构清晰，便于前端TypeScript类型定义
- ✅ Alex确认：请求解析实现方式

### 9.3 响应格式

**成功响应**（HTTP 200）:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "answer": "FAQ答案内容",
    "citations": ["引用1", "引用2"],
    "confidence": 0.85,
    "fallback_code": "none|F1|F2|F3|F4|F5|F6",
    "manual_review_required": false,
    "request_id": "uuid",
    "timing": {
      "total_ms": 1234,
      "rag_ms": 500,
      "generation_ms": 700
    },
    "model": "deepseek-v2"
  }
}
```

**失败响应**（HTTP 400/401/403/500/503/504）:
```json
{
  "code": 400|401|403|500|503|504,
  "message": "error message",
  "error_code": "M2_ERR_XXX",
  "data": null
}
```

**响应字段说明**：
| 字段名称 | 类型 | 说明 | 示例 |
|---------|------|------|------|
| `code` | number | HTTP状态码 | `200` |
| `message` | string | 响应消息 | `"success"` |
| `data` | object\|null | 响应数据（失败时为null） | `{...}` |
| `data.answer` | string | FAQ答案内容 | `"根据知识库..."` |
| `data.citations` | array | 引用列表 | `["引用1", "引用2"]` |
| `data.confidence` | number | 置信度（0-1） | `0.85` |
| `data.fallback_code` | string | Fallback场景代码 | `"none"` |
| `data.manual_review_required` | boolean | 是否需要人工审核 | `false` |
| `data.request_id` | string | 请求ID（用于追踪） | `"uuid"` |
| `data.timing` | object | 性能指标 | `{"total_ms": 1234}` |
| `data.model` | string | 使用的模型 | `"deepseek-v2"` |
| `error_code` | string | 错误码（失败时） | `"M2_ERR_AUTH_001"` |

**确认依据**：
- ✅ Cat建议：成功响应包含`answer`、`citations`、`confidence`、`fallback_code`、`manual_review_required`、`request_id`、`timing`、`model`
- ✅ Sam确认：响应字段完整，便于前端展示和性能监控
- ✅ Alex确认：响应格式实现方式

### 9.4 错误码定义

**错误码命名规范**：`M2_ERR_{分类}_{编号}`

**分类说明**：
- `AUTH`：认证相关错误
- `API`：API请求参数错误
- `FALLBACK`：Fallback场景错误
- `SYS`：系统错误

**错误码列表**：

#### 9.4.1 认证错误（`M2_ERR_AUTH_XXX`）

| 错误码 | 错误场景 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `M2_ERR_AUTH_001` | API Key无效 | 401 | API Key不存在或格式错误 |
| `M2_ERR_AUTH_002` | API Key已过期 | 401 | API Key的`expires_at`已过期 |
| `M2_ERR_AUTH_003` | API Key未激活 | 401 | API Key的`is_active=false` |
| `M2_ERR_AUTH_004` | API Key与project_id不匹配 | 403 | API Key不属于该project |
| `M2_ERR_AUTH_005` | 缺少Authorization Header | 401 | 请求中未提供`Authorization: Bearer {api_key}` |

#### 9.4.2 API请求参数错误（`M2_ERR_API_XXX`）

| 错误码 | 错误场景 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `M2_ERR_API_001` | 缺少必填参数`project_id` | 400 | 请求体中缺少`project_id`字段 |
| `M2_ERR_API_002` | 缺少必填参数`channel` | 400 | 请求体中缺少`channel`字段 |
| `M2_ERR_API_003` | 缺少必填参数`question` | 400 | 请求体中缺少`question`字段 |
| `M2_ERR_API_004` | `project_id`格式错误 | 400 | `project_id`不是有效的UUID格式 |
| `M2_ERR_API_005` | `channel`值无效 | 400 | `channel`不在允许的值列表中（`web|tg|discord|x`） |
| `M2_ERR_API_006` | `question`为空或过长 | 400 | `question`为空字符串或超过最大长度限制 |

#### 9.4.3 Fallback场景错误（`M2_ERR_FALLBACK_XXX`）

**注意**：Fallback场景虽然触发错误码，但**HTTP状态码仍为200**（因为返回了默认答案，服务正常完成），错误码用于标识Fallback原因。

| 错误码 | Fallback场景 | HTTP状态码 | 说明 |
|--------|------------|-----------|------|
| `M2_ERR_FALLBACK_F1` | F1: Vector OOS | 200 | 向量检索无结果（超出范围），返回默认答案 |
| `M2_ERR_FALLBACK_F2` | F2: Context Error | 200 | 上下文构建失败，返回默认答案 |
| `M2_ERR_FALLBACK_F3` | F3: Generation Fail | 200 | 答案生成失败，返回默认答案 |
| `M2_ERR_FALLBACK_F4` | F4: OOS Secondary | 200 | 二次OOS检测失败，返回默认答案 |
| `M2_ERR_FALLBACK_F5` | F5: Format Fail | 200 | 格式校验失败，返回默认答案 |
| `M2_ERR_FALLBACK_F6` | F6: Sensitive | 200 | 敏感内容检测失败，返回默认答案 |

#### 9.4.4 系统错误（`M2_ERR_SYS_XXX`）

| 错误码 | 错误场景 | HTTP状态码 | 说明 |
|--------|---------|-----------|------|
| `M2_ERR_SYS_001` | 服务不可用 | 503 | n8n工作流服务不可用 |
| `M2_ERR_SYS_002` | 请求超时 | 504 | 请求处理超时（超过30秒） |
| `M2_ERR_SYS_003` | 数据库连接失败 | 503 | Supabase数据库连接失败 |
| `M2_ERR_SYS_004` | AI服务不可用 | 503 | DeepSeek API服务不可用 |
| `M2_ERR_SYS_005` | 内部错误 | 500 | 未预期的内部错误 |

**确认依据**：
- ✅ Cat建议：使用`M2_ERR_{分类}_{编号}`格式，涵盖认证错误、API请求参数错误、Fallback场景错误、系统错误
- ✅ Sam确认：错误码格式统一，便于前端统一处理
- ✅ Alex确认：错误码实现方式

**参考文档**：
- 详细错误码定义：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md` §2.2

---

### 9.5 API Key管理（已确认）

**说明**：以下API Key管理设计已由产品团队（LEO）确认。详细讨论记录见：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md`

#### 9.5.1 API Key生成方式

**决策**：采用混合方案（M2.5 Dashboard生成 → M2 API创建）

**用户交互流程**：
1. **用户在M2.5 Dashboard中操作**：
   - 进入"API Key管理"页面
   - 点击"创建API Key"按钮
   - 填写API Key信息（名称、过期时间、环境类型等）
   - 点击"确认创建"

2. **M2.5 Dashboard调用M2 API**：
   - 前端调用M2 API接口：`POST /webhook/api-keys/create`
   - 请求体包含：`project_id`、`name`、`expires_at`、`environment`（live/test）等
   - 请求携带用户Token（M0认证）

3. **M2 API处理逻辑**（n8n工作流）：
   - 验证用户Token和权限（确保用户有权限为该project创建API Key）
   - 生成API Key（使用UUID v4，格式：`sk_live_`或`sk_test_`前缀 + 32位随机字符串）
   - 使用bcrypt（轮数10）哈希存储到`api_keys`表
   - 返回API Key明文给前端（**仅此一次显示，后续无法再查看**）

4. **M2.5 Dashboard展示**：
   - 前端接收API Key明文
   - 在界面上显示API Key（**仅显示一次，提示用户保存**）
   - 提供"复制"按钮，方便用户复制API Key
   - 提供"已保存"确认按钮，用户确认后不再显示明文

**确认依据**：
- ✅ LEO产品设计决策：混合方案，职责分离清晰
- ✅ 用户体验：界面操作直观，API Key明文仅显示一次
- ✅ 安全性：API Key生成逻辑集中在M2 API，便于统一管理和安全控制

#### 9.5.2 API Key格式

**格式规范**：`sk_{environment}_{random_string}`

**前缀**：
- `sk_live_`：生产环境API Key（用于正式环境）
- `sk_test_`：测试环境API Key（用于测试环境）

**随机字符串**：32位随机字符串（使用UUID v4生成，去除连字符）

**总长度**：约40-45字符（`sk_live_`或`sk_test_` + 32位随机字符串）

**示例**：
- 生产环境：`sk_live_<32_char_example>`
- 测试环境：`sk_test_<32_char_example>`

**格式验证规则**（M2 API需要实现）：
- **前缀验证**：API Key必须以`sk_live_`或`sk_test_`开头
- **长度验证**：API Key总长度必须为40-45字符
- **字符验证**：随机字符串部分只能包含小写字母和数字（a-z, 0-9）
- **格式验证失败**：返回错误码`M2_ERR_AUTH_001`（API Key无效）

**环境类型管理**：
- **环境类型字段**：`api_keys.environment`字段（`live`或`test`）
- **环境类型与前缀对应**：
  - `environment = 'live'` → 前缀`sk_live_`
  - `environment = 'test'` → 前缀`sk_test_`
- **环境类型验证**：创建API Key时，环境类型必须与前缀匹配

**确认依据**：
- ✅ LEO产品设计决策：使用`sk_live_`、`sk_test_`前缀，便于识别环境
- ✅ 行业标准：参考Stripe、OpenAI等主流API服务商的API Key格式
- ✅ 安全性：前缀可以帮助用户识别API Key类型，避免在生产环境使用测试API Key

#### 9.5.3 M2 API接口设计（API Key管理）

**接口路径**：`/webhook/api-keys/create`（或`/webhook/api-keys`，使用POST方法）  
**HTTP方法**：POST  
**Content-Type**：`application/json`  
**认证方式**：JWT Token（M0认证，通过Header传递：`Authorization: Bearer {token}`）

**请求格式**：
```json
{
  "project_id": "uuid",
  "name": "string",
  "expires_at": "timestamp" | null,
  "environment": "live" | "test"
}
```

**请求参数说明**：
| 参数名称 | 类型 | 必填 | 说明 | 示例 |
|---------|------|------|------|------|
| `project_id` | uuid | ✅ | 项目ID（关联`projects.id`） | `"123e4567-e89b-12d3-a456-426614174000"` |
| `name` | string | ✅ | API Key名称（用于标识） | `"Production API Key"` |
| `expires_at` | timestamp\|null | ❌ | 过期时间（`null`表示永不过期） | `"2026-12-31T23:59:59Z"` |
| `environment` | string | ✅ | 环境类型（`live`或`test`） | `"live"` |

**响应格式**（成功）：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "api_key": "sk_live_<32_char_example>",
    "api_key_id": "uuid",
    "name": "string",
    "expires_at": "timestamp" | null,
    "created_at": "timestamp"
  }
}
```

**响应格式**（失败）：
```json
{
  "code": 400|401|403|500,
  "message": "error message",
  "error_code": "M2_ERR_XXX",
  "data": null
}
```

**错误码**：
- `M2_ERR_AUTH_001`：用户Token无效或过期
- `M2_ERR_AUTH_004`：用户无权限为该project创建API Key
- `M2_ERR_API_001`：缺少必填参数`project_id`
- `M2_ERR_API_002`：缺少必填参数`name`
- `M2_ERR_API_003`：缺少必填参数`environment`
- `M2_ERR_API_004`：`project_id`格式错误
- `M2_ERR_API_005`：`environment`值无效（必须是`live`或`test`）

**安全考虑**：
- **API Key明文仅返回一次**：创建成功后，API Key明文只返回给前端一次，后续无法再查看
- **哈希存储**：API Key在数据库中只存储哈希值（bcrypt，轮数10），不存储明文
- **权限控制**：只有project的owner或admin才能创建API Key
- **审计日志**：记录API Key创建操作（谁创建、何时创建、为哪个project创建）

**确认依据**：
- ✅ LEO产品设计决策：API Key管理接口设计
- ✅ 需要Alex实现：n8n工作流实现API Key创建逻辑
- ✅ 需要M2.5设计：M2.5 Dashboard实现API Key管理界面

**参考文档**：
- 详细讨论记录：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md` §问题1、问题3

---

## 10. 数据库设计补充（Mike参考）

**说明**：以下数据库设计已由技术团队（Mike、Cat）确认。详细设计文档见：`/Mike-DatabaseExpert/5.Collaboration/M2_Database_Design_Supplement_Mike_2025-12-16.md`

### 10.1 API Key管理表（`api_keys`）

#### 10.1.1 表设计概述

**表名**: `api_keys`

**用途**: 存储和管理M2 API的API Key，支持API Key认证和权限控制

**MVP需求**：
- 存储API Key（哈希存储）
- 关联project_id（多租户隔离）
- 支持过期时间（expires_at）
- 支持激活/禁用（is_active）
- 记录创建时间和最后使用时间

#### 10.1.2 字段定义

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `id` | uuid | ✅ | gen_random_uuid() | 主键 |
| `project_id` | uuid | ✅ | - | 关联项目ID（外键：`projects.id`） |
| `key_hash` | text | ✅ | - | API Key哈希值（bcrypt，不存储明文） |
| `key_prefix` | text | ✅ | - | API Key前缀（如`sk_live_`、`sk_test_`），用于识别环境 |
| `name` | text | ❌ | - | API Key名称（用户自定义，便于管理） |
| `description` | text | ❌ | - | API Key描述（用户自定义） |
| `expires_at` | timestamptz | ❌ | NULL | 过期时间（NULL表示永不过期） |
| `is_active` | boolean | ✅ | true | 是否激活（false表示已禁用） |
| `last_used_at` | timestamptz | ❌ | NULL | 最后使用时间（用于统计和监控） |
| `created_at` | timestamptz | ✅ | now() | 创建时间 |
| `updated_at` | timestamptz | ✅ | now() | 更新时间 |
| `created_by` | uuid | ❌ | - | 创建者ID（关联`users.id`，可选） |

**字段说明**：
- **`key_hash`**：存储API Key的bcrypt哈希值，不存储明文（安全性要求）
- **`key_prefix`**：存储API Key的前缀（如`sk_live_`、`sk_test_`），用于识别环境，便于日志和监控
- **`expires_at`**：支持过期时间，但允许设置为`NULL`（永不过期）
- **`is_active`**：支持激活/禁用，便于临时禁用API Key而不删除

#### 10.1.3 约束和索引

**主键约束**：
- `PRIMARY KEY (id)`

**外键约束**：
- `FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`
  - 说明：项目删除时，关联的API Key自动删除

**唯一约束**：
- `UNIQUE (project_id, key_prefix, key_hash)`
  - 说明：确保同一项目下不会重复创建相同的API Key

**检查约束**：
- `CHECK (key_prefix IN ('sk_live_', 'sk_test_'))`
  - 说明：限制key_prefix的值（MVP阶段只支持live和test环境）

**索引**：
- `CREATE INDEX idx_api_keys_project_id ON api_keys(project_id)`
  - 用途：用于按项目查询API Key列表
  
- `CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash)`
  - 用途：用于API Key验证（快速查找）
  
- `CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true`
  - 用途：用于查询激活的API Key（部分索引，提高查询性能）

#### 10.1.4 RLS策略概述

**RLS策略**：
- **SELECT策略**：支持project_id上下文和认证用户两种方式
- **INSERT策略**：支持project_id上下文和认证用户两种方式
- **UPDATE策略**：支持project_id上下文和认证用户两种方式
- **DELETE策略**：支持project_id上下文和认证用户两种方式

**说明**：RLS策略考虑所有调用场景（前端REST API、n8n工作流、后端API），使用灵活的访问控制机制。

**详细策略**：见Mike的数据库设计文档 `/Mike-DatabaseExpert/5.Collaboration/M2_Database_Design_Supplement_Mike_2025-12-16.md` §1.4

---

### 10.2 请求日志表（`api_request_logs`）

#### 10.2.1 表设计概述

**表名**: `api_request_logs`

**用途**: 记录M2 API的请求日志，用于API调用统计、性能监控和问题追踪

**MVP需求**：
- 记录请求基本信息（project_id、channel、question）
- 记录响应信息（response_time、status_code、error_code）
- 记录性能指标（timing字段）
- 记录Fallback场景（fallback_code）
- 支持按项目、渠道、时间范围查询

#### 10.2.2 字段定义

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `id` | uuid | ✅ | gen_random_uuid() | 主键 |
| `project_id` | uuid | ✅ | - | 关联项目ID（外键：`projects.id`） |
| `request_id` | text | ✅ | - | 请求ID（用于追踪，与响应中的`request_id`一致） |
| `api_key_id` | uuid | ❌ | - | 关联API Key ID（外键：`api_keys.id`，可选） |
| `channel` | text | ✅ | - | 渠道（`web|tg|discord|x`） |
| `question` | text | ✅ | - | 用户原始提问 |
| `user_id` | text | ❌ | - | 终端用户ID（可选，用于统计） |
| `session_id` | text | ❌ | - | 会话ID（可选，用于追踪） |
| `http_method` | text | ✅ | 'POST' | HTTP方法（默认POST） |
| `http_status_code` | int | ✅ | - | HTTP状态码（200、400、401、500等） |
| `error_code` | text | ❌ | - | 错误码（如`M2_ERR_AUTH_001`、`M2_ERR_FALLBACK_F1`等） |
| `fallback_code` | text | ❌ | 'none' | Fallback场景（`none|F1|F2|F3|F4|F5|F6`） |
| `response_time_ms` | int | ❌ | - | 响应时间（毫秒，总耗时） |
| `timing_json` | jsonb | ❌ | '{}' | 性能指标（JSON格式，包含各阶段耗时） |
| `metadata_json` | jsonb | ❌ | '{}' | 其他元数据（JSON格式，如`user_agent`、`source`等） |
| `created_at` | timestamptz | ✅ | now() | 请求时间 |

**字段说明**：
- **`request_id`**：请求ID，与响应中的`request_id`一致，用于追踪和关联
- **`api_key_id`**：关联API Key ID，用于统计API Key使用情况（可选）
- **`error_code`**：错误码，用于统计错误类型
- **`fallback_code`**：Fallback场景，用于统计Fallback触发频率
- **`response_time_ms`**：响应时间（毫秒），用于性能监控
- **`timing_json`**：性能指标（JSON格式），包含各阶段耗时（如`retrieval_ms`、`generation_ms`、`adaptation_ms`、`total_ms`）

#### 10.2.3 约束和索引

**主键约束**：
- `PRIMARY KEY (id)`

**外键约束**：
- `FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`
  - 说明：项目删除时，关联的请求日志自动删除
- `FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL`
  - 说明：API Key删除时，关联的请求日志的`api_key_id`设置为NULL（保留日志记录）

**检查约束**：
- `CHECK (channel IN ('web', 'tg', 'discord', 'x'))`
  - 说明：限制channel的值
- `CHECK (fallback_code IN ('none', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'))`
  - 说明：限制fallback_code的值
- `CHECK (http_status_code >= 200 AND http_status_code < 600)`
  - 说明：限制http_status_code的范围

**索引**（Cat建议的3个主要索引）：

- **主查询索引**：
  ```sql
  CREATE INDEX idx_api_request_logs_project_created 
  ON api_request_logs(project_id, created_at DESC);
  ```
  - 用途：用于Dashboard按项目和时间范围查询（最常见的查询场景）

- **统计查询索引**：
  ```sql
  CREATE INDEX idx_api_request_logs_channel_created 
  ON api_request_logs(channel, created_at DESC);
  ```
  - 用途：用于按渠道统计查询（如按Telegram、Discord等渠道统计）

- **错误分析索引**：
  ```sql
  CREATE INDEX idx_api_request_logs_error_created 
  ON api_request_logs(error_code, created_at DESC) 
  WHERE error_code IS NOT NULL;
  ```
  - 用途：用于错误分析和问题排查（只索引有错误码的记录，减少索引大小）

**其他索引**：
- `CREATE INDEX idx_api_request_logs_request_id ON api_request_logs(request_id)`（唯一索引）
- `CREATE INDEX idx_api_request_logs_fallback_code ON api_request_logs(fallback_code) WHERE fallback_code != 'none'`（部分索引）

#### 10.2.4 RLS策略概述

**RLS策略**：
- **SELECT策略**：支持project_id上下文和认证用户两种方式
- **INSERT策略**：支持project_id上下文和认证用户两种方式（n8n工作流写入）

**说明**：RLS策略考虑所有调用场景（前端REST API、n8n工作流、后端API），使用灵活的访问控制机制。

**详细策略**：见Mike的数据库设计文档 `/Mike-DatabaseExpert/5.Collaboration/M2_Database_Design_Supplement_Mike_2025-12-16.md` §2.4

---

### 10.3 表关系说明

**外键关系**：
- `api_keys.project_id` → `projects.id`（外键，CASCADE删除）
- `api_request_logs.project_id` → `projects.id`（外键，CASCADE删除）
- `api_request_logs.api_key_id` → `api_keys.id`（外键，SET NULL删除）

**关联关系**：
- `api_request_logs.request_id` = `faq_response_logs.request_id`（可选关联，不是强制外键）
  - 说明：`api_request_logs`记录所有API请求（包括失败的），`faq_response_logs`只记录成功的FAQ响应
  - 数据写入时机：
    - `api_request_logs`：在请求开始时写入（记录所有请求）
    - `faq_response_logs`：在响应完成时写入（仅记录成功的响应）

---

### 10.4 技术实现要点

**API Key哈希存储**：
- 使用bcrypt算法，哈希轮数10
- 生成API Key时：在M2.5 Dashboard或M2 API中生成API Key后，使用bcrypt（轮数10）哈希存储到`api_keys.key_hash`字段
- 验证API Key时：在n8n工作流的`step0_6_ValidateApiKey`节点中，使用bcrypt.compare()比较请求中的API Key与数据库中的`key_hash`

**日志保留时间**：
- 保留时间：90天（MVP阶段）
- 清理策略：使用PostgreSQL的定时任务（pg_cron扩展）或Supabase的Scheduled Functions，每天凌晨执行清理任务
- 清理SQL：`DELETE FROM api_request_logs WHERE created_at < NOW() - INTERVAL '90 days'`

**索引优化**：
- MVP阶段优先使用索引，不创建物化视图
- 如果未来查询性能下降（响应时间>2秒），再考虑创建物化视图

**详细设计**：见Mike的数据库设计文档 `/Mike-DatabaseExpert/5.Collaboration/M2_Database_Design_Supplement_Mike_2025-12-16.md`

---

## 11. 工作流实现细节（Alex参考）

**说明**：以下工作流实现细节已由技术团队（Alex、Cat）确认。详细实现文档见：`/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md`

### 11.1 工作流节点概览

**工作流名称**: `M2_FAQ_Query`

**节点顺序**：
1. `step0_WebhookTrigger`（Webhook节点）：接收客户端请求
2. `step0_5_ExtractAuth`（Code节点）：从Header提取API Key
3. `step0_6_ValidateApiKey`（Code节点 + PostgreSQL查询）：验证API Key有效性
4. `step0_7_ParseRequest`（Code节点）：解析请求参数
5. `step1_RAGAnswer`（RAG检索 + LLM生成）：RAG检索和答案生成
6. `step2_OutputFormatter`（Code节点）：结构化输出
7. `step3_ChannelAdapter`（Code节点）：渠道适配
8. `step4_ResponseValidator`（Code节点）：响应验证
9. `step5_ResponseLogger`（PostgreSQL写入）：响应日志写入
10. `step6_ResponseReturn`（Respond to Webhook节点）：返回JSON响应

**详细配置**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md`

---

### 11.2 认证流程实现

**`step0_5_ExtractAuth`（Code节点）**：
- **功能**：从Webhook的headers中提取`Authorization` Header
- **输入**：Webhook请求headers
- **输出**：`apiKey`（提取的API Key）
- **错误处理**：如果没有Authorization Header或格式错误，抛出错误（`M2_ERR_AUTH_005`）

**`step0_6_ValidateApiKey`（Code节点 + PostgreSQL查询）**：
- **功能**：验证API Key有效性（查询`api_keys`表，bcrypt验证）
- **输入**：`apiKey`（从step0_5获取）
- **输出**：`api_key_id`、`project_id`（验证通过后）
- **验证逻辑**：
  1. 从`api_keys`表查询API Key哈希值（使用`key_hash`索引）
  2. 使用bcrypt.compare()比较请求中的API Key与数据库中的`key_hash`
  3. 验证API Key是否过期（检查`expires_at`）
  4. 验证API Key是否激活（检查`is_active`）
  5. 验证API Key与`project_id`的关联关系
- **错误处理**：
  - 如果API Key不存在或格式错误：返回`M2_ERR_AUTH_001`
  - 如果API Key已过期：返回`M2_ERR_AUTH_002`
  - 如果API Key未激活：返回`M2_ERR_AUTH_003`
  - 如果API Key与project_id不匹配：返回`M2_ERR_AUTH_004`

**详细实现**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md` §1.2

---

### 11.3 请求解析实现

**`step0_7_ParseRequest`（Code节点）**：
- **功能**：解析请求参数，验证必填参数和参数格式
- **输入**：Webhook请求body
- **输出**：解析后的请求参数对象（`project_id`、`channel`、`question`、`user_id`、`session_id`、`metadata`）
- **验证逻辑**：
  1. 提取请求体中的参数（`project_id`、`channel`、`question`、`user_id`、`session_id`、`metadata`）
  2. 验证必填参数是否存在（`project_id`、`channel`、`question`）
  3. 验证参数格式（`project_id`是否为UUID格式，`channel`是否在允许的值列表中）
  4. 验证参数值（`question`是否为空或过长）
  5. 生成`request_id`（UUID，用于追踪）
- **错误处理**：
  - 如果缺少`project_id`：返回`M2_ERR_API_001`
  - 如果缺少`channel`：返回`M2_ERR_API_002`
  - 如果缺少`question`：返回`M2_ERR_API_003`
  - 如果`project_id`格式错误：返回`M2_ERR_API_004`
  - 如果`channel`值无效：返回`M2_ERR_API_005`
  - 如果`question`为空或过长：返回`M2_ERR_API_006`

**详细实现**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md` §1.3

---

### 11.4 错误处理流程

**早期错误检测**：
- 认证错误：在`step0_5_ExtractAuth`和`step0_6_ValidateApiKey`中检测
- 参数错误：在`step0_7_ParseRequest`中检测

**错误捕获机制**：
- 使用n8n Error Workflow捕获未预期的错误
- 错误信息记录到`api_request_logs`表的`error_code`字段

**错误格式化**：
- 错误码设置：根据错误类型设置相应的错误码（`M2_ERR_XXX`）
- HTTP状态码设置：根据错误类型设置HTTP状态码（400/401/403/500/503/504）

**错误响应返回**：
- 错误响应格式：包含`code`、`message`、`error_code`、`data`字段
- 使用`Respond to Webhook`节点返回错误响应

**详细实现**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md`

---

### 11.5 性能监控实现

**响应时间记录**：
- `request_started_at`：请求开始时间（在`step0_WebhookTrigger`中记录）
- `total_latency_ms`：总响应时间（在`step6_ResponseReturn`中计算）
- `timing`字段：包含`total_ms`、`rag_ms`、`generation_ms`等性能指标

**性能指标写入**：
- 写入`api_request_logs`表的`response_time_ms`字段
- 写入响应JSON的`timing`字段

**性能告警机制**：
- 如果响应时间>7秒，标记`alert`标志
- 如果响应时间>30秒，返回`M2_ERR_SYS_002`（请求超时）

**详细实现**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md`

---

### 11.6 响应返回实现

**`step6_ResponseReturn`（Respond to Webhook节点）**：
- **功能**：返回JSON格式响应
- **实现逻辑**：
  1. 根据错误码设置HTTP状态码
  2. 格式化响应JSON
  3. 返回响应给客户端

**响应格式**：见第9.3节"响应格式"

**详细实现**：见Alex工作流实现文档 `/Alex-n8nExpert/5.Collaboration/M2_Workflow_Implementation_Details_Alex_2025-12-16.md`

---

## 12. 测试策略（Lily参考）

**说明**：以下测试策略已由技术团队（Lily、Cat）确认。详细测试文档见：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md` §5（Lily的回复）

### 12.1 测试范围

**功能测试**：
- API接口功能测试（正常请求、异常请求、Fallback场景）
- 认证功能测试（API Key认证、权限控制）
- 多端适配测试（Web/TG/Discord/X渠道）

**性能测试**：
- 响应时间测试（目标<3秒）
- 并发测试（目标支持100并发请求）

**安全测试**：
- API Key认证测试
- 权限控制测试
- SQL注入测试

---

### 12.2 测试策略框架

**测试方法**：
- 自动化测试优先（使用Playwright、curl/Postman）
- 使用Validator和Sandbox工具进行n8n工作流测试
- 数据一致性验证（在端到端测试后立即执行）

**测试工具**：
- API测试：Playwright、curl、Postman
- n8n工作流测试：Validator、Sandbox
- 数据库验证：SQL查询

**测试环境**：
- 测试环境URL：待确认（Alex提供）
- 测试API Key：待创建（Mike提供）
- 测试project_id：待创建（Mike提供）

---

### 12.3 主要测试场景概述

**正常请求测试**：
- 测试场景：标准FAQ查询（4个渠道：web/tg/discord/x）
- 验证点：响应格式、答案内容、引用、置信度

**异常请求测试**：
- 测试场景：认证错误（5个错误码：`M2_ERR_AUTH_001`到`M2_ERR_AUTH_005`）、API参数错误（6个错误码：`M2_ERR_API_001`到`M2_ERR_API_006`）
- 验证点：错误码、错误消息、HTTP状态码

**Fallback场景测试**：
- 测试场景：F1-F6 Fallback场景（6个场景：`M2_ERR_FALLBACK_F1`到`M2_ERR_FALLBACK_F6`）
- 验证点：Fallback代码、默认答案、错误码（HTTP状态码仍为200）

**系统错误测试**：
- 测试场景：服务不可用、请求超时、数据库连接失败、AI服务不可用、内部错误（5个场景：`M2_ERR_SYS_001`到`M2_ERR_SYS_005`）
- 验证点：错误码、错误消息、HTTP状态码

**集成测试**：
- Widget调用M2 API测试：验证Widget能够正确调用M2 API并显示答案
- Bot调用M2 API测试：验证Telegram/Discord/X Bot能够正确调用M2 API并显示答案（符合各渠道格式）

**详细测试用例**：见Lily的测试策略建议 `/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md` §5（Lily的回复）

---

### 12.4 测试交付物

**测试计划文档**：
- 文档位置：`/Lily-QASpecialist/4.Working/M2_Test_Plan_[日期].md`
- 内容：测试范围、测试用例、测试方法、测试环境配置

**测试执行报告**：
- 文档位置：`/Lily-QASpecialist/3.Design/M2_Test_Execution_Report_[日期].md`
- 内容：测试结果、问题记录、修复验证

**数据一致性验证报告**：
- 文档位置：`/Lily-QASpecialist/4.Working/M2_Data_Consistency_Verification_Report_[日期].md`
- 内容：数据库写入验证、日志记录验证、性能指标验证

---

## 13. 行动与里程碑

### 10.1 产品设计更新（已完成）

- ✅ **2025-12-16**: M2 FSD产品部分更新完成（v1.1）
  - ✅ 补充模块定位说明（M2作为后端API服务）
  - ✅ 补充与M2.5的关系说明
  - ✅ 更新用户旅程说明（明确通过M2.5配置的客户端使用）
  - ✅ 更新系统流程说明（从API服务角度描述）
  - ✅ 添加API接口设计章节（待技术团队确认）

### 10.2 技术设计确认（已完成）

- ✅ **API接口设计确认**：Sam、Alex、Cat已确认API接口设计（见第9.1-9.3节）
- ✅ **认证方式确认**：Cat、Alex已确认API Key认证方式（见第9.1节）
- ✅ **错误码定义确认**：Cat、Sam已确认错误码定义（见第9.4节）
- ✅ **工作流实现细节确认**：Alex已确认n8n工作流实现细节（见第11节）
- ✅ **数据库设计补充确认**：Mike已确认API Key管理表设计（见第10节）
- ✅ **测试策略确认**：Lily已确认API接口测试策略（见第12节）
- ✅ **API Key管理设计确认**：LEO已确认API Key生成方式、格式规范、管理接口（见第9.5节）
- ✅ **FSD冻结**：所有必需章节已补充，FSD可以冻结（v1.4）

**详细讨论清单**：`/LEO_ProductManager/5.Collaboration/M2_FSD_Update_Discussion_List_2025-12-16.md`

---

## 14. 附录
- `Sam-AIDeveloper/3.Design/M2_RAG_Pipeline_Draft_2025-11-09.md`
- `John-PromptExpert/3.Design/M2_FAQ_Prompt_Strategy_Draft.md`
- `Alex-n8nExpert/3.Design/M2_Workflow_Plan_Draft.md`
- `Mike-DatabaseExpert/5.Collaboration/LEO-DatabaseExpert_Data_Requirements_2025-11-04.md`
- `Lily-QASpecialist/3.Design/M1_QA_Risk_Control_Summary_2025-11-09.md`

> 若各角色 24 小时内无修改建议，本文件即视为 M2 FAQ 编排 & AI 引擎 FSD 最终定稿。
