# MAXshot 产品架构设计 v5.0 (Autonomous Operator | Capability-Network | Full Spec)

> **创建日期**: 2026-02-03  
> **维护者**: LEO (Product Manager)  
> **状态**: ✅ **架构冻结（Frozen）**  
> **优先级**: P0  
> **版本**: v5.0（v4.1 工程规格 + v5.0 灵魂架构的完整融合版）  

---

## 📋 文档定位

本文档是 MAXshot 的**终极产品架构宪法**。它融合了 v4.1 的**工程严谨性**（治理型能力网络、确定性调度、输入协议）与 v5.0 的**核心生命力**（有机灵魂、定性量化进化、原子化记忆）。

**本文件定义**：
- **The Body**：Capability Network 的详细契约与调度逻辑。
- **The Brain**：Evolution Engine 的定性量化闭环与 Memory 原子化组装。
- **The Soul**：Organic Soul 的生长机制与滤镜作用。

---

## 🎯 一、架构愿景：Autonomous Operator with Organic Soul

### 1.1 物种定义
MAXshot 不再是一个 Chatbot 或工具集合，它是 **"An Autonomous Operator with Organic Soul"（拥有有机灵魂的自主操盘手）**。

*   **自主 (Autonomous)**：不仅执行指令，更背负指标（Target-Driven）。
*   **操盘手 (Operator)**：具备策略能力，能提出假设、执行、复盘、优化。
*   **有机灵魂 (Organic Soul)**：人格不写死，随市场/团队/产品阶段共同生长（Fluid Narrative）。

### 1.2 系统隐喻：三位一体
*   **The Body（躯体 - Capability Network）**：稳定、确定性的执行层。负责“手脚麻利”。
*   **The Brain（大脑 - Evolution Engine）**：基于经验的策略引擎。负责“假设-验证-反思”。
*   **The Soul（灵魂 - Organic Soul Layer）**：价值观与风格的滤镜。负责“我是谁”。

### 1.3 核心形态：Ops + Marketing 双主线
*   **产品运维（Ops）**：用最短路径拿到“数据事实”与“可解释结论”。
*   **市场运营（Marketing）**：用“主题驱动 + 进化引擎”完成增长闭环。
*   **共享基座**：同一套 Capability Network + Memory Layer。

---

## 🏗️ 二、分层架构设计（单向强制路径）

### 2.1 入口层（Entry Layer）：确定性门控

#### 2.1.1 输入形态与调用依据（产品冻结）
**核心原则**：Intent Analyzer 的被调用依据**不是语义**，而是**输入形态**。

| 输入类型 | 来源 | 必经路径 | 灵魂滤镜作用 |
|---------|------|----------|------------|
| **raw_query** | Telegram / Chat UI | Intent Analyzer | **Soul 介入**：判断是否符合人设/边界（如“不制造焦虑”）|
| **structured** | Cron / Notion / System | 直接封印 | **不介入**：视为系统指令，绝对执行 |
| **timeline** | `publishing_timeline` | 防重锁 + 分发 | **不介入**：视为已确认计划 |

#### 2.1.2 统一输入协议（EntryRequest）
```json
{
  "entry_type": "raw_query | structured | timeline",
  "entry_channel": "telegram | admin_os | notion | system",
  "requester_id": "string",
  "requester_role": "human | system",
  "correlation_id": "string",
  "idempotency_key": "string",
  "raw_query": "string",
  "payload": {},
  "meta": { "chat_id": "?", "timeline_id": "?" }
}
```

#### 2.1.3 Entry Executability Gate (可执行性门)
1.  **Entry 不判断“对不对”，只判断“能不能负责执行”**。
2.  **pending_confirmation**：任何 `side_effect` 操作先创建 Execution 标记为 `pending`，用户确认后才触发 Router。
3.  **Continue Chat**：不合规/信息缺失时，不Reject，而是继续澄清（默认最多3轮）。

#### 2.1.4 Entry Memory 与 session_context 的职责划分
*   **Entry Memory**：用于 Entry Gate 判定（共识来源）。
*   **session_context**：仅用于对话连续性与指代消解。
*   **v5.0 关键约束**：**session_context 不跨 Turn 隐式演化**。它只是 Soul 在当下的短暂投影，不承担长期记忆职责。

---

### 2.2 Task 与 Execution 分离（架构级约束，P0）

#### 2.2.1 核心定义
*   **Task** = 任务定义（元数据、Schedule、Config）。
*   **Execution** = 执行记录（状态、结果、审计）。

#### 2.2.2 Schema 强制分离
*   `tasks` 表：存储 `task_id`, `type`, `schedule`, `status`。
*   `task_executions` 表：存储 `execution_id`, `task_id`, `status`, `audit_log`。
*   **Router 只认 Execution ID**：Router 不管理 Task 生命周期，只负责单次执行的死活。

---

### 2.3 调度中心（Router）：确定性心脏

#### 2.3.1 Architecture Guardrails（架构宪法级红线）
> **Router = 确定性调度器，LLM = 不可信建议源**

