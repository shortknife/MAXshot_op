# Nexa 架构设计文档 · 2025-11-23

> **版本**: v1.0  
> **创建日期**: 2025-11-23  
> **创建者**: LEO (Product Manager)  
> **目标受众**: 非产品部门小伙伴  
> **目的**: 技术架构和构建过程说明

---

## 📋 文档说明

本文档旨在向非产品部门的小伙伴介绍 Nexa 的技术架构和构建过程，帮助团队更好地理解产品如何构建和运行。

**产品名称**：Nexa  
**产品Slogan**：Connect Knowledge, Instant Answers（连接知识，即时回答）  
**产品定位**：B2B SaaS智能FAQ Bot平台  
**品牌调性**：现代、智能、连接、未来

**文档结构**：
- **系统架构**：整体架构、模块架构、数据流
- **技术栈**：技术选型、技术栈说明、技术选型理由
- **构建过程**：开发流程、测试流程、部署流程
- **数据模型**：数据表结构、数据流、数据关系
- **工作流设计**：工作流编排、节点设计、异常处理

---

## 1. 系统架构

### 1.1 整体架构（包含 Skill 层）

```
┌─────────────────────────────────────────┐
│  终端用户（C端）                         │
│  Web / TG Bot / DC Bot / X              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  多端适配层                              │
│  API Gateway / Bot Adapters             │
│  - Web API (RESTful)                    │
│  - Telegram Bot API                     │
│  - Discord Bot API                      │
│  - X (Twitter) API                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Skill 架构层（产品架构核心组件）        │
│  - kb-upload-qc：知识库上传和质检规范    │
│  - faq-answering：FAQ问答主流程规范      │
│  - faq-fallback：Fallback处理规范        │
│  - faq-qa-review：QA抽检流程规范         │
│  - billing-charge：支付扣费规范（P1留白）│
│  Skill 定义产品功能的技术实现规范，      │
│  指导系统架构、数据模型、工作流设计      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  核心服务层（n8n工作流）                 │
│  - M1 知识库管理（实现 Skill: kb-upload-qc）│
│  - M2 FAQ问答引擎（实现 Skill: faq-answering）│
│  - M2 Fallback处理（实现 Skill: faq-fallback）│
│  - M2 QA抽检（实现 Skill: faq-qa-review）│
│  - M3 支付与计费（实现 Skill: billing-charge）│
│  - M4 渠道扩展（Telegram）               │
│  - M5 安全与监控                         │
│  - M6 Dashboard & Insights              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  数据存储层（Supabase）                  │
│  - 向量数据库（pgvector）                │
│  - 关系数据库（PostgreSQL）              │
│  - 实时订阅（Realtime）                  │
│  - 存储服务（Storage）                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  外部服务层                              │
│  - LLM服务（DeepSeek、Gemini）           │
│  - 支付服务（X402 Facilitator）          │
│  - 渠道服务（Telegram Bot API）          │
└─────────────────────────────────────────┘
```

---

### 1.2 模块架构（包含 Skill 层）

#### M1 知识库管理（Skill: kb-upload-qc）
```
Web界面上传Markdown
  → n8n Webhook接收
  → 文档解析（Frontmatter + 正文）
  → 文档切片（Chunk）
  → 向量化（Gemini Embeddings）
  → 质检（Stage0/1/2/3/4）
  → 入库（Supabase Vector Store）
  → Dashboard显示结果
```

**Skill: kb-upload-qc**
- **目的**：规范知识库上传后的轻量质检流程（Stage0/1/2）
- **输入**：Markdown 文档、上传元数据
- **输出**：质检结果、向量化数据、日志记录
- **文档**：`LEO_ProductManager/3.Design/Skills/kb-upload-qc.md`

#### M2 FAQ引擎（Skill: faq-answering, faq-fallback, faq-qa-review）
```
终端用户提问
  → n8n Webhook接收
  → 问题归一化
  → RAG检索（向量检索Top-K=3）
  → LLM生成（DeepSeek-V2）
  → 输出格式化（JSON Schema）
  → 渠道适配（Web/TG/DC/X）
  → 响应验证（格式/OOS/敏感）
  → 支付扣费（X402）
  → 日志记录（faq_response_logs）
  → 结果交付
```

**Skill: faq-answering**
- **目的**：标准化 FAQ 问答的 RAG + LLM 主流程
- **输入**：project_id、channel、question、session_id(optional)
- **输出**：answer、citations、confidence、channel、fallback、notes
- **文档**：`LEO_ProductManager/3.Design/Skills/faq-answering.md`

**Skill: faq-fallback**
- **目的**：统一 FAQ 模块 6 类兜底场景（F1~F6）的触发条件、用户提示、字段写回与 SLA 标记
- **输入**：fallback_code、fallback_reason、confidence
- **输出**：用户提示、字段写回、SLA 标记
- **文档**：`LEO_ProductManager/3.Design/Skills/faq-fallback.md`

