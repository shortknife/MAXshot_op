# Technical Architecture: Intent Analyzer (Hybrid Orchestration) v1.1

> **Status**: Approved & Frozen（对齐架构 v5.0 / FSD v5.0）  
> **Owner**: Cat (Technical Lead)  
> **Architecture Principle**: Code-Driven Core (SAM) + n8n Visual Orchestration (Alex)  
> **执行级规格**: 以 FSD v5.0 为准。关键章节：00_Read_First、01.2 拒绝路径、02.3 审计责任、03.3 不可变快照、05.2 禁止智能、05.3 Grey Area、05.4 Require Confirmation、04 Working Mind（04.2 Memory 类型）、06 Intent Analyzer（06.1–06.5）、08 System Integration、09 Observability。  
> **对齐依据**: `LEO_ProductManager/3.Design/MAXshot_产品架构设计_v5.0_Autonomous_Soul.md`；FSD v5.0 文档集；见本文档「权威依据」小节。

---

## 权威依据（实现与验收以 FSD + 本规范为准）

| 文档 | 路径 |
|------|------|
| 产品架构 v5.0 | `LEO_ProductManager/3.Design/MAXshot_产品架构设计_v5.0_Autonomous_Soul.md` |
| FSD v5.0 入口 | `LEO_ProductManager/4.Working/FSD/00_Read_First/00.4_How_To_Read_This_Document_Set.md` |
| FSD 拒绝路径 | `LEO_ProductManager/4.Working/FSD/01_User_Journey/01.2_User_Journey_Map_Rejection_Paths.md` |
| FSD 审计责任 | `LEO_ProductManager/4.Working/FSD/02_Layer_Model/02.3_Layer_Audit_And_Ownership.md` |
| FSD Working Mind | `LEO_ProductManager/4.Working/FSD/04_Working_Mind/`（含 04.2 Memory 类型与角色） |
| FSD 06 Intent Analyzer | `LEO_ProductManager/4.Working/FSD/06_Intent_Analyzer/`（06.1–06.5 能力/EntryRequest/Session Context/Prompts/Failure） |
| FSD 08 System Integration | `LEO_ProductManager/4.Working/FSD/08_System_Integration/`（08.1–08.4 Router/n8n 边界/E2E 请求流） |
| FSD 09 Observability | `LEO_ProductManager/4.Working/FSD/09_Observability/`（09.1–09.4 日志/审计/回放/故障预案） |
| FSD 附录 A1–A5 | `LEO_ProductManager/4.Working/FSD/10_Appendix/`（A1 Terms、A2 Schema Registry、A3 Example Traces、A4 Decision History、A5 MemU 参考） |

- **A5 说明**：A5 为「How」实现参考，不改变 FSD 00–09 的「What」；使用方式见 LEO-Cat 协作文档 § 9.2（按场景可选查阅）。A2/A3 对实现与联调尤其有用。

---

## 1. 架构理念 (Architecture Vision)

鉴于 n8n 在处理多端输入（TG Bot, Webpage, Notion）的灵活性，本项目确立 **Shell-Core Hybrid Architecture**：
- **n8n 外壳 (Alex)**：负责多端输入适配（Multi-source Input Adaptation）、从数据库读取 John 维护的 Prompt，以及最终的流程可视化编排。
- **代码中枢 (SAM)**：下沉高确定性逻辑，通过 API 提供 `/context/load`（上下文裁剪）与 `/task/create`（任务封印），确保业务规则的强一致性。
- **Prompt 管理 (John)**：Prompt 统一存放在 Supabase 中，由 n8n 通过 Database Node 实时读取，使用标准占位符插值。

---

## 2. 输入形态与 Intent Analyzer 调用边界（产品冻结）⭐

**核心原则**：Intent Analyzer 的被调用依据**不是语义**，而是**输入形态**（`raw_query` vs `structured` vs `timeline`）。

