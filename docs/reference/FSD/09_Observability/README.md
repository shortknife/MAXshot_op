# 09 Observability & Audit

> **要点**：
- Log 类型与 Schema（Trace / Intent / Exec / Safety）
- Audit Trail 贯穿 execution_id
- Replay 与 Production Failure Playbook

**本目录文档**（Cat 产出，2026-02）：
- `09.1_Log_Types_And_Schemas_v1.0.md` — Trace/Intent/Exec/Safety Log 类型与 Schema
- `09.2_Audit_Trails_v1.0.md` — Audit Trail 贯穿 execution_id、记录位置
- `09.3_Replay_Debugging_v1.0.md` — 基于 execution_id 的回放与调试流程
- `09.4_Production_Failure_Playbook_v1.0.md` — 生产环境故障处置手册（与 Lily 合作）

**关联文档**：
- FSD 02.3 Layer Audit And Ownership（谁决策、谁审计、记在哪）
- FSD 03.4 Replay And Audit Flow（回放流程）
- **技术实现**：详见 Cat `Integration_Specification`（Audit、execution_id、failure_modes）