**Skill: faq-qa-review**
- **目的**：规范 FAQ 模块的 QA 抽检与人工兜底流程
- **输入**：manual_review_required、fallback_code、confidence
- **输出**：QA 待办、SLA 标记、处理结果
- **文档**：`LEO_ProductManager/3.Design/Skills/faq-qa-review.md`

#### M3 支付与计费
```
FAQ回答成功
  → 余额校验（X402 Facilitator）
  → 扣费请求（X402协议）
  → 交易记录（billing_transactions）
  → 账本更新（billing_ledger）
  → 日志记录（metrics_json.billing）
  → 结果反馈
```

#### M4 渠道扩展（Telegram）
```
FAQ答案生成
  → 审批流程（默认开启）
  → Telegram广播（sendMessage）
  → 重试策略（最多2次重试）
  → 日志记录（tg_broadcast_status）
  → 结果反馈
```

#### M5 安全与监控
```
安全事件检测
  → 事件判定（敏感内容、连续失败、权限/余额异常）
  → 节流策略（同项目+同事件5分钟最多3条）
  → 告警流程（用户拒答模板、运营邮件模板）
  → 日志记录（safety_incidents）
  → 结果反馈
```

#### M6 Dashboard & Insights
```
数据获取
  → 视图查询（vw_dashboard_faq_metrics、vw_dashboard_incidents、vw_dashboard_billing_sla）
  → 数据聚合（5分钟轮询、24小时汇总）
  → 角色化提示（PM、Ops、QA、Finance）
  → 结果展示（Dashboard界面）
```

---

### 1.3 数据流

#### 知识库上传数据流
```
项目方上传Markdown
  → kb_ingest_jobs（上传批次记录）
  → kb_documents（文档记录）
  → kb_chunks（文档切片记录）
  → kb_ingest_jobs.qc_result（质检结果）
  → kb_ingest_jobs.metrics_json（指标数据）
  → Dashboard显示结果
```

#### FAQ问答数据流
```
终端用户提问
  → faq_response_logs（问答日志记录）
  → metrics_json.ai_inference（AI推理指标）
  → metrics_json.channel_adaptation（渠道适配指标）
  → metrics_json.timing（性能指标）
  → metrics_json.billing（计费指标）
  → metrics_json.safety（安全事件摘要）
  → Dashboard显示结果
```

#### 支付扣费数据流
```
FAQ回答成功
  → billing_accounts（账户记录）
  → billing_transactions（交易记录）
  → billing_ledger（账本记录）
  → metrics_json.billing（计费指标）
  → Dashboard显示结果
```

---

## 2. 技术栈

### 2.1 技术选型

| 技术栈 | 选型 | 版本 | 理由 |
|--------|------|------|------|
| **数据库** | Supabase (PostgreSQL + pgvector) | Latest | 向量检索、RLS权限、实时订阅 |
| **工作流** | n8n | Latest | 可视化编排、多节点集成、重试策略 |
| **向量模型** | Gemini Embeddings | 1536维 | 免费额度、性能稳定 |
| **LLM模型** | DeepSeek-V2 | Latest | 成本低、性能好 |
| **支付协议** | X402 | Latest | 区块链原生、微支付 |
| **渠道** | Telegram Bot API | Latest | 单渠道验证、后续扩展 |

---

### 2.2 技术栈说明

#### 数据库（Supabase）
- **PostgreSQL**：关系数据库，存储结构化数据
- **pgvector**：向量数据库扩展，支持向量检索
- **RLS**：行级安全策略，控制数据访问权限
- **Realtime**：实时订阅，支持实时数据更新
- **Storage**：存储服务，存储文件和数据

#### 工作流（n8n）
- **可视化编排**：通过可视化界面编排工作流
- **多节点集成**：支持多种节点类型（HTTP、数据库、AI等）
- **重试策略**：支持重试策略，确保工作流稳定运行
- **错误处理**：支持错误处理，确保工作流异常处理

#### 向量模型（Gemini Embeddings）
- **1536维**：向量维度，平衡性能和准确性
- **免费额度**：提供免费额度，降低开发成本
- **性能稳定**：性能稳定，适合生产环境使用

#### LLM模型（DeepSeek-V2）
- **成本低**：成本低，适合大规模使用
- **性能好**：性能好，响应速度快
- **支持JSON输出**：支持JSON输出，便于数据解析

#### 支付协议（X402）
- **区块链原生**：基于区块链的支付协议
- **微支付**：支持微支付，降低使用门槛
- **实时结算**：实时结算，提高用户体验

#### 渠道（Telegram Bot API）
- **单渠道验证**：MVP阶段单渠道验证
- **后续扩展**：后续扩展支持Discord、X（Twitter）等渠道

---

### 2.3 技术选型理由

#### 为什么选择Supabase？
1. **向量检索**：支持pgvector扩展，适合向量检索场景
2. **RLS权限**：支持行级安全策略，适合多租户场景
3. **实时订阅**：支持实时订阅，适合实时数据更新场景
4. **开发效率**：提供完整的开发工具，提高开发效率
5. **成本控制**：提供免费额度，降低开发成本

