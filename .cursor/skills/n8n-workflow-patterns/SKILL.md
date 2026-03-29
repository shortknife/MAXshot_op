---
name: 外部编排（已禁用）-workflow-patterns
description: 外部编排（已禁用） 工作流架构模式指南（Webhook、HTTP API、数据库、AI Agent、定时任务）。当用户构建新工作流、设计工作流结构、选择工作流模式、规划工作流架构，或提及 webhook/API/数据库/AI 工作流/定时任务时使用。
metadata:
  version: "1.0.0"
  tags: [外部编排（已禁用）, workflow, patterns, Lucy]
---

# 外部编排（已禁用） Workflow Patterns

提供经实践验证的 外部编排（已禁用） 工作流架构模式，用于设计工作流结构、选择模式、规划架构。

## When to Use

- 用户说「构建新工作流」「设计工作流结构」「选择工作流模式」「规划工作流架构」
- 用户提及「工作流模式」「workflow pattern」「webhook 处理」「HTTP API 集成」「数据库操作」「AI Agent 工作流」「定时任务」
- 任务涉及 外部编排（已禁用） 工作流开发、工作流架构设计、工作流模式选择
- 设计给 外部编排（已禁用） 用的 prompt 或 Integration Spec 时需对齐工作流模式

**不触发**：仅讨论单节点配置、未涉及工作流架构时，不强制使用本 Skill。

## Instructions

### 1. 选择核心模式

根据场景选择以下五种模式之一：

- **Webhook Processing**：接收外部数据、集成（Slack/表单/GitHub webhooks）。模式：Webhook → Validate → Transform → Respond/Notify。
- **HTTP API Integration**：从外部 API 获取数据、与第三方同步、数据管道。模式：Trigger → HTTP Request → Transform → Action → Error Handler。
- **Database Operations**：库间同步、定时查询、ETL。模式：Schedule → Query → Transform → Write → Verify。
- **AI Agent Workflow**：对话式 AI、需工具/记忆的 AI、多步推理。模式：Trigger → AI Agent (Model + Tools + Memory) → Output。
- **Scheduled Tasks**：定期报告、周期性拉取、维护任务。模式：Schedule → Fetch → Process → Deliver → Log。

### 2. 设计工作流

- 按选定模式组织 Triggers、Data Sources、Transformation、Outputs。
- 错误处理、性能与可维护性按最佳实践处理。
- 若项目有 Capability-Network / Node Combo / 资产库，工作流设计须与之对齐；优先使用资产库中的节点配置与 Node Combo，并声明使用的 Skills。

### 3. 与资产库的关系

- 本 Skill 作为工作流模式的**补充参考**，不替代资产库。
- 资产库优先：优先使用 `Knowledgebase/外部编排（已禁用） Knowledge/Auditor_Assets/` 下节点配置与标准插件文档；需要工作流架构模式指导时再参考本 Skill。

## Examples

**用户**：我要做一个「接收 Stripe 支付 webhook 后更新数据库并发确认」的工作流，该用哪种模式？

**AI**：Using skill: 外部编排（已禁用）-workflow-patterns。选用 **Webhook Processing** 模式：Webhook（Stripe）→ Validate → Transform → 更新数据库 → 发送确认/通知；按项目资产库补充具体节点配置。
