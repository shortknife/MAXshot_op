# 08 Gateway / Router / n8n Integration

> **要点**：
- 不新建 Gateway，Router 即调度核心
- n8n 作为工作流编排层
- 端到端请求流：Entry → Sealer → Router → Capability（n8n 节点）

**本目录文档**（Cat 产出，2026-02）：
- `08.1_Why_No_New_Gateway_v1.0.md` — 不新建 Gateway、Router 即调度核心的产品理由
- `08.2_Router_Responsibilities_v1.0.md` — Router 职责边界；与 Technical Architecture 衔接
- `08.3_n8n_Workflow_Boundaries_v1.0.md` — n8n 只做编排、边界与约束；与 Alex 合作
- `08.4_End_to_End_Request_Flow_v1.0.md` — Entry → Sealer → Router → Capability 端到端流

**技术实现**：详见 Cat `Integration_Specification`、`Technical_Architecture_Intent_Analyzer`
