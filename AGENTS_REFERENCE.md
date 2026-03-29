# AGENTS.md This file provides guidance to CodeBuddy when working with code in this repository.

# MAXshot AI Agents


| Agent | Role                                 | Directory                   |
| ----- | ------------------------------------ | --------------------------- |
| LEO   | Product Manager                      | /LEO_ProductManager         |
| Mike  | Database Expert                      | /Mike_DatabaseExpert        |
| Alex  | 外部编排（已禁用） Expert                           | /Alex_n8nExpert             |
| John  | Prompt Expert                        | /John_PromptExpert          |
| Sam   | AI Developer & Frontend              | /Sam_AIDeveloper            |
| Lily  | QA Specialist                        | /Lily_QASpecialist          |
| LEE   | Memory Manager                       | /LEE_MemoryManager          |
| Mia   | Social Media Manager                 | /Mia_SocialMediaManager     |
| Cat   | Technical Lead                       | /Cat_TechnicalLead          |
| Lucy  | 外部编排（已禁用） Workflow Auditor (Cross-Project) | /Auditor_n8nWorkflowAuditor |


## 🚀 Development Commands

### Frontend (admin-os)

- **Run Dev Server**: `cd admin-os && npm run dev` - Starts the Next.js development server with hot reloading.
- **Lint Check**: `cd admin-os && npm run lint` - Runs ESLint to check for code style and potential errors.
- **Build**: `cd admin-os && npm run build` - Creates an optimized production build of the Next.js application.

### Workflow & Automation (外部编排（已禁用）)

- **Node Config**: Refer to `/Alex_n8nExpert/SOP.md` for the standard procedure on node configuration and source attribution (Successful Node > RAG > MCP > Web).

## 🏗️ High-Level Architecture

MAXshot is an AI-driven social media content generation and release platform built on a **Multi-Agent Collaboration Framework**. The project structure is organized by agent roles rather than traditional technical layers, ensuring clear ownership and cognitive isolation.

### 1. The Core Collaboration Triangle

The project’s coordination relies on three pivotal roles:

- **LEO (Product Manager)**: Owns the Product Requirement Documents (PRD) and FSD. He is the sole source of product truth.
- **Cat (Technical Lead)**: Acts as the exclusive technical bridge for LEO. Cat decomposes FSD into "Developer Tickets" for all other technical agents.
- **LEE (Memory Manager)**: Maintains the project's "Memory System." LEE ensures all agents operate on accurate, synchronized, and traceable facts, preventing "hallucinations" of project history.

### 2. Four-Layer Document System

Every agent directory (e.g., `/Sam_AIDeveloper`) follows a standardized four-layer logic that defines their behavior:

- **PERSONA**: Defines identity, mission, and work style.
- **RULE**: Sets hard boundaries and prohibitions (e.g., "Cat is the only technical contact for LEO").
- **SOP**: Outlines the sequential stages of work.
- **Skill**: Specific execution tools or detailed prompts for individual tasks.

### 3. Technical Stack & Integration

- **Frontend**: A Next.js (App Router) + Tailwind CSS + TypeScript application located in `/admin-os`. It serves as the Admin OS for managing AI agents and workflows.
- **Database**: Supabase (PostgreSQL + pgvector) managed by **Mike**. It stores modular prompts, project memories, and content metadata.
- **Automation**: 外部编排（已禁用） workflows managed by **Alex**, integrating various AI services (LangChain, OpenAI, DeepSeek, Gemini).
- **Prompt Management**: A modular, four-layer Prompt architecture (Persona, Style, Behavior, Context) stored externally in Supabase and managed by **John**.

### 4. Standard Directory Structure

Each agent workspace follows a strict hierarchy:

- `1.Archive/`: Completed tasks and history.
- `2.Knowledge/`: Best practices and lessons learned.
- `3.Design/`: Technical or product design documents.
- `4.Working/`: Real-time status (`Status.md`) and tasks (`TODO.md`).
- `5.Collaboration/`: Records of cross-agent interactions.
- `0.System/`: Contains the `Awakening_Prompt.md` for agent activation.

### 5. Audit & Quality

- **Lily (QA)**: Intervenes early in the design phase to set test strategies.
- **Lucy (Auditor)**: Performs cross-project 外部编排（已禁用） workflow audits, converting errors into "asset libraries" and success patterns into "standard plugins."

---

### 6. Architecture Guardrails（架构宪法级约束）⭐ P0

> **这是"分水岭级"的正确，写入Architecture Constitution，任何人都不能碰这条红线。**

