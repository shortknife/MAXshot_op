# A3 示例 Trace v1.0

> **文档版本**: v1.0  
> **产出人**: Cat (Technical Lead)，与 Lily 合作  
> **创建日期**: 2026-02  
> **状态**: 初稿  
> **关联**: FSD 01 用户旅程、03.4 回放与审计流、05.3 Grey Area、05.4 Require Confirmation、09.1–09.2

---

## 一、Happy Path（raw_query → Sealer → Router → Capability）

- **场景**：用户问「USDC 的 APY 多少」；entry_type=raw_query；Gate 通过；Sealer 写入 Task + Execution；Router 调用 capability.data_fact_query；返回结果。
- **Trace 要点**：EntryRequest → Entry Adapter → Context Load → Intent Analyzer → Gate pass → Sealer（task_id、execution_id）→ Router（execution_id）→ Task Decomposition → CapabilityInput → Capability 执行 → CapabilityOutput.audit（status=success）→ task_executions.status=completed。
- **审计贯穿**：execution_id 贯穿；Trace Log（Gate pass）→ task_executions（created）→ Exec Log（capability_id、status、elapsed_ms）→ task_executions（completed）。

---

## 二、Reject 路径（Entry Gate 不通过）

- **场景**：用户输入不满足最小 Intent IR 或明确风险；Gate 返回 Reject；不创建 Execution。
- **Trace 要点**：EntryRequest → Entry Adapter → Context Load（可选）→ Intent Analyzer → Gate **reject**（reason=…）→ 无 Sealer 调用；返回用户 Reject 话术。
- **审计贯穿**：无 execution_id；用 correlation_id/request_id 记 Trace Log；gate_result=reject、reason 留痕；与 09.1、02.4 一致。

---

## 三、Grey Area（pending_confirmation）

- **场景**：请求落入 Grey Area；默认 Require Confirmation；创建 Execution 但 status=pending_confirmation；不交给 LLM 自判；用户确认后 status=confirmed，再触发 Router。
- **Trace 要点**：EntryRequest → … → Gate 判定 Grey → Sealer 写入 Task + Execution（status=pending_confirmation、reason_for_pending）→ 等待用户确认 → confirmation_result 写入 audit → status=confirmed → Router(execution_id) → …。
- **审计贯穿**：execution_id 自 Sealer 创建即有；confirmation_request 与 confirmation_result 写入 audit（FSD 05.4、Integration Spec 5.2）；与 09.2 一致。

---

## 四、与 Lily 协作

- **测试用例**：Lily 可基于上述三例设计 E2E 或回归用例；验证审计贯穿与回放（09.3）。
- **示例数据**：若需具体 JSON 示例（EntryRequest、audit 片段），可与 Lily 在测试报告或 A3 附录中补充。

---

## 五、Lily 补充：基于 Entry 测试的 Trace 示例（附录）

以下示例来自 Entry Module 回归与 Gate 边界测试（Lily-Alex EM-T4/T5 测试报告、Lily-Cat EM-T6 云端执行反馈），节点名与输出形状与当前工作流一致，供 E2E/回放对照。

### 5.1 Happy Path：structured → Sealer 成功

- **路径**：step0_EntryAdapter → step1_IfRawQuery(False) → step1b_IfStructured(True) → step1b_StructuredGate → step1b_IfGatePass(True) → **step1b_SAM_TaskCreate**。
- **最终节点输出（示例）**：

```json
[
  {
    "success": true,
    "task_id": "04d1f2e5-1a89-4b7b-b8f6-068d839b50df",
    "execution_id": "911988fc-012e-4fff-9815-1d6deab7c39e",
    "message": "Task and Execution sealed successfully."
  }
]
```

- **审计贯穿**：execution_id 可追溯；与 §一 Happy Path 一致。

### 5.2 Happy Path：timeline → Sealer 成功

- **路径**：step0_EntryAdapter → step1(False) → step1b(False) → step1c_IfTimeline(True) → step1c_TimelineGate → step1c_IfGatePass(True) → **step1c_SAM_TaskCreate**。
- **最终节点输出（示例）**：

```json
[
  {
    "success": true,
    "task_id": "2a2cb1bd-9f26-4f35-abde-e75f0ac402bc",
    "execution_id": "c702567a-1800-4d5d-8d23-858c62541f5f",
    "message": "Task and Execution sealed successfully."
  }
]
```

### 5.3 Gate 失败（Structured）：missing_intent

- **路径**：step0_EntryAdapter → step1(False) → step1b_IfStructured(True) → step1b_StructuredGate → step1b_IfGatePass(False) → **step1b_StructuredGateFail**。
- **最终节点输出（示例）**：

```json
[
  {
    "_gate_pass": false,
    "reason": "missing_intent",
    "message": "payload.intent or payload.intent_name required"
  }
]
```

- **审计贯穿**：无 execution_id；gate_result / reason 留痕；与 §二 Reject 路径一致。

### 5.4 Gate 失败（Timeline）：not_expired

- **路径**：… → step1c_TimelineGate → step1c_IfGatePass(False) → **step1c_TimelineGateFail**。
- **最终节点输出（示例）**：

```json
[
  {
    "_gate_pass": false,
    "reason": "not_expired",
    "message": "scheduled_at > now(), skip"
  }
]
```

### 5.5 非法 entry_type → UnknownEntryType

- **路径**：step0_EntryAdapter → step1(False) → step1b(False) → step1c_IfTimeline(False) → **step1d_UnknownEntryType**。
- **最终节点输出（示例）**：

```json
[
  {
    "_unknown_entry_type": true,
    "entry_type": "unknown_type",
    "message": "Unsupported entry_type."
  }
]
```

- **审计贯穿**：无 Sealer 调用；_unknown_entry_type、entry_type 可留痕。

### 5.6 Continue Chat（raw_query 空/未知意图）

- **路径**（raw_query 空或解析为 unknown）：… → step11_ContinueChat。
- **最终节点输出（示例）**：

```json
[
  {
    "gate_result": "continue_chat",
    "reason": "capability_not_found",
    "message": "Capability capability.unknown not found in registry.",
    "_continue_chat": true
  }
]
```

- **审计贯穿**：无 Execution 写入；gate_result、reason 留痕；与 §二 无 execution_id 场景一致。

### 5.7 幂等第二次返回（Trace 片段）

- **场景**：同一 idempotency_key 的请求第二次调用；Sealer 返回已有 Execution。
- **最终节点输出（示例）**：

```json
[
  {
    "success": true,
    "task_id": "16c89c00-ece8-4dc7-b2d1-650b66d74752",
    "execution_id": "08cdf1d7-37fd-4d5a-ad95-076e3a5f34a5",
    "message": "Idempotent request: returned existing Execution."
  }
]
```

- **审计贯穿**：execution_id 与第一次相同；与 09.4 幂等处置一致。

---

**文档位置**: `LEO_ProductManager/4.Working/FSD/10_Appendix/A3_Example_Traces_v1.0.md`