#### 为什么选择n8n？
1. **可视化编排**：通过可视化界面编排工作流，降低开发门槛
2. **多节点集成**：支持多种节点类型，提高开发效率
3. **重试策略**：支持重试策略，确保工作流稳定运行
4. **错误处理**：支持错误处理，确保工作流异常处理
5. **社区支持**：拥有活跃的社区，提供丰富的资源

#### 为什么选择Gemini Embeddings？
1. **免费额度**：提供免费额度，降低开发成本
2. **性能稳定**：性能稳定，适合生产环境使用
3. **1536维**：向量维度平衡性能和准确性
4. **易于集成**：易于集成，提供完整的API文档

#### 为什么选择DeepSeek-V2？
1. **成本低**：成本低，适合大规模使用
2. **性能好**：性能好，响应速度快
3. **支持JSON输出**：支持JSON输出，便于数据解析
4. **易于集成**：易于集成，提供完整的API文档

#### 为什么选择X402？
1. **区块链原生**：基于区块链的支付协议，适合区块链场景
2. **微支付**：支持微支付，降低使用门槛
3. **实时结算**：实时结算，提高用户体验
4. **易于集成**：易于集成，提供完整的API文档

#### 为什么选择Telegram Bot API？
1. **单渠道验证**：MVP阶段单渠道验证，降低开发复杂度
2. **后续扩展**：后续扩展支持Discord、X（Twitter）等渠道
3. **易于集成**：易于集成，提供完整的API文档
4. **用户基数大**：Telegram用户基数大，适合推广

---

## 3. 构建过程

### 3.1 开发流程

#### 阶段1：开发环境搭建
1. **Supabase项目创建**：创建项目，启用pgvector扩展
2. **n8n环境搭建**：搭建n8n环境，配置Webhook
3. **LLM API密钥**：获取DeepSeek、Gemini API密钥
4. **X402支付接口**：配置X402 Facilitator接口
5. **Telegram Bot Token**：获取Telegram Bot API Token

#### 阶段2：数据库初始化
1. **表结构创建**：执行DDL脚本，创建所有表结构
2. **视图创建**：执行视图脚本，创建所有视图
3. **索引创建**：执行索引脚本，创建所有索引
4. **RLS策略配置**：配置行级安全策略
5. **初始数据导入**：导入测试数据

#### 阶段3：工作流开发
1. **M1工作流创建**：知识库上传、解析、质检流程
2. **M2工作流创建**：FAQ问答、RAG检索流程
3. **M3工作流创建**：支付扣费、余额校验流程
4. **M4工作流创建**：Telegram广播、审批流程
5. **M5工作流创建**：安全事件检测、告警流程
6. **M6工作流创建**：Dashboard数据获取、刷新流程

#### 阶段4：测试验证
1. **单元测试**：核心功能单元测试
2. **集成测试**：跨模块集成测试
3. **端到端测试**：端到端流程测试
4. **性能测试**：向量检索、LLM调用性能测试
5. **安全测试**：安全事件检测、权限测试

#### 阶段5：部署上线
1. **环境配置**：生产环境配置
2. **数据迁移**：数据迁移脚本
3. **监控配置**：监控和告警配置
4. **文档更新**：用户文档、运维文档
5. **上线验证**：上线后验证和监控

---

### 3.2 测试流程

#### 单元测试
- **核心功能测试**：每个核心功能的单元测试
- **边界条件测试**：边界条件和异常情况测试
- **性能测试**：核心功能的性能测试

#### 集成测试
- **跨模块测试**：跨模块集成测试
- **数据流测试**：数据流完整性测试
- **接口测试**：接口调用测试

#### 端到端测试
- **用户旅程测试**：完整用户旅程测试
- **多端测试**：多端适配测试
- **支付测试**：支付流程测试

---

### 3.3 部署流程

#### 开发环境
- **Supabase**：开发环境项目
- **n8n**：本地n8n环境
- **LLM API**：开发环境API密钥
- **测试数据**：测试数据导入

#### 测试环境
- **Supabase**：测试环境项目
- **n8n**：测试环境n8n
- **LLM API**：测试环境API密钥
- **测试数据**：测试数据导入

#### 生产环境
- **Supabase**：生产环境项目
- **n8n**：生产环境n8n
- **LLM API**：生产环境API密钥
- **生产数据**：生产数据迁移

---

## 4. Skill 架构

### 4.1 Skill 定义与核心地位

**Skill（技能）** 是 Nexa 产品的**架构核心组件**，是 Agent 产品开发的重要组成部分。Skill 定义了产品的核心功能模块，通过标准化的业务流程、字段定义和接口规范，确保产品功能的一致性和可维护性。

**Skill 是产品架构的核心组件，而非可选的辅助模块：**

