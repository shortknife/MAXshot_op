# MAXshot Integration Specification v5.0

> **角色**: Cat (Technical Lead & Integration Coordinator)  
> **来源**: 对齐 `MAXshot_产品架构设计_v5.0_Autonomous_Soul` 的工程集成规范  
> **范围**: Phase 1 Ops 骨架（read_only 链路）+ Phase 1.5/Phase 2 的接口预留  
> **状态**: Approved & Frozen（Lucy 审查 + LEO 审核通过，2026-02 冻结）  
> **执行级规格**: 以 FSD v5.0 为准。关键章节：00_Read_First、01.2 拒绝路径、02.3 审计责任、03.3 不可变快照、05.2 禁止智能、05.3 Grey Area、05.4 Require Confirmation、04 Working Mind、06 Intent Analyzer、08 System Integration、09 Observability。见本文档「权威依据」小节。  
> **架构设计原则**: MVP = 最小完整架构，未来迭代不架构演变；所有模块须符合 `Cat_TechnicalLead/3.Design/Architecture_Design_Principles_v1.0.md`。Router 调用 Capability 的**扩展架构唯一方向**为方案 B（Registry + webhook_url，查表 + HTTP POST），见该原则文档 §2.2。

---

## 权威依据（实现与验收以 FSD + 本规范为准）

| 文档 | 路径 |
|------|------|
| 产品架构 v5.0 | `LEO_ProductManager/3.Design/MAXshot_产品架构设计_v5.0_Autonomous_Soul.md` |
| FSD v5.0 入口 | `LEO_ProductManager/4.Working/FSD/00_Read_First/00.4_How_To_Read_This_Document_Set.md` |
| FSD 拒绝路径 | `LEO_ProductManager/4.Working/FSD/01_User_Journey/01.2_User_Journey_Map_Rejection_Paths.md` |
| FSD 审计责任 | `LEO_ProductManager/4.Working/FSD/02_Layer_Model/02.3_Layer_Audit_And_Ownership.md` |
| FSD Working Mind | `LEO_ProductManager/4.Working/FSD/04_Working_Mind/` |
| FSD 06 Intent Analyzer | `LEO_ProductManager/4.Working/FSD/06_Intent_Analyzer/`（06.1–06.5） |
| FSD 08 System Integration | `LEO_ProductManager/4.Working/FSD/08_System_Integration/`（08.1–08.4） |
| FSD 09 Observability | `LEO_ProductManager/4.Working/FSD/09_Observability/`（09.1–09.4） |
| FSD 附录 A1–A5 | `LEO_ProductManager/4.Working/FSD/10_Appendix/`（A1 Terms、A2 Schema Registry、A3 Example Traces、A4 Decision History、A5 MemU 参考） |
| **架构设计原则 v1.0** | `Cat_TechnicalLead/3.Design/Architecture_Design_Principles_v1.0.md`（MVP=最小完整架构、迭代不架构演变、Router/Capability 方案 B） |

- **A5 说明**：A5 为「How」实现参考，不改变 FSD 00–09 的「What」；Router ↔ Evolution、Context 装配、成本控制等可**选择性引用** A5 思路（见 LEO-Cat 协作文档 § 9.2）。A2/A3 对实现与联调尤其有用。
- **架构设计原则**：所有模块的 MVP 实现须符合「最小完整架构」；Router 调用 Capability 的扩展架构唯一方向为方案 B（Registry + webhook_url，查表 + HTTP POST）。

---

## 🎯 1. 目标与范围

**1.1 目标**

- **把 LEO v4.1 文档中的架构与治理条款，收编为技术可执行的接口规范**：
  - Router 只接收 `execution_id`（Task/Execution 分离）。
  - 运行时只调用 `capability`，绝不直连 `skill` / n8n workflow。
  - `Capability Card` 明确 `runtime_contract` 与 `failure_modes`，可被代码/DB 校验。
  - `Experience Memory` 只能通过 **Recommendation（可审计）** 影响 Router，禁止黑箱在线学习。
  - `side_effect` 能力必须基于 **Confirmation Object（含 Preview）** 进行可审计确认（Phase 2）。

