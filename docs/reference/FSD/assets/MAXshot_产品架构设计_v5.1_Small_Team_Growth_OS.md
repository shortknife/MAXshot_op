# MAXshot 产品架构设计 v5.1 (Small Team Growth OS)

> **创建日期**: 2026-02  
> **维护者**: LEO (Product Manager)  
> **状态**: ✅ **架构定案（Active）**  
> **版本**: v5.1（基于 v5.0 的务实演进，面向小微组织的增长操作系统）  
> **母版**: v5.0 (`MAXshot_产品架构设计_v5.0_Autonomous_Soul.md`)

---

## 📋 文档定位

本文档是 MAXshot v5.1 的**产品架构规格**。它在 v5.0 的基础上，吸收真实业务反馈与多轮产品顾问建议，做了**务实收敛**：

*   **战略定位**：从「有机灵魂的自主操盘手」收敛为「小微团队增长操作系统」。
*   **优先级**：Ops 数据可信化（P0）→ Marketing 策略闭环化（P1）→ 有限进化（P2）。
*   **v6.0 兼容**：内核遵守 v6.0 的确定性哲学，为未来 Control Plane 叠加预留接口。

**v5.1 产品定义对齐（2026-02-21）**：依据 `V5_1_PRODUCT_ALIGNMENT_MEMO_2026-02-21.md` 已融合：
*   **主产品**：客户/运营者用自然语言查询 MAXshot **业务日志与金库操作**；系统从业务数据（RPC + 结构化查询 + RAG）回答，而非仅内部治理表。
*   **副产品**：AI 辅助社媒运营（内容生成、发布、反馈闭环）。
*   **控制面**：Admin OS 为审计/控制台（confirm/run/replay/retry/expire），非客户核心价值。

**本文件定义**：
- **The Body**：Capability Network（继承 v5.0）。
- **The Brain**：简化版 Evolution，聚焦策略闭环与归因（非复杂自我反思）。
- **The Soul**：Static Soul 为主，Soul Feed / Dynamic Identity 延后。

---

## 🎯 一、架构愿景：Small Team Growth OS

### 1.1 战略定位
MAXshot 是 **Small Team Growth Operating System（小微团队增长操作系统）**。

*   **小微团队**：3–10 人，产品+运维+市场多角色兼任。
*   **增长**：数据可信、内容有效、策略可复盘。
*   **操作系统**：把产品、运维、市场三条线的「认知结构」标准化。

### 1.2 与 v5.0 的演进关系
| 维度 | v5.0 | v5.1 |
|------|------|------|
| 叙事 | 有机灵魂、自主操盘手 | 增长操作系统、可信助手 |
| Soul | Soul Feed + Dynamic Identity | Static Soul 为主 |
| Evolution | 完整 Hypothesis-Reflection 闭环 | 简化：标签+归因+周期复盘 |
| 产品形态 | 概念级 | 三入口分工：TG Bot（对话）+ Admin OS（配置/调试）+ Notion（内容管理） |

### 1.3 核心形态：Ops + Marketing 双主线（保持）
*   **Ops**：数据可信化，用最短路径拿到「数据事实」与「可解释结论」。
*   **Marketing**：策略闭环化，发布 + 归因 + 复盘。
*   **共享基座**：同一套 Capability Network + Memory Layer。

---

## 🏗️ 二、分层架构设计（继承 v5.0，增强 Ops/Marketing）

### 2.1 入口层（Entry Layer）
继承 v5.0 §2.1 的 EntryRequest 多通道协议与输入形态分类。

| 入口 | 定位 | 输入形态 | 适用场景 |
|------|------|----------|----------|
| **Telegram Bot** | 主对话入口 | `raw_query` | 快速查询、简单指令、日常交互 |
| **Admin OS** | 配置/调试面板 | `structured` | Capability 管理、审计查看、复杂任务配置（如 Campaign 策略） |
| **Notion** | 结构化内容管理 | `structured` / `timeline` | 内容 pipeline、publishing timeline、批量任务 |
| **System / Cron** | 内部调度 | `structured` / `timeline` | 定时任务、自动触发 |