1. **产品功能的核心实现**：Skill 定义了产品的核心功能模块，每个 Skill 对应一个核心产品功能
2. **架构设计的基础**：Skill 是产品架构设计的基础，指导系统架构、数据模型、工作流设计的实现
3. **开发实现的规范**：Skill 定义了开发实现的规范，确保开发团队按照统一的标准实现产品功能
4. **产品演进的基础**：Skill 是产品演进的基础，通过 Skill 的扩展和优化，推动产品功能的持续改进

### 4.2 Skill 与产品功能的关系

**Skill 与产品功能一一对应，是产品功能的技术实现规范：**

| 产品功能 | 对应 Skill | Skill 作用 |
|----------|-----------|-----------|
| **M1 知识库上传** | kb-upload-qc | 定义知识库上传和质检的完整流程、字段定义、异常处理 |
| **M2 FAQ 问答** | faq-answering | 定义 FAQ 问答的 RAG + LLM 主流程、输入输出、字段写回 |
| **M2 Fallback 处理** | faq-fallback | 定义 Fallback 处理的触发条件、用户提示、字段写回、SLA 标记 |
| **M2 QA 抽检** | faq-qa-review | 定义 QA 抽检的触发条件、字段回写、SLA 设置、处理流程 |
| **M3 支付扣费** | billing-charge | 定义支付扣费的流程、字段定义、异常处理（P1 留白） |

### 4.3 Skill 的重要性

**Skill 的重要性体现在以下几个方面：**

1. **架构设计的核心**：Skill 是产品架构设计的核心，指导系统架构、数据模型、工作流设计的实现
2. **开发实现的规范**：Skill 定义了开发实现的规范，确保开发团队按照统一的标准实现产品功能
3. **产品功能的一致性**：Skill 确保产品功能的一致性，通过标准化的流程、字段定义和接口规范，确保不同模块之间的协调
4. **产品演进的基础**：Skill 是产品演进的基础，通过 Skill 的扩展和优化，推动产品功能的持续改进
5. **技术债务的减少**：Skill 减少技术债务，通过标准化的设计，减少后期维护和扩展的成本

### 4.3 Skill 清单

#### M1 知识库管理 Skills
- **kb-upload-qc**：知识库上传和质检流程
  - **目的**：规范知识库上传后的轻量质检流程（Stage0/1/2）
  - **输入**：Markdown 文档、上传元数据
  - **输出**：质检结果、向量化数据、日志记录
  - **文档**：`LEO_ProductManager/3.Design/Skills/kb-upload-qc.md`

#### M2 FAQ引擎 Skills
- **faq-answering**：FAQ 问答主流程
  - **目的**：标准化 FAQ 问答的 RAG + LLM 主流程
  - **输入**：project_id、channel、question、session_id(optional)
  - **输出**：answer、citations、confidence、channel、fallback、notes
  - **文档**：`LEO_ProductManager/3.Design/Skills/faq-answering.md`

- **faq-fallback**：FAQ Fallback 处理流程
  - **目的**：统一 FAQ 模块 6 类兜底场景（F1~F6）的触发条件、用户提示、字段写回与 SLA 标记
  - **输入**：fallback_code、fallback_reason、confidence
  - **输出**：用户提示、字段写回、SLA 标记
  - **文档**：`LEO_ProductManager/3.Design/Skills/faq-fallback.md`

- **faq-qa-review**：FAQ QA 抽检流程
  - **目的**：规范 FAQ 模块的 QA 抽检与人工兜底流程
  - **输入**：manual_review_required、fallback_code、confidence
  - **输出**：QA 待办、SLA 标记、处理结果
  - **文档**：`LEO_ProductManager/3.Design/Skills/faq-qa-review.md`

#### M3 支付与计费 Skills（P1 留白）
- **billing-charge**：支付扣费流程（P1 留白）
- **balance-monitor**：余额监控流程（P1 留白）
- **payment-failure-handling**：支付失败处理流程（P1 留白）

### 4.4 Skill 与 n8n 工作流的关系

#### Skill 是 n8n 工作流开发的核心规范

**Skill 不是可选的参考文档，而是 n8n 工作流开发的强制性规范：**

1. **节点配置的强制规范**：Skill 定义标准化的节点配置和输入输出规范，n8n 工作流开发必须严格按照 Skill 定义实现
2. **字段写回的强制规范**：Skill 定义标准化的字段写回规则，n8n 工作流节点必须按照 Skill 定义的规则写回字段
3. **异常处理的强制规范**：Skill 定义标准化的异常处理策略，n8n 工作流节点必须按照 Skill 定义的策略处理异常
4. **数据流的强制规范**：Skill 定义标准化的数据流程，n8n 工作流节点必须按照 Skill 定义的流程处理数据

#### n8n 工作流实现 Skill 的强制性要求

**n8n 工作流开发必须严格按照 Skill 定义实现：**