- **为 Phase 1/1.5/2 拆解 Developer Tickets 提供统一 I/O 事实源**。

**1.2 本轮实施范围（Phase 1 & 1.5）**

- **Phase 1（本周核心）**: 只围绕 `capability.data_fact_query`（绑定现有 WF15）打通 **Ops 骨架 read_only 链路**：

  ```text
  Entry (Telegram/AdminOS)
    → Orchestration 创建 Task(task_id)
    → Orchestration 创建 Execution(execution_id, intent="ops")
    → Router(execution_id)
        - 调用 capability.data_fact_query（绑定 WF15）
        - 写入 audit（status, error, failure_modes）
    → Router 更新 Execution 状态
    → 返回结果 + Audit Summary
  ```

  **raw_query 显式路径**：对 **raw_query**，Entry 与 Orchestration 之间需经过 **Context Load → Intent Analyzer → Sealer**（Sealer 写入 Task + Execution），再触发 Router；详见 1.3.2。

- **Phase 1.5（Phase 1 成功后 1–2 天）**: 在同一 Ops 骨架上叠加 `capability.product_doc_qna`，验证多 capability 链路（非 v0 验收阻塞项）。

- **Phase 2（v0 后）**: `capability.publisher` 的 Confirmation 流（接口本规范中先冻结，真实发布后置）。

> **产品宪法级验收标准（由 LEO 冻结）**：
> - ✅ 合格：用户问 "DAU 多少" → 系统被迫走 Task → Execution → Router → Capability → Audit，每步留痕。
> - ❌ 不合格：绕过 Task 直接调 SQL（即使结果正确）。

---

## 🚪 1.3 入口层与统一输入协议（对齐架构 2.1）

**依据**：`MAXshot_产品架构设计_v5.0_Autonomous_Soul.md` 2.1.0 ~ 2.1.8。

### 1.3.1 统一输入协议（EntryRequest）

Entry 层接收的输入必须符合统一协议，与架构 2.1.1 对齐：

```json
{
  "entry_type": "raw_query | structured | timeline",
  "entry_channel": "telegram | admin_os | notion | system",
  "requester_id": "string",
  "requester_role": "human | system",
  "correlation_id": "string",
  "idempotency_key": "string",
  "raw_query": "string (only when entry_type=raw_query)",
  "payload": {},
  "meta": { "chat_id": "?", "timeline_id": "?", "source_workflow": "?" }
}
```

### 1.3.2 输入形态与必经路径

| 输入类型 | 来源 | 必经路径 | 跳过 |
|---------|------|----------|------|
| **raw_query** | Telegram / Admin OS Chat UI 文本 | Intent Analyzer → Sealer → Router | — |
| **structured** | 定时任务、Notion、后台表单、webhook | Sealer 直接写入 → Router | Intent Analyzer |
| **timeline** | publishing_timeline 到期扫描 | 防重锁 → 封印/分发 | Intent Analyzer |

### 1.3.3 Entry 可执行性门（Entry Executability Gate）

- 三项产品原则：不判断对错、除明确风险外不 Reject、Router 只接 Execution。
- 最小 Intent IR：intent_name + capability 可绑定 + 执行模式可判断；缺任一项不得 Create Execution。
- **Continue Chat ≠ Reject**：不生成 Execution、不进入 Router、不消耗配额、不污染审计。

### 1.3.4 Grey Area 与 Policy（v5.0 必须写死）⭐

**依据**：FSD 05.3 Grey Area、05.4 Require Confirmation；产品架构 v5.0。

- **默认策略**：Grey 一律 **Require Confirmation**（先 pending_confirmation，不交给 LLM 自判）。
- **禁止 LLM 自判风险等级**；**风险等级只能来自 Policy / Code**。
- 若有例外（如某类 Grey 由 Policy 指定为 Reject），必须在 Policy 层**显式约定**（写死在代码/配置），不在 Runtime 由 LLM 推断。与 Entry Gate、pending_confirmation 衔接。

---

## 🔄 1.4 Execution 生命周期（含 pending_confirmation）

**依据**：架构 2.1.4、2.4.3。

Execution 状态包含（与架构 2.4.3 冻结一致）：