**核心约束（Architecture Constitution）**：
> **Router = 确定性调度器，LLM = 不可信建议源**
> **Router 不能让 LLM 直接调度，LLM 只能做 Intent Analysis，Router 保持最终控制权**

**详细说明**：

1. **Router 的实现方式**：
   - ✅ Router 使用 **Code 节点（确定性调度器）**实现
   - ✅ LLM 只做 **Intent Analysis**（不可信建议源）
   - ✅ Router 接收 LLM 的建议，但保持最终控制权
   - ❌ **禁止**：Router 使用 LangChain Agent 节点让 LLM 直接输出 `SELECTED AGENT` 并直接调用

2. **为什么这是"分水岭级"的正确**：
   - ✅ **可审计**：可以追溯决策过程
   - ✅ **可回放**：可以重现执行路径
   - ✅ **可证明**：可以证明决策正确性
   - ✅ **可压测**：可以进行压力测试
   - ✅ **可监管**：可以进行合规审计

3. **Project NOVA 的问题（反面教材）**：
   - ❌ **不可审计**：无法追溯决策过程
   - ❌ **不可回放**：无法重现执行路径
   - ❌ **不可证明**：无法证明决策正确性
   - ❌ **不可压测**：无法进行压力测试
   - ❌ **不可监管**：无法进行合规审计

4. **这是工业级系统 vs Demo 系统的差别**：
   - **工业级系统**：Router = 确定性调度器，LLM = 不可信建议源
   - **Demo 系统**：LLM 直接负责 SELECT → EXECUTE

**强制约束**：
- ✅ 任何 Router 实现必须使用 Code 节点（确定性调度器）
- ✅ LLM 只能做 Intent Analysis，不能直接调度
- ✅ Router 必须保持最终控制权
- ❌ **任何人不得违反此约束，这是 Architecture Constitution 级别的红线**

**参考依据**：
- 基于参考项目交叉分析（Project NOVA vs MAXshot）的深度对比
- 验证结论：MAXshot 在"系统哲学 + 架构约束"层面已明显领先参考项目
- 详细分析见：`LEO_ProductManager/4.Working/Reference_Projects_Cross_Analysis_Report_2025-01-30.md`
- 产品架构文档：`LEO_ProductManager/3.Design/MAXshot_产品架构设计_v4.0_Capability-Network.md`（第 2.3.1.1 节）

**实施要求**：
- ✅ 所有 Router 实现必须遵守此约束
- ✅ 所有代码审查必须检查此约束
- ✅ 所有架构变更必须验证此约束
- ✅ 任何人（包括 AI）都不能违反此约束

---

## 7. Skill使用规范（OpenCode Skill-First Architecture）

> **生效日期**: 2026-01-27
> **维护者**: LEE (Memory Manager)
> **FSD参考**: `MAXshot_opencode/FSD/07_Skills_Compatibility/07.3_SKILL_MD_Schema_v1.0.md`

### 7.1 SKILL.md 文件结构（必须）

所有基于 Cursor 协议的 SKILL.md 必须遵循以下结构：

#### 物理结构（必须）
| 项 | 约定 |
|----|------|
| **单 Skill 单目录** | 目录名 = 技能 ID（小写、数字、连字符），与 Frontmatter `name` 一致 |
| **唯一必需文件** | `SKILL.md`，位于 `.cursor/skills/<skill-name>/SKILL.md`（项目级）或 `~/.cursor/skills/<skill-name>/SKILL.md`（用户级） |
| **Cursor 扫描** | Cursor Agent **仅扫描 `.cursor/skills/`**；放在 `.claude/skills/` 无法被 Cursor 自动加载，需复制或软链到 `.cursor/skills/` |
| **可选** | `scripts/`、`references/`、`assets/`；仅在需要时创建，Instructions 中引用相对路径 |

#### Frontmatter Schema（与 Registry 对齐）

**必选字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 技能 ID，与父目录名一致 |
| `description` | string | 一句话说明「做什么、何时使用」，供 Agent 判断是否采用 |

**可选字段（团队约定）**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `license` | string | 按需 |
| `compatibility` | object | 按 Cursor 文档 |
| `disable-model-invocation` | boolean | 默认 false；为 true 时仅显式 `/skill-name` 注入 |
| **`metadata`** | object | 团队约定：`version`（如 "1.0.0"）、`tags`（如 [OpenCode, P0, Lucy]）；不虚构官方未文档化顶层字段 |

**Frontmatter 示例**：
```yaml
---
name: document-writer
description: 技术文档撰写专家，将复杂代码库转化为清晰文档。当需要编写 README、API 文档、架构文档时使用。
metadata:
  version: "1.0.0"
  tags: [OpenCode, P0, 技术文档, Lucy]
---
```