1. **节点实现的强制性**：n8n 工作流节点必须实现 Skill 定义的功能，不能缺失或修改核心功能
2. **字段写回的强制性**：n8n 工作流节点必须按照 Skill 定义的规则写回字段，不能随意修改字段名称或结构
3. **异常处理的强制性**：n8n 工作流节点必须按照 Skill 定义的策略处理异常，不能随意修改异常处理逻辑
4. **数据流的强制性**：n8n 工作流节点必须按照 Skill 定义的流程处理数据，不能随意修改数据流程

#### Skill 与 n8n 工作流的对应关系

**每个 Skill 对应一个 n8n 工作流或工作流子流程：**

| Skill | n8n 工作流 | 实现方式 |
|-------|-----------|----------|
| **kb-upload-qc** | M1 知识库管理工作流 | 完整工作流实现 |
| **faq-answering** | M2 FAQ 问答工作流 | 核心工作流实现 |
| **faq-fallback** | M2 FAQ 问答工作流（子流程） | 工作流子流程实现 |
| **faq-qa-review** | M2 FAQ 问答工作流（子流程） | 工作流子流程实现 |
| **billing-charge** | M3 支付与计费工作流 | 完整工作流实现（P1 留白） |

### 4.5 Skill 文档位置与管理

#### Skill 文档的产品定位

**Skill 文档是产品架构设计文档，不是学习参考资料：**

1. **产品文档的核心组成部分**：Skill 文档是产品文档的核心组成部分，与 PRD、FSD 等文档同等重要
2. **开发实现的强制规范**：Skill 文档是开发实现的强制规范，开发团队必须严格按照 Skill 文档执行
3. **架构设计的基础文档**：Skill 文档是架构设计的基础文档，系统架构、数据模型、工作流设计必须基于 Skill 文档
4. **产品演进的基础文档**：Skill 文档是产品演进的基础文档，产品功能的扩展和优化必须基于 Skill 文档

#### Skill 文档的位置

**Skill 文档应该位于产品文档目录，而非学习资料目录：**

| Skill | 当前文档路径 | 产品文档路径（建议） | 状态 |
|-------|------------|-------------------|------|
| **kb-upload-qc** | `LEO_ProductManager/3.Design/Skills/kb-upload-qc.md` | ✅ 已迁移 |
| **faq-answering** | `LEO_ProductManager/3.Design/Skills/faq-answering.md` | ✅ 已迁移 |
| **faq-fallback** | `LEO_ProductManager/3.Design/Skills/faq-fallback.md` | ✅ 已迁移 |
| **faq-qa-review** | `LEO_ProductManager/3.Design/Skills/faq-qa-review.md` | ✅ 已迁移 |

#### Skill 文档的管理要求

**Skill 文档必须按照产品文档的标准进行管理：**

1. **版本管理**：Skill 文档必须进行版本管理，记录每次变更的内容和原因
2. **评审流程**：Skill 文档必须经过评审流程，确保文档的准确性和完整性
3. **更新维护**：Skill 文档必须及时更新维护，确保文档与实现保持一致
4. **文档归档**：Skill 文档必须进行文档归档，确保文档的可追溯性和可维护性

---

## 5. 数据模型

### 4.1 核心数据表

#### M1 知识库管理
- **kb_documents**：文档记录表
- **kb_chunks**：文档切片记录表
- **kb_ingest_jobs**：上传批次记录表

#### M2 FAQ引擎
- **faq_response_logs**：问答日志记录表（32个字段，含M4 Telegram扩展字段）

#### M3 支付与计费
- **billing_accounts**：账户记录表
- **billing_transactions**：交易记录表
- **billing_ledger**：账本记录表

#### M5 安全与监控
- **safety_incidents**：安全事件记录表

---

### 4.2 数据流

#### 知识库上传数据流
```
项目方上传Markdown
  → kb_ingest_jobs（上传批次记录）
  → kb_documents（文档记录）
  → kb_chunks（文档切片记录）
  → kb_ingest_jobs.qc_result（质检结果）
  → kb_ingest_jobs.metrics_json（指标数据）
  → Dashboard显示结果
```

#### FAQ问答数据流
```
终端用户提问
  → faq_response_logs（问答日志记录）
  → metrics_json.ai_inference（AI推理指标）
  → metrics_json.channel_adaptation（渠道适配指标）
  → metrics_json.timing（性能指标）
  → metrics_json.billing（计费指标）
  → metrics_json.safety（安全事件摘要）
  → Dashboard显示结果
```

#### 支付扣费数据流
```
FAQ回答成功
  → billing_accounts（账户记录）
  → billing_transactions（交易记录）
  → billing_ledger（账本记录）
  → metrics_json.billing（计费指标）
  → Dashboard显示结果
```

---

### 4.3 数据关系

#### 知识库管理数据关系
```
kb_ingest_jobs (上传批次)
  → kb_documents (文档记录)
    → kb_chunks (文档切片记录)
```