**v5.1 的「极简」定义**：不是入口数量极简，而是**每个入口的交互极简** —— TG 不承载复杂配置，Admin OS 不变成需培训的重后台。

**Side Effect 确认机制**（继承 v5.0 §2.1.3）：任何 `side_effect` 操作先创建 Execution 标记为 `pending_confirmation`，用户确认后才触发 Router。

### 2.2 Task 与 Execution 分离
继承 v5.0 §2.2。P0 约束不变。

### 2.3 Router：确定性心脏
继承 v5.0 §2.3。**宪法级**：Router = 确定性调度器，LLM = 不可信建议源。

**行为类比（产品直觉）**：Router 和你在 Cursor 里接到任务时的行为一致——接到 Query 后，会**查询、获取、编排**（类似拆成多个子任务/Todo），直到**所有子项 Done**，再给你**一个整体结果**；过程中遇到信息不足或歧义时，会**提澄清式问题**，再根据你的回答继续编排，直到可以输出。Router 不做「大海捞针式 LLM 探库」，而是**受控的编排 + 必要时澄清 + 确定性调度**。

### 2.4 能力层（Capability Layer）
继承 v5.0 §2.5。核心 Capability 列表不变。Capability I/O Schema 规格基准见 v5.0 §4（CapabilityInput / CapabilityOutput Envelope）。

### 2.5 Memory Layer
继承 v5.0 §2.6。**v5.1 补充**：Experience 权重仅用于 Sandbox/离线分析，运行时不做动态权重推理（为 v6.0 兼容）。

### 2.6 Evolution Engine：简化版
**v5.1 收敛**：不做复杂 Self-Reflection，先做「策略闭环」。

*   **Phase 1（P1）**：每篇内容打标签、记录策略参数、记录发布结果。
*   **Phase 2（P2）**：简单多因子归因、周期复盘报告。
*   **Phase 3（P3）**：引入 Insight Memory、Hypothesis、推荐式优化。

**约束**：
*   进化只能发生在策略层，不得污染执行层。
*   **Recommendation Only**（继承 v5.0 §2.7.2）：Evolution 对 Router 的影响只能通过 Recommendation（建议）形式；Router 采纳或拒绝必须审计留痕。

### 2.7 Soul Layer：简化版
**v5.1 收敛**：

*   **保留**：Static Soul（PERSONA 红线、风格约束）、Soul Filter。
*   **延后**：Soul Feed、Dynamic Identity、复杂自我反思。

---

## 📊 三、Ops 数据可信化（P0）

### 3.1 核心原则
> **LLM = 解说员，数据库 = 唯一真相**

*   数据事实必须来自**强 Schema + SQL 直连**。
*   LLM 不允许推理数据，只允许解释数据。

### 3.2 新增/增强模块
| 模块 | 职责 | 说明 |
|------|------|------|
| **Intent Parser** | 理解用户真正想问什么 | Few-shot Examples + Clarification |
| **SQL Engine（三级策略）** | 生成并校验 SQL | 模板优先 + 受控生成 + 沉淀闭环（见 §3.4） |
| **Answer Formatter** | 把数据转成人话 | 数字 + 解释 + 简单可视化 |
| **Context Memory** | 记住对话历史 | 避免重复问、指代消解 |

### 3.4 SQL Engine 三级策略（替代原 SQL Validator）

> **设计哲学**：能走模板的走模板（确定性），模板覆盖不了的才让 LLM 参与（受控）。与「Router = 确定性调度器」一致。

| 级别 | 策略 | 说明 |
|------|------|------|
| **Tier 1（模板）** | Parametrized SQL Templates（白名单） | 高频 Ops 问题预设 SQL 模板，只填参数，**确定性执行**，零幻觉风险 |
| **Tier 2（受控生成）** | LLM + Schema 注入 + 规则校验 | 长尾问题：LLM 基于 Schema 上下文生成 SQL，必须通过白名单表/列校验 + 只读约束 |
| **Tier 3（沉淀）** | 成功查询沉淀为模板 | Tier 2 验证通过且复用 ≥ N 次的查询，可「毕业」为 Tier 1 模板（经人工审核） |

