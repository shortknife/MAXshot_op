# AGENTS.md

> **版本**: v1.0
> **创建日期**: 2026-02-05
> **主工作区**: MAXshot_opencode/
> **参考资料**: MAXshot/ (只读，未修改）

---

## 项目说明

### MAXshot_opencode - 主工作区

**位置**: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/`

**目录结构**:
```
MAXshot_opencode/
├── FSD/                           ✅ 产品架构文档集 (v5.0)
│   ├── 00_Read_First/
│   ├── 01_User_Journey/
│   ├── 02_Layer_Model/
│   ├── 03_Execution_Model/
│   ├── 04_Working_Mind/
│   ├── 05_Intelligence_Boundary/
│   ├── 06_Intent_Analyzer/
│   ├── 07_Skills_Compatibility/    ✅ Skill 规范
│   ├── 08_System_Integration/
│   ├── 09_Observability/
│   └── 10_Appendix/
├── MAXshot_产品架构设计_v5.0_Autonomous_Soul.md
└── .cursor/skills/               ✅ 核心 Skills (从 MAXshot/ copy)
    ├── explore/                   ✅ 代码库搜索
    ├── sisyphus/                 ✅ 主编排代理
    ├── document-writer/           ✅ 技术文档专家
    ├── frontend-engineer/         ✅ 前端 UI/UX 专家
    ├── oracle/                   ✅ 技术顾问
    ├── librarian/                 ✅ 文档研究专家
    └── github/                   ✅ GitHub CLI
```

### MAXshot - 参考资料 (只读)

**位置**: `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/`

**说明**: 该目录包含完整的项目代码和技能库，作为参考资料。任何需要的有价值内容都应 copy 到 MAXshot_opencode/ 后使用。

---

## 已安装的核心 Skills

### 1. explore - 代码库搜索

**版本**: v1.0.0 | **来源**: MAXshot/.cursor/skills/explore/

**用途**: 在当前项目内快速定位代码、文件和模式；多角度搜索（文件名、内容、符号、AST、Git 历史）

**触发条件**:
- 需要查找代码位置、搜索文件/模块、理解代码结构、追踪函数调用链、找相似实现
- 用户说「在哪里」「哪个文件」「找一下」「搜索」「定位」等

---

### 2. sisyphus - 主编排代理

**版本**: v1.0.0 | **来源**: MAXshot/.cursor/skills/sisyphus/

**用途**: 在多步骤、多文件场景下规划、委派、并行执行复杂开发任务；TODO 驱动

**触发条件**:
- 复杂功能开发、代码重构、需要研究+实现、多文件协调修改
- 用户说「帮我实现」「开发这个功能」「重构」「构建」等

---

### 3. document-writer - 技术文档专家

**版本**: v1.0.0 | **来源**: MAXshot/.cursor/skills/document-writer/

**用途**: 将复杂代码库转化为准确、清晰、有用的文档；遵循准确性第一、读者导向、代码即真相、渐进披露

**触发条件**:
- 需要编写 README、API 文档、架构文档、用户指南、变更日志、注释/JSDoc
- 用户说「写文档」「README」「API 文档」「使用说明」「注释」等

---

### 4. frontend-engineer - 前端 UI/UX 专家

**版本**: v1.0.0 | **来源**: MAXshot/.opencode/skills/oc-skill/frontend-engineer.skill.md

**用途**: 前端 UI/UX 设计开发专家，擅长将设计转化为精美的界面实现；即使没有设计稿也能创造美观界面

**触发条件**:
- 创建新的 UI 组件、改进界面视觉效果、实现动画和交互、响应式设计、设计系统构建
- 用户说「UI」「界面」「组件」「样式」「动画」「好看」「美化」「设计」等

**包含内容**:
- 设计流程 (开始之前必问、设计决策)
- 美学指南 (排版、色彩、动效、空间、深度)
- 组件模式 (按钮、卡片、输入框)
- 反模式 (避免)
- 检查清单

---

### 5. oracle - 技术顾问

**版本**: v1.0.0 | **来源**: MAXshot/.opencode/skills/oc-skill/oracle.skill.md

**用途**: 专家级技术顾问代理，专注于架构决策、代码审查、调试指导和工程建议；不执行代码修改，而是提供深度分析和战略建议

**触发条件**:
- 架构设计决策、代码审查和质量评估、复杂 bug 调试、技术选型建议、性能优化策略、重构方案设计
- 用户说「架构」「设计」「审查」「为什么」「应该怎么」「最佳实践」等

**专业领域**:
- 架构评审、代码审查、调试指导、技术选型

---

### 6. librarian - 文档研究专家

**版本**: v1.0.0 | **来源**: MAXshot/.opencode/skills/oc-skill/librarian.skill.md

**用途**: 外部文档研究和实现参考代理；从海量信息中提取精准、可操作的答案

**触发条件**:
- 查找官方文档和 API 参考、研究开源项目实现、寻找最佳实践和设计模式、查找 GitHub issues/PRs 历史、跨项目研究特定功能实现
- 用户说「怎么用」「有没有例子」「文档在哪」「其他项目怎么做的」「最佳实践」「官方推荐」等

**三种运行模式**:
- **TYPE A**: 概念性问题 (什么是 XXX / 怎么理解 YYY)
- **TYPE B**: 实现参考 (怎么实现 XXX / 有没有 YYY 的例子)
- **TYPE C**: 上下文与历史 (为什么这样设计 / 这个问题有没有人遇到过)

---

### 7. github - GitHub CLI

**版本**: v1.0.0 | **来源**: MAXshot/.opencode/skills/oc-skill/github.skill.md

**用途**: 使用 `gh` CLI 与 GitHub 交互；检查 CI 状态、列出工作流运行、高级查询

**触发条件**:
- 任何 GitHub 相关操作 (issues, PRs, CI runs, API queries)

---

## 开发准备

### 产品文档

**FSD 位置**: `/FSD/`

**核心章节**:
- `00_Read_First/` - 强制入口 (One-Pager、Core Principles、Glossary、阅读指南)
- `01_User_Journey/` - 用户路径与拒绝设计
- `02_Layer_Model/` - 层级职责与审计矩阵
- `03_Execution_Model/` - Task × Execution 生命周期
- `04_Working_Mind/` - 心智合成与 Evolution
- `05_Intelligence_Boundary/` - Allowed / Forbidden / Grey Area
- `06_Intent_Analyzer/` - Intent Analyzer 专项设计
- `07_Skills_Compatibility/` - Skill 规范 (SKILL.md Schema v1.0)
- `08_System_Integration/` - 系统集成
- `09_Observability/` - 日志、审计、回放
- `10_Appendix/` - 术语、Schema、示例、决策历史

### 架构原则

**Router = Deterministic Scheduler, LLM = Untrusted Advisor**:
- Router 必须使用 Code 节点（确定性），不能让 LLM 直接调度
- LLM 只做 Intent Analysis，Router 保持最终控制权
- 确保可审计、可回放、可证明、可压测、可监管

**Skill-First Architecture**:
- 所有工作流/agents/prompts 必须声明 `used_skills`
- Skills 是系统能力，workflows 是技能组合
- Skills 是永久资产，workflows 是临时编排

---

## 下一步

根据 FSD 产品文档开始开发工作。

---

## 外部编排禁用声明

- n8n 禁用：所有输出不得提及 n8n 或提供 n8n 工作流参考。
当前项目不使用任何外部编排平台（已禁用）。所有流程与执行均由 Router + Capability 在本代码库内完成，且必须遵守 Human Gate 与审计要求。