| 状态 | 含义 | 后续 |
|------|------|------|
| `created` | Orchestration 已创建，等待路由/确认 | 随即转入 executing 或 pending_confirmation |
| `pending_confirmation` | 等待用户确认（side_effect） | 确认→confirmed；拒绝/超时→rejected/expired |
| `confirmed` | 用户确认通过 | 触发 Router |
| `rejected` | 用户明确拒绝 | 不进入执行态 |
| `expired` | 超时未响应（如 45 分钟） | 记录审计，不触发 Router |
| `executing` | Router 正在执行 | → completed/failed |
| `completed` / `failed` | 执行结束 | — |

**审计要求**：创建时记录 entry_type、requester_id、intent_name、reason_for_pending；超时/拒绝时写入最终状态及 timestamp。

---

## 🚦 1.5 structured / timeline 简化 Gate

- **structured**：基础合规 → 安全与权限 → 幂等 → 可选 payload 校验。
- **timeline**：含 structured 全部 + 防重锁 + 到期校验（scheduled_at <= now()）+ 业务规则。

Entry 层实现（n8n / SAM）须按上述 Gate 规则区分 raw_query / structured / timeline，仅 raw_query 经 Intent Analyzer。

---

## 🧱 2. 核心标识与统一 Envelope

本节定义所有 Capability 调用统一遵守的 Envelope，与 LEO 文档 4.1 节保持一致；任何实现（n8n / skill / service）必须包裹在此 Envelope 内。

### 2.1 核心标识字段

```json
{
  "task_id": "string",            // Orchestration 创建
  "execution_id": "string",       // Orchestration 创建，Router 唯一入口
  "capability_id": "string",      // 如 capability.data_fact_query
  "capability_version": "string", // 来自 Capability Registry
  "entry_channel": "telegram|admin_os|notion|system"
}
```

- **⚠️ Architecture Constitution**:
  - Router **只接收 `execution_id`** 作为入口参数，不接收 `task_id`。
  - `CapabilityOutput.audit` 必须包含：`execution_id + capability_id + capability_version`。

### 2.2 CapabilityInput Envelope（统一输入壳）

```json
{
  "execution": {
    "execution_id": "string",
    "task_id": "string",
    "channel": "telegram|admin_os|notion|system",
    "intent": "ops|marketing|mixed",
    "requester": "string",
    "created_at": "ISO8601"
  },

  "experience_recommendations": [
    {
      "recommendation_id": "string",
      "source_run_id": "string",
      "type": "capability_chain|memory_template|fallback_strategy",
      "proposal": {},             // 例如推荐的 capability_chain
      "evidence_refs": ["run:..."],
      "confidence": "low|medium|high"
    }
  ],

  "context": {
    "memory_refs": []             // Knowledge Memory 引用（按 Capability 分区）
  },

  "payload": {
    // 每个 capability 自己的业务输入
  }
}
```

- **⚠️ 宪法级位置约束（LEO 修正 1）**：
  - `experience_recommendations` 必须与 `execution` 同级，而**不能**放在 `context` 内。
  - 理由：`context` 表示 **Knowledge Memory（可控认知资源）**；而 Experience Recommendation 是系统级学习建议，只能影响 Router 决策，不直接进 Prompt。

### 2.3 CapabilityOutput Envelope（统一输出壳）

```json
{
  "result": {},

  "evidence": {
    "sources": [],
    "sql_refs": null,
    "doc_quotes": null
  },

  "audit": {
    "capability_id": "string",
    "capability_version": "string",
    "invocation_source": "execution:[execution_id]",
    "elapsed_ms": 0,
    "status": "success|failure|pending_confirmation",
    "error": null,
    "capability_logic_type": "llm_generated|deterministic_code",
    "used_skills": [
      {
        "_skill_id": "string",
        "_skill_version": "vX.Y",
        "_invocation_source": "capability:capability.xxx"
      }
    ],
    "failure_mode": "missing_required_memory|invalid_fact_evidence|policy_blocked|upstream_timeout|external_rate_limited|null",
    "recommendations": [
      {
        "recommendation_id": "string",
        "adoption": "accepted|rejected",
        "reason": "string"
      }
    ],
    "notes": {}
  },

  "next_actions": []
}
```