**路由逻辑**：Intent Parser 输出 intent → Router 先匹配 Tier 1 模板 → 无匹配则降级到 Tier 2 → Tier 2 结果可沉淀为 Tier 3。

### 3.3 验收标准
*   Ops 查询准确率 ≥ 90%（基于 50+ 常见问题测试集）。

---

## 📈 四、Marketing 策略闭环化（P1）

### 4.1 核心原则
> ** Marketing 不缺生成，缺的是「哪种内容有效」**

*   不做「更聪明的生成器」，先做「可追踪的归因器」。

### 4.2 新增机制
| 机制 | 职责 | 说明 |
|------|------|------|
| **Tagging System** | 每篇内容打标签 | style、time、topic、channel |
| **Feedback Recorder** | 记录发布后数据 | 阅读量、互动率 |
| **Simple Attribution** | 简单多因子分析 | 如「周五 meme 效果好」 |
| **Cycle Report** | 周期复盘报告 | 周/月级别 |

### 4.3 验收标准
*   内容效果（互动率等）较 Baseline 提升 30%+。

### 4.4 OpenClaw Growth Engine（Marketing 执行层）

**v5.1 副产品「AI 辅助社媒运营」的 Agent 执行层**由 OpenClaw Growth Engine 承担：1 主 3 子（二黑/眼镜/笔杆/广播），负责内容情报→生成→发布→数据写回；与 §4.2 的 Tagging/Feedback/Cycle Report 通过 Supabase 与周报对接。产品与白皮书融合说明见：`LEO_Decision_Layer/4.Working/产品架构_v5.1_v6.0_与_OpenClaw_Growth_Engine_融合说明_2026-03.md`。

---

## 🔌 五、产品形态：三入口分工

> **v5.1 的「极简」**：不是砍入口数量，而是**每个入口做好自己的事**。

### 5.1 三入口定义

| 入口 | 定位 | 交互形态 | 适用场景 |
|------|------|----------|----------|
| **Telegram Bot** | 主对话入口 | 自然语言对话 | 快速查询、简单指令、日常 Ops/Marketing 交互 |
| **Admin OS** | 配置/调试面板 | Web Dashboard | Capability 管理、审计日志查看、复杂任务配置（Campaign 策略等）、调试 |
| **Notion** | 结构化内容管理 | 数据库/表格 | 内容 pipeline、publishing timeline、批量任务、文档型配置 |

### 5.2 入口边界

*   **TG Bot 不承载**：复杂多步配置、表格型数据编辑、Capability 注册。
*   **Admin OS 不承载**：日常对话交互、自然语言查询（应走 TG Bot）。
*   **Notion 不承载**：实时操作、需即时响应的指令。

### 5.3 延后项
*   Soul Feed 自动化通道（v5.0 §2.8.1）、多份 .md 手动配置（v6.0 Boot 时再引入）。

---

## 🔗 六、v6.0 兼容约束（为未来 Control Plane 预留）

### 6.1 内核必须遵守
*   **运行时不学习**：无在线权重调整。
*   **所有执行可 Replay**：决策路径可复现。
*   **所有策略变化有记录**：Audit Log。
*   **Capability Registry**：每个单元有清晰 Registry。

### 6.2 预留字段
*   `instance_id`：为未来多实例管理预留。
*   `telemetry` 接口：为未来 Control Plane 上报预留。

---

## 📅 七、迭代优先级（v5.1 阶段）

| 阶段 | 目标 | 时间 |
|------|------|------|
| **P0** | Ops 数据可信化（准确率 90%+） | 2 周 |
| **P1** | Marketing 策略闭环（标签+归因+复盘） | 3–4 周 |
| **P2** | 有限进化（Insight、Hypothesis） | 后续 |

---

## 📌 八、与 v5.0 的关系

*   **v5.0**：保留为「愿景版」架构参考，冻结不再变更。
*   **v5.1**：当前**执行版**，面向小微组织 MVP。
*   **v6.0**：未来「Control Plane」层，当多单元需管理时启用。

---

**MAXshot v5.1**
*Small Team Growth OS.*
*Data Trust. Strategy Loop. Deterministic.*