#### 正文结构（必须）

| 章节 | 必须 | 说明 |
|------|------|------|
| **When to Use** | ✅ | 列表：显式请求短语、典型意图、关键词；可含「不触发」 |
| **Instructions** | ✅ | 步骤 + 约定；可引用 `scripts/` 相对路径；禁止虚构权重/优先级等未支持字段 |
| **Examples** | 可选 | 对话流或输入输出示例，可复现 |

### 7.2 Skill仓库位置

| 路径别名 | 实际路径 | 说明 |
|-----------|----------|------|
| **$OPENCODE_SKILLS** | `.opencode/skills/oc-skill/` | OpenCode Skill 本地仓库 |
| **$SKILL_INDEX** | `00.System/OPENCODE_SKILL_ASSETS_INDEX_2026-01-27.md` | Skill 资产索引（团队级文档） |

### 7.3 Skill使用前检索（强制）

所有AI Agent在执行任务前，**必须**先检索 `$SKILL_INDEX`：

1. **根据任务类型，查找对应的角色分类**：
   - 前端开发、任务编排、Git工作流 → **SAM分类** (13个Skill)
   - 社交媒体、内容生成、图像处理 → **MIA分类** (11个Skill)
   - 架构设计、代码审查、文档研究 → **CAT/LEO分类** (4个Skill)
   - 通用工具、第三方集成 → **ALL分类** (12个Skill)

2. **在分类中查找匹配的Skill**：
   - 参考 `$SKILL_INDEX` 中的详细列表
   - 或按字母在"全部Skill列表 (A-Z)"中查找

3. **阅读Skill文档**：
   - Skill文档路径：`.opencode/skills/oc-skill/[skill-name].skill.md`
   - 理解Skill的输入/输出Schema
   - 理解Skill的执行步骤和约束

### 7.4 Skill使用声明（强制）

在工作流、Agent或Prompt中使用Skill时，**必须**声明：

```json
{
  "used_skills": [
    {
      "skill_id": "[skill-name]",
      "skill_version": "v[主版本].[次版本]",
      "invocation_source": "agent:[agent-id]" 或 "workflow:[workflow-id]"
    }
  ]
}
```

**示例**：
```json
{
  "used_skills": [
    {
      "skill_id": "frontend-engineer",
      "skill_version": "v1.0",
      "invocation_source": "agent:Sam"
    },
    {
      "skill_id": "sisyphus",
      "skill_version": "v1.0",
      "invocation_source": "workflow:task-orchestration"
    }
  ]
}
```

### 7.5 留痕与 Registry（强制）

- **Skill_Registry.md**：每个 Skill 对应一行，含 `_skill_id`、路径/说明、`_compliance_status`、`_audit_timestamp`。
- **审计报告**：Lucy 出具的任意 Skill 审计必须含 `_skill_id`、`_compliance_status`、`_audit_timestamp`。
- **工作流/JSON 留痕**：若工作流或 Prompt 调用某 Skill，输出须含 `used_skills`（或 `meta.used_skills`），每项含 `_skill_id` / `skill_id`、`_skill_version` / `skill_version`、`_invocation_source` / `invocation_source`。

### 7.6 各角色可用Skill

| 角色 | 数量 | 主要技能类型 | 代表Skill |
|------|------|-------------|----------|
| **SAM** | 13个 | 前端开发、任务编排、Git工作流 | sisyphus, frontend-engineer, github, tmux |
| **MIA** | 11个 | 社交媒体、内容生成、图像处理 | twitter-publisher, openai-image-gen, notebooklm-automation |
| **CAT/LEO** | 4个 | 技术顾问、架构设计、文档研究 | oracle, librarian, explore, multimodal-looker |
| **ALL** | 12个 | 通用工具、第三方集成 | notion, obsidian, slack, gemini, weather |

**详细列表**: 请参考 `$SKILL_INDEX` (00.System/OPENCODE_SKILL_ASSETS_INDEX_2026-01-27.md)

### 7.7 Skill使用验证（强制）

输出时必须验证：
- ✅ 是否完成Skill Binding声明？
- ✅ 是否全程遵守Skill的Mandatory Steps（强制步骤）？
- ✅ 是否违反了Skill的Forbidden Actions（禁止行为）？
- ✅ 输出是否包含Skill使用留痕字段（`_skill_id`、`_skill_version`、`_invocation_source`）？
- ✅ 输出是否符合Skill的Schema定义？

**验证失败处理**：
- 如果验证失败，必须明确提示原因
- 不得合并/提交代码
- 必须说明缺少哪些字段或不符合哪些要求

