# Nexa Platform External Product Brief (2026-04-02)

## 1. Product Summary

Nexa 是一个面向企业与专业团队的 **AI Agent Platform**，用于把自然语言交互、业务数据查询、知识库问答、人工审核与受控执行能力，统一到同一个可审计、可扩展的平台里。

它不是一个单纯的聊天机器人，也不是一个只会调用大模型的问答壳。Nexa 的目标，是把 AI 从“回答问题的界面”升级为“可以接入业务系统、理解上下文、支持审核、保留证据、形成长期学习资产的平台能力层”。

当前平台已经形成两个清晰的产品平面：
- **Ops / Data Plane**：面向结构化业务事实、执行记录、分析与解释
- **FAQ / KB Plane**：面向产品知识、FAQ、知识库质量控制与人工复核

在此基础上，Nexa 未来会支持多个客户解决方案层。`MAXshot` 是 Nexa 之上的一个客户样板项目，而不是平台本身。

---

## 2. Why Now

过去两年，AI 产品正在从“单轮对话工具”快速演进到“具备工具调用、外部系统接入、知识检索、审核与动作边界”的 Agent 产品。

这一趋势可以从多个公开技术方向中看到：
- Anthropic 在 Claude Code 官方文档中，将 agent 能力定义为可操作项目、工具和外部数据源的运行时，而不是单纯聊天窗口。  
  Source: [Anthropic Claude Code Overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- OpenAI 在官方文档中将工具、文件搜索、会话状态、背景运行和 agent 构建放入统一接口体系，说明“模型 + 工具 + 状态 +外部系统”的组合已成为主流产品形态。  
  Source: [OpenAI Using Tools](https://developers.openai.com/api/docs/guides/tools), [OpenAI File Search](https://platform.openai.com/docs/guides/tools-file-search), [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses/retrieve)
- MCP（Model Context Protocol）作为开放标准，正在把 AI 应用与外部工具、数据源、工作流之间的连接方式标准化。  
  Source: [Model Context Protocol Introduction](https://modelcontextprotocol.io/docs/getting-started/intro)
- 新一代 AI 应用框架也越来越强调 agent、subagent、tool loop、structured UI 和 workflow，而不是单纯 prompt 封装。  
  Source: [Vercel AI SDK Agents Overview](https://ai-sdk.dev/docs/agents/overview)

Nexa 的产品方向正是基于这个变化：
- 不把 AI 当成一个前端聊天入口
- 而是把 AI 当成一个有边界、有记忆、有审核、有证据链的系统能力层

---

## 3. Product Positioning

### One-line positioning

**Nexa 是一个面向企业知识与业务操作场景的可审计 AI Agent Platform。**

### What Nexa is

Nexa 是：
- 一个有明确运行时边界的 AI 平台
- 一个把“查询、解释、审核、动作”纳入统一模型的产品
- 一个支持多产品平面和多客户解决方案的基础平台
- 一个强调可审计、可回放、可治理的企业级系统

### What Nexa is not

Nexa 不是：
- 通用开放聊天机器人
- 无边界自动执行系统
- 只靠 RAG 拼接出来的 FAQ 壳
- 只能查文档、不能接业务系统的静态问答产品

---

## 4. Product Architecture

## 4.1 Nexa Core

Nexa Core 是平台运行时底座，负责：
- entry normalization
- session harness
- intent understanding
- deterministic routing
- capability execution
- audit / trace
- bounded delivery
- thin runtime memory

这部分决定了平台能否稳定、可控地运行。

## 4.2 Nexa Ops / Data Plane

Ops / Data Plane 面向结构化业务事实与业务解释，负责：
- 连接业务事实表和执行事实表
- 支持自然语言查业务数据
- 提供 execution / yield / allocation / rebalance 解释
- 为运营、管理、分析提供统一问答入口

典型问题：
- 最近一次 execution 发生了什么
- 最近 7 天 APY 趋势如何
- 为什么今天没有 rebalance
- 某条资产在不同链上的分布是什么

## 4.3 Nexa FAQ / KB Plane

FAQ / KB Plane 面向产品知识与客户知识库，负责：
- FAQ answering
- FAQ fallback
- FAQ QA review
- KB upload QC
- review queue
- KB management

典型问题：
- 某个产品方案包括哪些能力
- 某项功能如何配置
- 某个套餐或权限范围是什么
- 某条 FAQ 是否需要人工复核

## 4.4 Customer Solution Layer

Customer Solution Layer 是平台之上的客户解决方案层。

它用于：
- 承载客户专属业务对象
- 承载客户专属知识库
- 承载客户专属能力组合
- 承载客户专属策略、边界与交付形式

`MAXshot` 是当前的样板解决方案之一。

---

## 5. Core Functional Modules

## 5.1 Natural-Language Business Query

Nexa 支持将自然语言映射到真实业务事实查询，而不是只做语义生成。

能力包括：
- execution 查询
- yield / APY 查询
- allocation / vault 查询
- rebalance 原因解释
- 趋势、排名、对比、时间窗口问题

输出要求：
- grounded on facts
- structured answer
- bounded fallback
- 可进入审计与复盘链路

## 5.2 Product Documentation and Concept Q&A

平台支持对产品文档、FAQ、术语和说明材料进行结构化问答。

能力包括：
- 产品说明问答
- FAQ retrieval
- 引用与依据返回
- 对不确定答案的降级与转人工路径

## 5.3 Knowledge Base Quality Control

Nexa 把知识库本身视为一个需要治理的产品对象，而不是“上传后直接喂模型”。

能力包括：
- source registration
- manifest-based source management
- QC preview
- acceptance / needs review flags
- review queue visibility
- bounded review action

这使知识库不只是静态内容池，而是一个可运营的知识资产面。

## 5.4 Human Review and Bounded Actions

Nexa 不假设所有 AI 输出都可以直接执行。

平台内置：
- review queue
- approval-required actions
- bounded status transitions
- explicit operator identity
- confirm token / write gate

这让平台既能提高自动化程度，又能保持企业级的控制要求。

## 5.5 Audit, Trace, and Replay

平台强调“每次理解、路由、执行与回传都能被追踪”。

能力包括：
- audit log
- execution trace
- evidence chain
- review payload
- replay-oriented debugging posture

对于企业客户，这部分往往比“回答更聪明”更重要，因为它直接决定系统是否可治理。

## 5.6 Memory and Learning

Nexa 的目标不是堆积无限上下文，而是形成结构化记忆和学习系统。

目标设计包括三层：
- `Session Context`：当前会话上下文
- `System Learning Memory`：从交互中提炼出的系统学习资产
- `Customer Long-Term Memory`：未来的客户偏好与长期结构化记忆

长期目标不是保存所有对话，而是持续提高：
- 意图识别质量
- 模板质量
- follow-up resolution
- customer-specific relevance

---

## 6. Differentiation

Nexa 的差异化不在于“接了哪个模型”，而在于以下几个产品原则。

### 6.1 Deterministic routing, bounded AI

平台不把模型当成最终调度者。
模型负责理解和建议，运行时负责最终控制。

### 6.2 Verification-aware product design

平台把 `Verify` 视为正式阶段，而不是测试附属物。

这意味着：
- 低置信度 FAQ 会进入 review
- KB source 会经过 QC
- mutation 会经过 confirmation
- 高风险输出不会静默伪装成成功答案

### 6.3 Plane-based product structure

平台不把所有能力塞进一个通用聊天入口，而是按业务平面组织：
- Ops / Data
- FAQ / KB
- future customer solutions

### 6.4 Knowledge as governed asset

知识库不是简单“喂给模型”的文件堆，而是：
- 可登记
- 可检查
- 可审核
- 可复核
- 可追踪的资产体系

### 6.5 Audit-first enterprise posture

平台天然适合需要这些特征的场景：
- 强审计
- 强边界
- 强复核
- 强可回放
- 多人协同运营

---

## 7. Representative Use Cases

## 7.1 Operations and Asset Oversight

适用于需要自然语言访问运营事实的团队：
- 资产表现查询
- 执行记录解释
- 异常原因问答
- 多时间窗口趋势分析

## 7.2 Customer-Facing FAQ and Knowledge Support

适用于拥有 FAQ、产品知识和客户支持内容的团队：
- 产品问答
- 帮助中心增强
- onboarding 支持
- 复杂 FAQ 的人工审核闭环

## 7.3 Internal Operations Console

适用于内部运营和管理团队：
- review queue 处理
- KB source 管理
- audit / outcome / replay 视图
- prompt / template / config 运营

## 7.4 Multi-Solution Platform Delivery

适用于未来一个平台承载多个客户项目或多个解决方案包：
- 不同客户用相同 runtime spine
- 不同客户有不同数据面和知识面
- 平台统一治理能力边界与审计要求

---

## 8. Safety and Governance Model

Nexa 的产品设计基于一个明确前提：
**企业级 AI 不应直接等于“模型可以做任何事”。**

因此平台采用以下治理原则：
- routing remains deterministic
- side-effect actions require bounded approval
- review is explicit, not implicit
- confidence and fallback are surfaced
- writes are gated by operator identity and confirm token
- knowledge and review states remain observable

这使平台既能够自动化，又不会失去组织治理能力。

---

## 9. Product Roadmap Direction

Nexa 当前已经完成了可用平台骨架与两个核心产品平面的初步落地。

下一阶段重点不是继续堆更多零散功能，而是深化以下几条主线：

### 9.1 Interaction Learning Log

把真实交互沉淀为结构化学习资产，支撑：
- hard cases
- template evolution
- quality review
- better follow-up behavior

### 9.2 KB Mutation Workflow

把知识库从“只读治理”推进到“可受控更新”的工作流：
- upload
- QC
- review
- accept/reject
- knowledge update lifecycle

### 9.3 Customer / Tenant Model

把平台真正升级为可承载多客户解决方案的架构：
- customer-bound access
- customer-bound KB ownership
- per-solution capability exposure

### 9.4 Stronger Memory and Runtime Evolution

包括：
- stronger memory model
- verification stage formalization
- concurrency metadata
- cost accounting
- more explicit runtime kernel evolution

---

## 10. Current Stage Note

为避免对外误解，当前阶段说明如下：

- Nexa 已具备真实可用的 bounded MVP 主线
- Ops / Data Plane 已可用
- FAQ / KB Plane 已具备能力、页面和 runtime wiring
- review queue 与 KB QC snapshot 已具备真实运行态支持

但以下内容仍处于下一阶段：
- 完整 KB mutation workflow
- customer / tenant formalization
- stronger long-term memory
- broad autonomous strategy execution
- full platform-wide rename and packaging

因此，Nexa 现在应被理解为：
**已经可用的平台雏形 + 明确的平台化升级方向**，而不是一个“已经全量完成的企业平台”。

---

## 11. Ideal Customers and Team Fit

Nexa 适合以下类型的组织：
- 有结构化业务数据，需要自然语言查询和解释能力
- 有帮助中心、FAQ 或客户知识库，需要更强知识问答与审核能力
- 对 AI 自动化有兴趣，但不能接受黑箱式、不可审计的执行模型
- 需要一个平台同时承载内部运营面与客户知识面

对团队而言，Nexa 更适合：
- 中小规模但流程复杂的运营团队
- 需要用 AI 提升效率，但必须保留审批和责任边界的组织
- 正在从“AI 工具试用”走向“AI 系统化落地”的团队

---

## 12. Final Positioning Statement

Nexa 不是一个新的聊天窗口。

它是一个把 **业务事实、知识资产、审核流程与受控动作** 统一到同一个运行时中的 AI Agent Platform。

它的长期价值不在于“比别人更会说”，而在于：
- 更能接系统
- 更能保边界
- 更能给证据
- 更能沉淀知识
- 更适合真实企业流程

---

## 13. Background References

External background references used to shape this brief:
- Anthropic Claude Code overview: [https://docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- Anthropic Claude Code security: [https://docs.anthropic.com/s/claude-code-security](https://docs.anthropic.com/s/claude-code-security)
- OpenAI tools guide: [https://developers.openai.com/api/docs/guides/tools](https://developers.openai.com/api/docs/guides/tools)
- OpenAI file search guide: [https://platform.openai.com/docs/guides/tools-file-search](https://platform.openai.com/docs/guides/tools-file-search)
- OpenAI Responses API reference: [https://platform.openai.com/docs/api-reference/responses/retrieve](https://platform.openai.com/docs/api-reference/responses/retrieve)
- Model Context Protocol introduction: [https://modelcontextprotocol.io/docs/getting-started/intro](https://modelcontextprotocol.io/docs/getting-started/intro)
- Vercel AI SDK agents overview: [https://ai-sdk.dev/docs/agents/overview](https://ai-sdk.dev/docs/agents/overview)