#### FAQ引擎数据关系
```
faq_response_logs (问答日志)
  → metrics_json.ai_inference (AI推理指标)
  → metrics_json.channel_adaptation (渠道适配指标)
  → metrics_json.timing (性能指标)
  → metrics_json.billing (计费指标)
  → metrics_json.safety (安全事件摘要)
```

#### 支付与计费数据关系
```
billing_accounts (账户记录)
  → billing_transactions (交易记录)
    → billing_ledger (账本记录)
```

#### 安全与监控数据关系
```
safety_incidents (安全事件记录)
  → metrics_json.safety (安全事件摘要)
```

---

## 6. 工作流设计

### 6.1 工作流编排（基于 Skill 规范）

#### M1 知识库管理工作流（实现 Skill: kb-upload-qc）
```
Web界面上传Markdown
  → step0_WebhookReceive (接收上传请求)
  → step1_DocumentParse (文档解析)
  → step2_ChunkSplit (文档切片)
  → step3_Vectorize (向量化)
  → step4_QualityCheck (质检)
  → step5_DatabaseWrite (入库)
  → step6_DashboardUpdate (Dashboard更新)
```

**Skill 规范要求**：
- **必须参考 Skill 文档**：`LEO_ProductManager/3.Design/Skills/kb-upload-qc.md`
- **必须实现 Skill 定义的功能**：知识库上传和质检的完整流程、字段定义、异常处理
- **必须遵循 Skill 定义的规范**：字段写回规则、异常处理策略、数据流程
- **必须与 Skill 文档保持一致**：工作流实现必须与 Skill 文档保持一致，如有变更必须同步更新 Skill 文档

#### M2 FAQ问答工作流（实现 Skill: faq-answering, faq-fallback, faq-qa-review）
```
终端用户提问
  → step0_PreProcess (问题归一化)
  → step1_RAGAnswer (RAG检索)
  → step2_OutputFormatter (输出格式化)
  → step3_ChannelAdapter (渠道适配)
  → step4_ResponseValidator (响应验证)
  → step5_ResponseLogger (日志记录)
  → step6_ChannelDispatcher (渠道派发)
```

**Skill 规范要求**：
- **必须参考 Skill 文档**：
  - `LEO_ProductManager/3.Design/Skills/faq-answering.md`（FAQ 问答主流程）
  - `LEO_ProductManager/3.Design/Skills/faq-fallback.md`（Fallback 处理）
  - `LEO_ProductManager/3.Design/Skills/faq-qa-review.md`（QA 抽检流程）
- **必须实现 Skill 定义的功能**：FAQ 问答的 RAG + LLM 主流程、Fallback 处理、QA 抽检流程
- **必须遵循 Skill 定义的规范**：输入输出规范、字段写回规则、异常处理策略、数据流程
- **必须与 Skill 文档保持一致**：工作流实现必须与 Skill 文档保持一致，如有变更必须同步更新 Skill 文档

#### M3 支付与计费工作流（实现 Skill: billing-charge，P1 留白）
```
FAQ回答成功
  → step0_BalanceCheck (余额校验)
  → step1_ChargeRequest (扣费请求)
  → step2_TransactionRecord (交易记录)
  → step3_LedgerUpdate (账本更新)
  → step4_MetricsUpdate (指标更新)
  → step5_ResultFeedback (结果反馈)
```

**Skill 规范要求**（P1 留白，待后续开发）：
- **必须参考 Skill 文档**：`LEO_ProductManager/3.Design/Skills/billing-charge.md`（待创建）
- **必须实现 Skill 定义的功能**：支付扣费的完整流程、字段定义、异常处理
- **必须遵循 Skill 定义的规范**：字段写回规则、异常处理策略、数据流程
- **必须与 Skill 文档保持一致**：工作流实现必须与 Skill 文档保持一致，如有变更必须同步更新 Skill 文档

#### M4 渠道扩展工作流
```
FAQ答案生成
  → step0_ApprovalCheck (审批检查)
  → step1_TelegramBroadcast (Telegram广播)
  → step2_RetryStrategy (重试策略)
  → step3_LogRecord (日志记录)
  → step4_ResultFeedback (结果反馈)
```

#### M5 安全与监控工作流
```
安全事件检测
  → step0_EventDetection (事件检测)
  → step1_ThrottleCheck (节流检查)
  → step2_AlertProcess (告警处理)
  → step3_LogRecord (日志记录)
  → step4_ResultFeedback (结果反馈)
```

#### M6 Dashboard工作流
```
数据获取
  → step0_DashboardFetch (数据获取)
  → step1_DataAggregate (数据聚合)
  → step2_RolePrompt (角色化提示)
  → step3_DashboardUpdate (Dashboard更新)
```

---

### 5.2 节点设计

#### HTTP节点
- **Webhook接收**：接收外部请求
- **API调用**：调用外部API
- **数据转发**：转发数据到下一个节点

#### 数据库节点
- **数据查询**：查询数据库数据
- **数据写入**：写入数据库数据
- **数据更新**：更新数据库数据