| 输入类型 | 来源 | 必经路径 | 跳过 |
|---------|------|----------|------|
| **raw_query** | Telegram / Admin OS Chat UI 文本 | **必走** Intent Analyzer | — |
| **structured** | 定时任务、Notion 同步、后台表单、webhook | 直接封印 | Intent Analyzer |
| **timeline** | publishing_timeline 到期扫描 | 直接封印 + 防重锁 | Intent Analyzer |

- **raw_query**：仅当 Entry 层判定为 `entry_type=raw_query` 时，才调用 Intent Analyzer；调用前需完成 Entry 可执行性门（见下节）。
- **structured / timeline**：不经过 Intent Analyzer，由 Sealer 直接写入 Task + Execution，再触发 Router。

### 2.1 Soul 介入点（语义层，无新 API）⭐ v5.0

- 仅 **raw_query** 路径存在 Soul 介入；Soul 负责「是否符合人设/边界」（如不制造焦虑）。
- **structured / timeline** 不介入（视为系统指令或已确认计划）。
- **不新增 Runtime API**，仅为语义说明；实现上可为可插拔校验或文案策略。与 LEO-Cat 讨论 § 八 确认一致。

### 2.2 Router Task Decomposition 与 memory_refs（v5.0 对齐）

- Router 在接收 `execution_id` 后执行 Task Decomposition，输出需与 FSD 04.2、产品架构 2.6 对齐：输出含 **memory_refs**，原子类型为 **foundation / experience / insight**，可选 **weight**；引用 FSD 04.2 Memory 类型与角色。
- 设计时可**按需**查阅 FSD 附录 A5（MemU）§ 3 作为实现选项参考（双模式 retrieve、cost 控制、cross-reference 等），采纳与否由技术设计决定。

---

## 3. 统一输入协议（EntryRequest）与 Entry 可执行性门

### 3.1 EntryRequest（统一输入对象）

与架构 2.1.1 对齐，Entry 层接收的输入必须符合：

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

### 3.2 Entry 可执行性门（Entry Executability Gate）

**目的**：Router 永远只处理可被确定性调度的 Execution；Entry Module 负责“能不能负责执行”，不判断“对不对”。

**三项产品原则（冻结）**：
1. **Entry Module 不判断对错，只判断能否负责执行**：是否具备执行所需的最小确定性。
2. **除明确风险外，不 Reject 模糊输入**：Reject 仅用于明确违法/风险/超边界；其余一律 **Continue Chat**（澄清，不进入执行态）。
3. **Router 只接 Execution，不参与理解**：Entry Module 已保证交付的是可执行的 Execution。

**最小 Intent IR**：明确的 intent_name + 可绑定的 capability + 可判断的执行模式（side_effect/需确认/可立即执行）。缺任一项，**不得 Create Execution**。

**Continue Chat ≠ Reject**：不生成 Execution、不进入 Router、不消耗配额、不污染审计。

---

## 4. Execution 生命周期（含 pending_confirmation）

与架构 2.1.4、2.4.3 对齐，Execution 状态包含：

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

## 5. Continue Chat 轮次与终态

- **轮次**：默认最多 3 轮；达到上限 → `unknown` 或转人工。
- **单轮超时**：5 分钟未回复 → 结束本次澄清。
- **终态**：成功补齐→重入 Entry Gate；用户放弃/超时→`user_abandoned`；轮次上限→`unknown`。
- **审计**：必须记录澄清发生、轮次、时间戳。

---

## 6. Entry Memory 与 session_context 的职责划分（BOSS 定案）⭐

| 维度 | Entry Memory | session_context |
|------|--------------|-----------------|
| **用途** | Entry Gate 判定（能否执行、合法 intent/capability 集合） | 对话连续性、指代消解 |
| **来源** | 产品文档、运营规则、合法 intent/capability 集合 | tasks 表或对话历史 |
| **更新** | 产品/运营显式更新 | 系统自动刷新 |

