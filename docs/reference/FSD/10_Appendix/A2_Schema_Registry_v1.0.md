# A2 核心 Schema 注册表 v1.0

> **文档版本**: v1.0  
> **产出人**: Cat (Technical Lead)，与 Mike 合作  
> **创建日期**: 2026-02  
> **状态**: 初稿  
> **关联**: Integration Spec §1.3–§2.3、FSD 06.2 EntryRequest、09.1 Log 类型、Technical Architecture

---

## 一、核心 Schema 列表

| 名称 | 用途 | 权威来源 | 备注 |
|------|------|----------|------|
| **EntryRequest** | Entry 层统一输入 | FSD 06.2、Integration Spec 1.3.1、产品架构 2.1.2 | entry_type、entry_channel、requester_id、idempotency_key、raw_query/payload、meta |
| **task_executions** | Execution 生命周期、审计贯穿 | Mike DDL、Integration Spec 1.4、FSD 03.2 | execution_id、task_id、status、entry_type、intent_name、reason_for_pending、audit 引用 |
| **tasks** | Task 元数据 | Mike DDL、架构 2.2.2 | task_id、type、schedule、status |
| **CapabilityInput** | Router → Capability 输入壳 | Integration Spec 2.2 | execution、experience_recommendations、context.memory_refs、payload |
| **CapabilityOutput.audit** | Capability 执行审计 | Integration Spec 2.3、09.2 | execution_id、capability_id、capability_version、status、failure_mode、invocation_source、elapsed_ms、**used_skills**（见下） |
| **failure_mode 枚举** | Capability 失败分类 | Integration Spec 3.1、09.4 | missing_required_memory、invalid_fact_evidence、policy_blocked、upstream_timeout、external_rate_limited、null |
| **confirmation_request / confirmation_result** | pending_confirmation 审计 | Integration Spec 5.2、FSD 05.4 | confirmation_id、preview、decision、actor、timestamp |

**CapabilityOutput.audit.used_skills 约束**：`used_skills` 仅引用 LEO 圈定的产品 Skill 库（来源：`Knowledgebase/Claude Skills`）；MVP 试点 = summarize。详见产品架构 4.2.1、大票 §5。

---

## 二、与 Mike 协作

- **DDL 与字段**：tasks、task_executions、audit_logs 等表结构以 Mike 发布的 DDL 为准；本表仅列 Schema 名称与用途，具体字段见 Mike 文档或 Integration Spec。
- **扩展**：若新增核心 Schema（如 agent_memories、memory_refs 原子类型），需与 Mike 对齐 DDL 并在本表登记。
- **A5 MemU**：agent_memories 扩展（如 related_insight_ids）可参考 A5 §3；与 Mike 讨论后落 DDL 并在此登记。

---

## 三、与 09.1、Integration Spec 一致

- **09.1**：Trace/Intent/Exec/Safety Log 的 Schema 约束以本表及 Integration Spec 为准；execution_id 贯穿。
- **Integration Spec**：CapabilityInput/CapabilityOutput、audit 结构、failure_modes 以 Integration Spec 2.2–2.3、3.1 为准；本表作索引。

---

## 四、DB Schema 与 EntryRequest 映射（Mike 确认）

本节由 Mike 提供，与 Cat 协作；**权威 DDL** 见 `Mike_DatabaseExpert/4.Working/sql/router/task_executions_create_2026-02.sql` 及云端 `tasks` 表结构；**本地 Schema CSV** 见 `Mike_DatabaseExpert/4.Working/Database/task_executions_schema_2026-02.csv`。

### 4.1 tasks 表（权威字段）

| 列名 | 类型 | 可空 | 默认 | 说明 |
|------|------|------|------|------|
| task_id | uuid | NO | gen_random_uuid() | 主键 |
| channel | text | NO | — | 入口通道，与 EntryRequest.entry_channel 对齐 |
| intent | text | NO | — | 意图名，与 task_executions.intent_name 同源 |
| requester | text | NO | — | 请求者，与 EntryRequest.requester_id 对齐 |
| payload | jsonb | NO | — | 业务负载，来自 EntryRequest.payload |
| metadata | jsonb | YES | '{}'::jsonb | 附加信息，来自 EntryRequest.metadata |
| status | text | YES | 'pending' | Task 层状态 |
| created_at | timestamptz | YES | now() | 创建时间 |

### 4.2 task_executions 表（权威字段）

| 列名 | 类型 | 可空 | 默认 | 说明 |
|------|------|------|------|------|
| execution_id | text | NO | — | 主键；Router 唯一入口，Sealer 创建时生成 |
| task_id | uuid | NO | — | FK → tasks(task_id) |
| entry_type | text | NO | — | raw_query \| structured \| timeline |
| requester_id | text | NO | — | 与 EntryRequest.requester_id 一致 |
| intent_name | text | NO | — | 与 Integration Spec 1.4、Execution 审计一致 |
| reason_for_pending | text | YES | — | 仅 pending_confirmation 等有值 |
| status | text | NO | 'created' | created \| pending_confirmation \| confirmed \| rejected \| expired \| executing \| completed \| failed |
| idempotency_key | text | YES | — | 幂等键；重复请求返回已有 execution_id |
| created_at | timestamptz | NO | now() | 创建时间 |
| updated_at | timestamptz | NO | now() | 更新时间（触发器维护） |

### 4.3 EntryRequest → tasks / task_executions 映射（最终）

| EntryRequest（06.2 / Spec 1.3.1） | 写入表 | DB 列 | 备注 |
|-----------------------------------|--------|--------|------|
| entry_channel | tasks | channel | 入口通道 |
| requester_id | tasks | requester | 保持现有列名 requester，不破坏 Phase 1 / M2 |
| requester_id | task_executions | requester_id | 与 Spec 1.4 一致 |
| entry_type | task_executions | entry_type | 不写入 tasks |
| payload | tasks | payload | 业务负载 |
| metadata | tasks | metadata | 附加信息 |
| idempotency_key | task_executions | idempotency_key | 幂等 |
| — | task_executions | execution_id | Sealer 生成，不入 EntryRequest |
| — | task_executions | task_id | 写 tasks 后得到，再写 task_executions |
| — | task_executions | intent_name | 来自 Intent Analyzer 或 payload.intent（structured/timeline） |
| — | task_executions | status | 初始 'created' |

**说明**：06.2 §4.1 建议映射由本表最终确认；tasks 表不新增 entry_type 列，entry_type 仅存在于 task_executions，与当前 DDL 及 Sealer 实现一致。

---

**文档位置**: `LEO_ProductManager/4.Working/FSD/10_Appendix/A2_Schema_Registry_v1.0.md`