- **Failure Modes**：与 Capability Card 中 `failure_modes` 字段对齐，用于 Experience Memory 聚合和 Router 确定性回退。
- **Recommendations 审计**：Router 必须记录每条 Recommendation 是否被采纳及原因。

---

## 🗂 3. Capability Registry & Capability Card（技术视角）

本节是对 LEO 文档 2.5.3 的工程化版本，用于指导 DB Schema 与实现绑定。

### 3.1 Capability Card 技术版结构

```json
{
  "capability_id": "capability.data_fact_query",
  "capability_version": "v1.0",
  "owner": "Alex",
  "lifecycle": "draft|active|deprecated|frozen",
  "intent_tags": ["ops"],
  "risk_class": "read_only|side_effect",

  "policy_gates": {
    "require_confirmation": false,
    "allowlist": ["router"]
  },

  "schemas": {
    "input": "CapabilityInput",
    "output": "CapabilityOutput"
  },

  "runtime_contract": {
    "context_scope": "isolated|shared",
    "memory_policy": {
      "knowledge_refs": "required|optional",
      "experience_writeback": "none|summary|full_trace"
    },
    "execution_pattern": "deterministic|llm_heavy|hybrid",
    "timeout_ms": 60000,
    "idempotency": {
      "required": true,
      "key_strategy": "execution_id|input_hash"
    }
  },

  "failure_modes": [
    "missing_required_memory",
    "invalid_fact_evidence",
    "policy_blocked",
    "upstream_timeout",
    "external_rate_limited"
  ],

  "implementation_binding": {
    "type": "n8n_workflow|skill|service|script",
    "ref": "WF15_Telegram_Data_Query_Assistant_v2",
    "notes": "现有 Ops 查询工作流，增加 Capability Envelope 包裹"
  },

  "observability": {
    "audit_required": true,
    "used_skills_trace_required": true
  }
}
```

- **扩展架构（方案 B，架构设计原则 §2.2）**：产品扩展方向**仅**采用 Registry + `webhook_url`/endpoint，Router 查表 + HTTP POST。Capability Registry 须支持 `webhook_url`（或等价字段）；`implementation_binding.type` 为 `n8n_workflow` 时，通过 Webhook 暴露 URL 写入 registry；为 `service` 时，`ref` 为 Sam 等 HTTP 端点。新增 capability 仅改 registry，不改 Router。

- **治理封装 ≠ 二次开发（LEO 风险控制 1）**：
  - 允许 `implementation_binding.ref` 直接指向现有 WF / skill，只要 Envelope + Audit 满足要求。
  - 不要求重写内部业务逻辑。

### 3.2 Phase 1 关注的 Capability

- `capability.data_fact_query`（read_only）
  - **Phase 1 必须**：绑定 WF15，跑通 Ops 骨架。
- `capability.product_doc_qna`（read_only）
  - **Phase 1.5 叠加**：在 Phase 1 跑通后接入，不阻塞 v0 验收。
- `capability.content_generator`（read_only，mode 字段在 Phase 2 起作用）
  - 本规范仅冻结接口，不做实现要求。
- `capability.publisher`（side_effect）
  - 本规范仅冻结 Confirmation 接口与产品约束，真实发布后置。

---

## 🧠 4. Experience Memory Recommendation 接口

本节只定义接口，不要求任何 ML / 在线学习；v0 仅允许硬编码规则产生 Recommendation（例如：重复失败后建议切换 capability_chain）。

### 4.1 Recommendation 对象

```json
{
  "recommendation_id": "string",
  "source_run_id": "string",          
  "type": "capability_chain|memory_template|fallback_strategy",
  "proposal": {},                     
  "evidence_refs": ["run:..."],      
  "confidence": "low|medium|high"
}
```

### 4.2 宪法级约束落地

- Experience Memory **只能**通过：
  - `CapabilityInput.experience_recommendations` 提供建议；
  - `CapabilityOutput.audit.recommendations` 记录 Router 对建议的采纳情况。