**Technical Architecture 中的术语对齐**：
- **Entry Memory**：用于 Entry 可执行性门判定的知识（原文档若写 `memory_layer_context` 且指 Gate 判定用 → 归入 Entry Memory）。
- **session_context**：用于 Intent Analyzer 的对话连续性、指代消解（来自 tasks 或对话历史）；**不等于** Router 的 `memory_refs`（memory_refs 由 Router 在任务分解时生成，用于 Capability 执行）。

**原则**：Entry Memory ≠ session_context；Memory 在 Entry 阶段是判定共识来源，非智能放大器。

**显式约束**：session_context **不跨 turn 隐式演化**——不在 session_context 上做跨请求的 LLM 写回或自动更新；在 `/context/load` 时生成 snapshot，turn 内复用，Analyzer 不写回。

**记忆哲学**：见产品架构文档 §2.6.7——MAXshot「越聪明」= 产品能力进化（内容/运营/运维），非用户对话记忆；Entry Memory / session_context 服务于该目标。

**v5.0 目标形态（Atomic Memory）**：Memory 原子类型为 Foundation / Experience / Insight（与 FSD 04.2 一致）；与当前实现可存在过渡期。若当前 DB/实现仍为 v4.1 的 knowledge/experience 等，v5.0 目标形态为 Atomic，迁移节奏与 Mike 另排。与 Mike 讨论 `agent_memories` 扩展（如 `related_insight_ids` 等 cross-reference 字段）时，可**选择性参考** FSD 附录 A5 § 3 最后一项。

---

## 7. structured / timeline 入口的简化 Gate

- **structured**：基础合规 → 安全与权限 → 幂等 → 可选 payload 校验。
- **timeline**：含 structured 全部 + 防重锁 + 到期校验（scheduled_at <= now()）+ 业务规则。

Intent Analyzer 不参与上述两类入口；仅 **raw_query** 路径经过 Intent Analyzer。

---

## 8. 核心 API 契约 (Core API Contract)

### 8.1 Context Loading (`POST /api/intent/context/load`)

- **职责**：为 **raw_query** 路径提供“开卷考试”环境；从 Supabase 读取 **session_context**（对话连续性、指代消解），供 Intent Analyzer 使用。架构中 Gate 判定发生在 Intent Analyzer 之后，Context Load 在 Intent Analyzer 之前，故 **session_context 由 Context Load 提供、用于 Intent Analyzer**，职责清晰。
- **裁剪责任**：**输出的上下文不是 DB 的镜像，而是 Prompt 级裁剪产物**。SAM 将原始数据精简为 LLM 最易理解的 Token 级最优格式。

**Entry Memory 与 Context Load 的职责划分**：Entry Memory 主要用于 Gate 判定，通常由 Gate 侧读取。**仅当 Gate 与 Context Load 同属 SAM 实现时**，可由本 API 提供 Entry Memory 子集（如合法 intent/capability 集合）；若 Gate 独立实现（如 n8n/其他服务），则 Entry Memory 由 Gate 侧自行读取，本 API 不输出 Entry Memory 子集，以厘清职责。实现阶段按实际部署澄清。

**输入参数**（与 EntryRequest 对齐时可扩展）：
```json
{
  "chat_id": "string",
  "user_id": "string",
  "raw_query": "string",
  "entry_type": "raw_query"
}
```

**输出参数**：
- **session_context**：对话连续性、指代消解（来自 tasks 表或对话历史），供 Intent Analyzer 使用。
- **Entry Memory 子集**（若需）：仅当 Gate 与 Context Load 同属 SAM 时提供；合法 intent/capability 集合等，仅用于 Gate 判定，不与 session_context 混淆。
- **user_profile_subset**（可选）：用户画像子集。

### 8.2 Task Injection (`POST /api/intent/task/create`)

- **职责**：将 LLM 产出的结构化意图“封印”到数据库；仅当 Entry 层已判定为可执行（通过 Entry Gate）后调用。
- **输入参数**：
  ```json
  {
    "task_id": "uuid",
    "payload": {
      "intent": "string",
      "slots": "object"
    },
    "metadata": "object"
  }
  ```