#### AI节点
- **向量检索**：向量检索节点
- **LLM生成**：LLM生成节点
- **内容检测**：内容检测节点

#### 逻辑节点
- **条件判断**：条件判断节点
- **数据转换**：数据转换节点
- **错误处理**：错误处理节点

---

### 5.3 异常处理

#### 重试策略
- **最大重试次数**：3次
- **重试间隔**：指数退避（1s、2s、4s）
- **重试条件**：网络错误、超时错误、临时错误

#### 错误处理
- **错误分类**：网络错误、业务错误、系统错误
- **错误处理**：重试、降级、告警
- **错误记录**：错误日志记录、错误指标统计

#### 降级策略
- **Fallback策略**：8种Fallback原因
- **人工兜底**：人工兜底流程
- **用户提示**：用户提示信息

---

## 7. 构建工具和资源

### 6.1 开发工具

| 工具 | 用途 | 说明 |
|------|------|------|
| **Supabase CLI** | 数据库管理 | 数据库迁移、数据导入导出 |
| **n8n CLI** | 工作流管理 | 工作流导入导出、工作流部署 |
| **Git** | 版本控制 | 代码版本控制、协作开发 |
| **VS Code** | 代码编辑 | 代码编辑、调试、测试 |

---

### 6.2 开发资源

#### 文档资源
- **PRD**：产品需求文档
- **FSD**：功能规格文档（30份FSD文档）
- **API文档**：API接口文档
- **用户文档**：用户使用文档

#### 代码资源
- **SQL脚本**：DDL脚本、视图脚本、物化视图脚本（6份SQL脚本）
- **n8n工作流**：工作流JSON文件
- **测试脚本**：单元测试、集成测试、端到端测试脚本

#### 数据资源
- **测试数据**：测试数据文件
- **示例数据**：示例数据文件
- **模板数据**：模板数据文件

---

### 6.3 学习资源

#### 技术文档
- **Supabase文档**：Supabase官方文档
- **n8n文档**：n8n官方文档
- **Gemini文档**：Gemini官方文档
- **DeepSeek文档**：DeepSeek官方文档
- **X402文档**：X402官方文档
- **Telegram Bot API文档**：Telegram Bot API官方文档

#### 教程资源
- **Supabase教程**：Supabase教程视频
- **n8n教程**：n8n教程视频
- **RAG教程**：RAG技术教程
- **向量检索教程**：向量检索技术教程

---

## 8. 构建时间线

### 7.1 开发阶段时间线

| 阶段 | 时间 | 任务 | 负责人 |
|------|------|------|--------|
| **阶段1：开发环境搭建** | 第1周 | Supabase项目创建、n8n环境搭建、LLM API密钥、X402支付接口、Telegram Bot Token | Mike、Alex、Sam |
| **阶段2：数据库初始化** | 第2周 | 表结构创建、视图创建、索引创建、RLS策略配置、初始数据导入 | Mike |
| **阶段3：工作流开发** | 第3-6周 | M1–M6工作流创建 | Alex、Sam |
| **阶段4：测试验证** | 第7周 | 单元测试、集成测试、端到端测试、性能测试、安全测试 | Sam、Alex、Lily |
| **阶段5：部署上线** | 第8周 | 环境配置、数据迁移、监控配置、文档更新、上线验证 | 全员 |

**总开发时长**：8周（预计）

---

### 7.2 里程碑

| 里程碑 | 时间 | 目标 | 状态 |
|--------|------|------|------|
| **M1 知识库管理** | 第3周 | 知识库上传、解析、质检流程完成 | ⏳ 待开始 |
| **M2 FAQ引擎** | 第4周 | FAQ问答、RAG检索流程完成 | ⏳ 待开始 |
| **M3 支付与计费** | 第5周 | 支付扣费、余额校验流程完成 | ⏳ 待开始 |
| **M4 渠道扩展** | 第5周 | Telegram广播、审批流程完成 | ⏳ 待开始 |
| **M5 安全与监控** | 第6周 | 安全事件检测、告警流程完成 | ⏳ 待开始 |
| **M6 Dashboard** | 第6周 | Dashboard数据获取、刷新流程完成 | ⏳ 待开始 |
| **测试验证** | 第7周 | 所有测试完成 | ⏳ 待开始 |
| **部署上线** | 第8周 | 生产环境部署完成 | ⏳ 待开始 |

---

## 9. 常见问题（Q&A）

### 8.1 技术架构相关问题

**Q1：为什么选择Supabase作为数据库？**
A：Supabase支持pgvector扩展，适合向量检索场景；支持RLS权限，适合多租户场景；支持实时订阅，适合实时数据更新场景；提供完整的开发工具，提高开发效率；提供免费额度，降低开发成本。

**Q2：为什么选择n8n作为工作流引擎？**
A：n8n提供可视化编排，降低开发门槛；支持多种节点类型，提高开发效率；支持重试策略，确保工作流稳定运行；支持错误处理，确保工作流异常处理；拥有活跃的社区，提供丰富的资源。