*   **Code Node 实现**：Router 必须由代码逻辑（n8n Code Node）实现。
*   **LLM 仅建议**：LLM 负责 Intent Analysis 和 Strategy Recommendation，但 Router 拥有最终裁决权。
*   **禁止直连**：严禁 LLM 直接输出 `SELECTED AGENT` 并直接调用，必须经过 Router 的显式编排。

#### 2.3.2 任务分解与心智合成
Router 在接收 `execution_id` 后，执行 **Task Decomposition**，同时完成 **Working Mind Synthesis**：
1.  **识别 Capability Chain**：需要调用哪些能力。
2.  **合成 Memory Refs**：需要调用哪些 Memory 原子（Foundation/Experience/Insight）。
3.  **输出**：
    ```json
    {
      "capability_chain": ["capability.xxx"],
      "memory_refs": [
        {"type": "foundation", "id": "rule_01"},
        {"type": "insight", "id": "insight_05", "weight": 0.9}
      ]
    }
    ```

---

### 2.4 Agent Orchestration 层（逻辑角色）
*   **定位**：Logical Role（当前实现：Router + DB State + n8n Cron）。
*   **职责**：管理 Task 状态（Active/Paused）、创建 Execution、重试机制。

---

### 2.5 能力层（Capability Layer）：治理封装

#### 2.5.1 Capability 定义
*   **`capability`**：被认证、可编排的产品能力（Runtime 唯一公民）。
*   **`skill`**：实现来源（代码/Prompt/Workflow），是 Capability 的内部填充物。
*   **`tool`**：研发辅助工具，Runtime 不可见。

#### 2.5.2 核心 Capability 列表 (v0)
1.  `capability.router`（调度核心）
2.  `capability.data_fact_query`（数据事实）
3.  `capability.product_doc_qna`（产品知识）
4.  `capability.context_assembler`（上下文装配）
5.  `capability.content_generator`（内容生成 - 含 `mode: exploratory/production`）
    *   *v5.0 升级*：不仅生成内容，还会基于 `Insight Memory` 调整策略。
6.  `capability.publisher`（发布执行 - 含 `confirmation` 对象）

#### 2.5.3 Capability Registry 门槛 (MVP-6)
1.  唯一 ID/Version
2.  统一 Envelope (Input/Output)
3.  Evidence 结构
4.  Audit 审计字段 (含 `used_skills`)
5.  Risk Policy (Side Effect 必须确认)
6.  Failure Modes (明确失败语义)

---

### 2.6 Memory Layer：Atomic Assembly (原子化组装) ⭐ v5.0 重构

> **核心变革**：不再是简单的 Knowledge/Experience 分类，而是服务于 **Working Mind (实时心智)** 的原子化组装架构。

#### 2.6.1 Memory Atoms (记忆原子结构)
所有记忆存储在 `agent_memories` 表中，但按类型区分：

*   **Foundation (基石)**：
    *   **定义**：业务公理、硬规则、Soul 的静态底色。
    *   **特性**：权重 1.0，不可变（除非人工升级）。
*   **Experience (经验)**：
    *   **定义**：经过量化验证的成功/失败路径（如：“Twitter 最佳字数是 140”）。
    *   **来源**：历史 Execution 的 `Outcome` 与 `Trace`。
    *   **特性**：权重随验证次数动态调整。
*   **Insight (洞察)**：
    *   **定义**：通过 **Self-Reflection** 提炼的高维模式（如：“熊市用户偏好黑色幽默”）。
    *   **来源**：Evolution Engine 的反思产出。
    *   **特性**：是进化的结晶，高权重。

#### 2.6.2 表结构定义 (继承 v4.1 并升级)
```sql
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  type TEXT CHECK (type IN ('foundation', 'experience', 'insight')),
  content TEXT NOT NULL,
  context JSONB, -- 适用场景标签
  weight DECIMAL(3,2) DEFAULT 0.5, -- 动态权重
  confidence DECIMAL(3,2), -- 置信度
  source_execution_id UUID, -- 来源 Execution（可溯源）
  created_at TIMESTAMPTZ
);
```

#### 2.6.3 Working Mind Synthesis (心智合成)
在 Runtime，Router 执行 Task Decomposition 时：
1.  **Filter**: 透过 Soul 滤镜过滤选项。
2.  **Retrieve**: 召回相关的 Foundation/Experience/Insight 原子。
3.  **Synthesize**: 合成当下的 **"Working Mind"**（即 `context.memory_refs` 的集合），注入 Capability。

---

### 2.7 Evolution Engine (进化引擎)：定性量化闭环 ⭐ v5.0 新增

> **核心变革**：这是 MAXshot 的智能核心。建立 **"Hypothesis-Test-Learn"** 循环。

#### 2.7.1 闭环流程 (The Loop)
1.  **Goal Setting (定目标)**：
    *   设定量化目标（如：Engagement Rate +5%）或定性目标（如：品牌更专业）。