- **冻结声明**：此 API 是任务进入系统的唯一事实来源。Mike 提供的 `tasks` / `task_executions` Schema 是此边界的物理支撑。

---

## 9. 运行时稳定性与失败形态 (Failure States)

| 故障场景 | 表现形态 | 补救策略 |
| :--- | :--- | :--- |
| **LLM 输出非合法 JSON** | `task` 不创建 | n8n 抛出错误并记录日志，返回用户“未能理解意图” |
| **Intent 不在 Whitelist** | `task` 不创建 | 触发“兜底意图”或提示用户可用功能列表 |
| **Context/Load 失败** | 进入 **Degraded Mode** | 以空 Context 继续流程，仅依赖当前 Query 进行分析 |
| **Entry Gate 不通过** | 不 Create Execution | Continue Chat 或 Reject（依产品原则） |

---

## 10. 可替换性声明 (Replaceable Implementation)

Intent Analyzer 被定义为一个**可替换的逻辑单元**。只要满足以下边界：
- **输入**：`clean_query` + identifiers + session_context（via `/context/load`）
- **输出**：符合 Payload Contract 的结构化数据（intent + extracted_slots），**严禁输出 capability_chain**（via `/task/create`）

其内部实现可从当前 n8n LLM Node 切换为 Prompt v3、规则引擎或 SAM 内部 Hybrid 逻辑。

---

## 11. 角色分工与 DoD (Definition of Done)

- **SAM (Developer)**：实现 `/api/intent/context/load` 与 `/api/intent/task/create`；确保 API 部署在可 24/7 运行的环境。
- **Alex (n8n Expert)**：构建 n8n 工作流，仅对 **raw_query** 路径调用 Intent Analyzer（调用 SAM API）；对 structured/timeline 不调用 Intent Analyzer；DoD 须含“入口 Mock + DB 真实记录”截图。
- **John (Prompt Expert)**：在 n8n 的 LLM Node 中调试并冻结 Intent & Slot Extraction Prompt。
- **Mike (Database Expert)**：冻结并发布 `tasks` / `task_executions` 的最新 Schema（含 pending_confirmation 等状态）。

---

## 12. 演进路线

1. **Phase 1**：冻结 API 边界与 Schema（Immediate）。
2. **Phase 2**：SAM 完成接口开发，Alex 完成流程迁移（Ticket Ready）。
3. **Phase 3**：Lily 全链路稳定性测试。

---

## 附录：变更说明（相对上一版，供 LEO 审核）

- **A**：明确输入形态（raw_query/structured/timeline）与 Intent Analyzer 调用边界；仅 raw_query 必走 Intent Analyzer。
- **B**：补充 Entry 可执行性门、最小 Intent IR、Continue Chat ≠ Reject。
- **C**：补充 Execution 生命周期（pending_confirmation、confirmed、rejected、expired）及审计要求。
- **D**：补充 Continue Chat 轮次（最多 3 轮）、单轮超时（5 分钟）、终态（user_abandoned、unknown）及审计。
- **E**：明确 Entry Memory ≠ session_context；术语对齐（Entry Memory 用于 Gate 判定，session_context 用于指代消解）；澄清与 Router memory_refs 的区别。
- **F**：补充 structured / timeline 简化 Gate 规则。
- **G**：补充统一输入协议 EntryRequest（entry_type、entry_channel、requester_id、idempotency_key 等），与架构 2.1.1 对齐。
- **v1.1（2026-02）**：Soul 介入点（仅 raw_query，语义层、无新 API）；Working Mind / memory_refs（Router 输出与 FSD 04.2、架构 2.6 对齐）；FSD v5.0 显式引用与权威依据；Atomic Memory v5.0 目标形态；FSD 附录 A5 MemU 可选实现参考。

---

**Cat**: 本版 v1.1 已对齐架构 v5.0 与 FSD v5.0；Lucy 审查 + LEO 审核通过后冻结。其他小伙伴继续按本规范与 Integration Spec v5.0 开发。