- **禁止**：任何运行时权重更新或在线学习直接改写 Router 决策路径。
- Recommendation 必须可回放：
  - 通过 `source_run_id` 和 `evidence_refs` 能定位到原始 `agent_run/agent_outcome` 记录。

### 4.3 Evolution Engine 宪法级约束（v5.0 本版写入）⭐

**依据**：产品架构 2.7.2。

- Evolution 对 Router 的影响**只能通过 Recommendation 形式**。
- **禁止黑箱**：禁止在线直接修改 Router 代码。
- **必须审计**：Router 采纳或拒绝建议，须在 Audit Log 中记录原因。

Evolution ↔ Router / Memory 的**具体接口**（契约、数据结构等）待 Evolution 落地时在本文档补充。

---

## 📤 5. side_effect 与 Confirmation Object（接口冻结，Phase 2 实施）

本节冻结 `capability.publisher` 的接口与产品约束，但根据 LEO 决策，**v0 禁止真实自动发布**，仅允许入队（queued）。

### 5.1 `capability.publisher` 输出结构

```json
{
  "result": {
    "publish_status": "pending_confirmation|queued|failure",
    "receipt": {
      "queue_id": "string|null"
    },
    "confirmation_request": null
  },

  "evidence": { ... },

  "audit": {
    "capability_id": "capability.publisher",
    "capability_version": "v1.0",
    "invocation_source": "execution:[execution_id]",
    "elapsed_ms": 0,
    "status": "success|failure|pending_confirmation",
    "error": null,
    "capability_logic_type": "deterministic_code",
    "used_skills": [],
    "failure_mode": null,
    "confirmation": {
      "request": null,
      "result": null
    }
  },

  "next_actions": []
}
```

### 5.2 Confirmation 对象

```json
{
  "confirmation_request": {
    "confirmation_id": "string",
    "capability_id": "capability.publisher",
    "execution_id": "string",
    "summary": "string",
    "preview": {
      "type": "text|image|url",
      "content": "string"
    },
    "expires_at": "ISO8601",
    "signature_token": "string"
  },
  "confirmation_result": {
    "confirmation_id": "string",
    "decision": "confirmed|rejected",
    "actor": "string",
    "timestamp": "ISO8601",
    "reason": "string"
  }
}
```

- **⚠️ 宪法级约束（LEO 修正 2）**：
  - **禁止**：在 v0 阶段实现“自动发布到 Twitter”等真实外部 side_effect。
  - **允许**：确认后仅写入 `publish_status="queued"` 和队列表；队列表可以空跑，不接真实发布 API。
  - Router / Admin OS 必须校验 `confirmation_request.preview` 存在；
    - 若缺失，直接视为错误：`audit.status=failure` + `audit.failure_mode="invalid_fact_evidence"` 或专门的 `missing_preview`。

---

## 🔀 6. Phase 1 Ops 骨架数据流（技术视角）

### 6.1 数据流概览

```text
Entry (Telegram/AdminOS)
  → Orchestration 创建 Task(task_id)
  → Orchestration 创建 Execution(execution_id, intent="ops")
  → Router(execution_id)
      - 任务分解（当前版本可硬编码为 data_fact_query）
      - 读取 Capability Card（校验 allowlist+lifecycle+runtime_contract）
      - 构造 CapabilityInput（Envelope）
      - 调用 capability.data_fact_query（实现绑定 WF15）
      - 接收 CapabilityOutput
      - 写入 Execution & Audit（含 failure_mode 分类）
  → Router 更新 Execution 状态
  → 返回结果 + Audit Summary
```

**raw_query 显式路径**：对 **raw_query**，Entry 与 Orchestration 之间需经过 **Context Load → Intent Analyzer → Sealer**（Sealer 写入 Task + Execution），再触发 Router；structured/timeline 则 Sealer 直接写入后触发 Router。

### 6.2 Phase 1 技术验收点

- 任何一次 Ops 查询：
  - 必须有 `task_id + execution_id`，并通过 Router 调用 `capability.data_fact_query`；
  - Router 不允许直接调用 WF15 / skill；只能通过 Capability Registry 的 allowlisted `capability_id`；
  - `CapabilityOutput.audit.failure_mode` 必须在定义好的枚举里（或 null），用于后续 Experience Memory 统计；
  - `CapabilityOutput.evidence` 结构存在，哪怕字段为 null（避免“无证据的确定性结论”）。