2.  **Hypothesis & Simulation (提假设)**：
    *   基于 `Insight Memory` 提出策略，并进行 **Implicit World Modeling**（隐式推演）。
    *   *Example*: "若缩短字数，预计互动率提升。"
3.  **Action (执行)**：
    *   Capability Network 执行任务。
4.  **Attribution (定性量化归因)**：
    *   **多因子分析**：利用 LLM 识别非结构化因子（定性）与数据结果（量化）的关系。
    *   *Example*: “数据好（量化），是因为用了‘To the moon’梗（定性），而非发布时间。”
5.  **Self-Reflection (反思固化)**：
    *   生成新的 **Insight Memory**，存入 `agent_memories`。
    *   **灵魂升级**：高权重的 Insight 逐渐沉淀，完成“性格养成”。

#### 2.7.2 宪法级约束：Recommendation Only
Evolution Engine 对 Router 的影响，只能通过 **Recommendation (建议)** 形式：
*   **禁止黑箱**：禁止在线直接修改 Router 代码。
*   **必须审计**：Router 采纳或拒绝建议，必须在 Audit Log 中记录原因。

---

### 2.8 Soul Layer：Organic Soul (有机灵魂) ⭐ v5.0 新增

> **核心变革**：从“静态文档”升级为“流体叙事”。

#### 2.8.1 Soul Feed (灵魂投喂通道)
建立自动化通道，持续喂养 MAXshot 的潜意识：
*   **Sources**: 产品白皮书更新、创始人博文、市场情绪报告。
*   **Re-Alignment**: 定期（如 Weekly）消化 Feed，自动更新 **Dynamic Identity**。

#### 2.8.2 Soul Filter (灵魂滤镜)
在任何决策（Router）或生成（Content）前，`Static Soul` (底线) + `Dynamic Identity` (当前状态) 共同构成滤镜。
*   **公式**：`Decision = Filter(Options, Soul)`

---

## 🔀 三、双主线业务架构（Ops + Marketing）

### 3.1 Ops 主线：产品运维
*   **入口**：Telegram（交互）→ Router（调度）→ Capability chain → Admin OS 审计
*   **典型能力链**：`data_fact_query` → `product_doc_qna` →（可选）`content_generator`
*   **输出**：可引用证据的解释（Evidence-based）。

### 3.2 Marketing 主线：市场运营
*   **入口**：Notion / Admin OS / Telegram → Task
*   **闭环链路**：Goal → Evolution Engine (Hypothesis) → `context_assembler` → `content_generator` → `publisher`
*   **关键升级**：
    *   **Content Generator**：基于 Insight Memory 调整 `style_constraints`。
    *   **Confirmation**：`side_effect` 必须生成 **Preview Object** 并经人工确认（可审计）。
    *   **Evolution**：每次发布后的数据反馈，触发 Evolution Engine 的 Attribution 环节。

---

## 📦 四、Capability 契约定义（最小 I/O Schema）

### 4.1 CapabilityInput Envelope
```json
{
  "execution": { "execution_id": "string", "task_id": "string", ... },
  "context": { "memory_refs": [], "doc_refs": [], "constraints": {} },
  "payload": {}
}
```

### 4.2 CapabilityOutput Envelope
```json
{
  "result": {},
  "evidence": { "sources": [], "doc_quotes": null },
  "audit": {
    "capability_id": "string",
    "status": "success|failure",
    "used_skills": [{ "_skill_id": "string", ... }]
  }
}
```

### 4.3 核心 Capability Schema 重点
*   **`content_generator`**：`payload` 含 `style_constraints`（品牌/受众/策略），支持 `mode: exploratory/production`。
*   **`publisher`**：`result` 含 `confirmation_request`（Preview/Token），支持 `publish_status: pending_confirmation`。

---

## 🔗 五、与 OpenClaw 及 Skill-First 的融合

### 5.1 OpenClaw 融合策略
*   **资产拿来主义**：直接复用 OpenClaw 的 `SOUL.md` / `USER.md` / `AGENTS.md` **文件结构与模板**，以及其 Skill 生态。
*   **Runtime 彻底替换**：
    *   **Gateway** → 替换为 **MAXshot Router**（确定性）。
    *   **Memory** → 替换为 **Atomic Assembly**（结构化）。
    *   **Agent Loop** → 替换为 **Evolution Engine**（目标驱动）。

### 5.2 Skill-First 落地
*   **研发态**：使用 Skill Router (`.cursorrules`) 辅助开发。
*   **运行态**：Router 只认 Capability。Skill 是 Capability 的内部实现细节（`implementation_binding`）。

---

## 📌 六、架构冻结声明

> **冻结日期**: 2026-02-03  
> **冻结范围**: 本文档定义的所有架构、协议、逻辑。

*   **变更流程**：任何对 Router 逻辑、Memory 结构、Soul 机制的修改，必须经过 P0 级架构评审。
*   **下一步**：**Execution!** 全员进入落地执行阶段，不再讨论“是什么”，只解决“怎么做”。

---

**MAXshot v5.0**
*Not just a tool. A teammate.*
*Autonomous. Organic. Evolving.*