**Q3：为什么选择Gemini Embeddings作为向量模型？**
A：Gemini Embeddings提供免费额度，降低开发成本；性能稳定，适合生产环境使用；1536维向量维度平衡性能和准确性；易于集成，提供完整的API文档。

**Q4：为什么选择DeepSeek-V2作为LLM模型？**
A：DeepSeek-V2成本低，适合大规模使用；性能好，响应速度快；支持JSON输出，便于数据解析；易于集成，提供完整的API文档。

**Q5：为什么选择X402作为支付协议？**
A：X402基于区块链的支付协议，适合区块链场景；支持微支付，降低使用门槛；实时结算，提高用户体验；易于集成，提供完整的API文档。

---

### 8.2 构建过程相关问题

**Q1：如何构建产品？**
A：构建过程包括开发环境搭建、数据库初始化、工作流开发、测试验证、部署上线五个阶段。每个阶段有明确的任务和时间线。

**Q2：开发流程是怎样的？**
A：开发流程按照M1–M6模块顺序进行，每个模块包括Data、Workflow、AI、Prompt、QA五类FSD文档。开发时按照FSD文档进行开发。

**Q3：测试流程是怎样的？**
A：测试流程包括单元测试、集成测试、端到端测试、性能测试、安全测试五个阶段。每个阶段有明确的测试目标和测试方法。

**Q4：部署流程是怎样的？**
A：部署流程包括开发环境、测试环境、生产环境三个环境。每个环境有明确的配置和部署步骤。

**Q5：如何保证产品质量？**
A：通过完整的测试流程、代码审查、文档审查、性能测试、安全测试等方式保证产品质量。

---

### 8.3 数据模型相关问题

**Q1：数据表结构是怎样的？**
A：数据表结构包括M1知识库管理（kb_documents、kb_chunks、kb_ingest_jobs）、M2 FAQ引擎（faq_response_logs）、M3支付与计费（billing_accounts、billing_transactions、billing_ledger）、M5安全与监控（safety_incidents）等核心数据表。

**Q2：数据流是怎样的？**
A：数据流包括知识库上传数据流、FAQ问答数据流、支付扣费数据流等。所有数据流通过n8n工作流编排。

**Q3：数据关系是怎样的？**
A：数据关系包括知识库管理数据关系、FAQ引擎数据关系、支付与计费数据关系、安全与监控数据关系等。所有数据关系通过外键关联。

---

## 9. 相关文档

### 9.1 产品文档
- **PRD**：`LEO_ProductManager/3.Design/Product_Requirements_Document_2025-11-06.md`
- **产品概览**：`LEO_ProductManager/3.Design/Product_Overview_2025-11-23.md`
- **设计结案评审**：`LEO_ProductManager/3.Design/Design_Closure_Review_2025-11-23.md`
- **Skill架构设计**：`LEO_ProductManager/3.Design/Skill_Architecture_Design_2025-11-23.md`

### 9.2 技术文档
- **M1 Data FSD**：`Mike-DatabaseExpert/3.Design/M1_Data_Architecture_FSD_Mike.md`
- **M2 Workflow FSD**：`Alex-n8nExpert/3.Design/M2_Workflow_FSD_Alex.md`
- **M2 AI FSD**：`Sam-AIDeveloper/3.Design/M2_RAG_Pipeline_Draft_2025-11-09.md`

### 9.3 Skill 文档（✅ 已迁移到产品文档目录）

**✅ 迁移完成**：Skill 文档已从学习资料目录迁移到产品文档目录（`LEO_ProductManager/3.Design/Skills/`）。

| Skill | 文档路径 | 状态 |
|-------|---------|------|
| **kb-upload-qc** | `LEO_ProductManager/3.Design/Skills/kb-upload-qc.md` | ✅ 已迁移 |
| **faq-answering** | `LEO_ProductManager/3.Design/Skills/faq-answering.md` | ✅ 已迁移 |
| **faq-fallback** | `LEO_ProductManager/3.Design/Skills/faq-fallback.md` | ✅ 已迁移 |
| **faq-qa-review** | `LEO_ProductManager/3.Design/Skills/faq-qa-review.md` | ✅ 已迁移 |

**Skill 文档管理要求**：
- **版本管理**：Skill 文档必须进行版本管理，记录每次变更的内容和原因
- **评审流程**：Skill 文档必须经过评审流程，确保文档的准确性和完整性
- **更新维护**：Skill 文档必须及时更新维护，确保文档与实现保持一致
- **文档归档**：Skill 文档必须进行文档归档，确保文档的可追溯性和可维护性

### 9.4 协作文档
- **协作日志**：`LEO_ProductManager/5.Collaboration/CrossTeam_Collab_Log_2025-11-21.md`

---

**架构设计文档完成时间**：2025-11-23  
**创建者**：LEO (Product Manager)  
**状态**：✅ 已完成，可用于非产品部门展示