---

## 📌 7. Phase 1/1.5 Developer Tickets 预告（供拆票）

> 本节只列出 Ticket 类型与职责归属，实际 Ticket 文件由 Cat 在 `/Cat_TechnicalLead/4.Working/tickets` 中创建。

### 7.1 Mike（DB Schema）

- **Ticket: DB_Tasks_Executions_Audit_Schema_v4.1.md**
  - 目标：实现 `tasks` / `task_executions` / `audit_logs` 表结构，支持 `execution_id` 贯穿和 `failure_mode` 分类。

- **Ticket: DB_Capability_Registry_v4.1.md**
  - 目标：落地 `capabilities` 表，字段至少包括：`capability_id`、`version`、`runtime_contract`、`failure_modes`、`implementation_binding`。

### 7.2 Alex（Router & WF 绑定）

- **Ticket: Router_Execution_Entry_and_Envelope_Wrapper_v4.1.md**
  - 目标：Router 接收 `execution_id`，构造 CapabilityInput Envelope，调用 capability，并写回 Audit。

- **Ticket: Capability_Data_Fact_Query_Binding_WF15_v4.1.md**
  - 目标：将现有 `WF15_Telegram_Data_Query_Assistant_v2` 包裹为 `capability.data_fact_query`，满足 Envelope + Audit 要求。

### 7.3 Sam（Admin OS 最小审计视图）

- **Ticket: AdminOS_Execution_Audit_View_Minimal_v4.1.md**
  - 目标：按 `execution_id` 展示 capability_chain、audit.status、failure_mode 与 evidence 摘要。

---

## ✅ 8. 附录：宪法级条款在本规范中的落地点

- Router 只接收 `execution_id` → 见 2.1、2.2、6.1。
- 运行时只调用 Capability → 见 3.1、6.2 验收点。
- `runtime_contract` 与 `failure_modes` → 见 3.1，作为 DB/代码可校验字段。
- Experience Recommendation 只能建议不可黑箱 → 见 4.1、4.2。
- **Evolution Recommendation Only / 禁止黑箱 / 必须审计** → 见 4.3 及产品架构 2.7.2。
- **Grey Area 默认 Require Confirmation、禁止 LLM 自判风险、风险等级仅来自 Policy/Code** → 见 1.3.4 及 FSD 05.3、05.4。
- Confirmation Object 必须含 Preview，v0 禁止真实自动发布 → 见 5.1、5.2。
- Entry 层与 Execution 生命周期（含 pending_confirmation）→ 见 1.3、1.4、1.5。
- 统一输入协议 EntryRequest → 见 1.3.1。

---

## 📋 9. 附录：变更说明（相对上一版，供 LEO 审核）

- **入口层与统一输入协议**：新增 1.3 节，与架构 2.1 对齐；EntryRequest（entry_type、entry_channel、requester_id、idempotency_key 等）。
- **输入形态与路径**：raw_query 必走 Intent Analyzer；structured / timeline 跳过 Intent Analyzer，直接封印。
- **Entry 可执行性门**：三项产品原则、最小 Intent IR、Continue Chat ≠ Reject。
- **Execution 生命周期**：新增 1.4 节，含 pending_confirmation、confirmed、rejected、expired 及审计要求。
- **structured / timeline 简化 Gate**：新增 1.5 节；structured：基础合规→安全→幂等→可选 payload 校验；timeline：含 structured 全部 + 防重锁 + 到期校验 + 业务规则。
- **v5.0（2026-02）**：Grey Area 与 Policy（1.3.4）；FSD v5.0 显式引用与权威依据；Evolution 宪法级约束（Recommendation Only / 禁止黑箱 / 必须审计）本版写入（4.3），具体接口待 Evolution 落地补充；FSD 附录 A5 MemU 可选实现参考。

---

**当前状态**: Approved & Frozen（Lucy 审查 + LEO 审核通过，2026-02 冻结）。其他小伙伴继续按本规范开发。
