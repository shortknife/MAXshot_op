# MAXshot FSD 产品文档集

> **状态**：**锁定基准**（2026-02 起）— 本目录为产品与技术开发的**唯一核对基础**；工票、执行跟踪、备忘录、CC 同步包等已移出至 `4.Working/` 或 `4.Working/CC_同步/`。  
> **本版执行原则**：**仅执行现有 8 条产品决议**；产品设计优劣讨论全部放入下一版本，本版不反复改需求。开发总指挥与开发人员以本 FSD（00–10 各 Module）为**产品开发核对的唯一基础**。  
> **目标读者**：技术 & 架构同学  
> **权威架构（执行版）**：`MAXshot_产品架构设计_v5.1_Small_Team_Growth_OS.md`（本目录）  
> **愿景参考（冻结）**：`MAXshot_产品架构设计_v5.0_Autonomous_Soul.md`（本目录）  
> **产品决议（备忘录）**：`产品决议_主流程与FSD对齐_2026-02.md`（本目录）— 8 条决议总览；**可执行细节已融入 00–10 各 Module**，开发与验收以各 Module 内「产品决议（本版唯一执行）」为准。

---

## 阅读入口（强制）

**新同学必须从这里开始**：`00_Read_First/00.4_How_To_Read_This_Document_Set.md`

---

## 目录结构

```
FSD/
├── 00_Read_First/          # 强制入口（5 文件，含 Soul_Cross_Cutting_Role）
├── 01_User_Journey/        # 用户路径与拒绝设计（4 文件）
├── 02_Layer_Model/         # 层级职责与审计矩阵（含 02.5 Capability 定义与接入、Capability_Contracts/）
├── 03_Execution_Model/     # Task × Execution 生命周期（4 文件）
├── 04_Working_Mind/        # 心智合成与 Evolution（5 文件，含 04.5）
├── 05_Intelligence_Boundary/ # Allowed / Forbidden / Grey（4 文件）
├── 06_Intent_Analyzer/     # 06.1 专项设计（唯一存放）
├── 07_Skills_Compatibility/ # 07.1 OpenClaw n8n 集成、07.2 灵魂三件套借鉴（唯一存放）
├── 08_System_Integration/  # 索引
├── 09_Observability/       # 索引
├── 10_Appendix/            # 附录占位
├── MAXshot_产品架构设计_v5.1_Small_Team_Growth_OS.md
├── MAXshot_产品架构设计_v5.0_Autonomous_Soul.md
└── 产品决议_主流程与FSD对齐_2026-02.md   # 锁定产品决议，审视开发依据
```

**给 CC 团队的同步包**（独立于 FSD）：`4.Working/CC_同步/` — 含产品依据与决议副本、同步清单、给 CC 留言；整包 copy 给 CC，FSD 不随之下发。

---

## 设计哲学（一句话）

**v5.0 不是「更聪明」，而是「更不容易犯不可逆的错」。**  
**v5.1**：在 v5.0 基础上务实收敛为「小微团队增长 OS」，Ops 数据可信化（P0）→ Marketing 策略闭环（P1）。

**本版开发核对**：产品设计 → 拆成 10 个 Module（00–10）→ 每个 Module 内有「产品决议（本版唯一执行）」与对应开发/验收要点 → 开发计划与进度检测按此结构执行。**Capability 定义、列表与接入**：见 02.5（`02_Layer_Model/02.5_Capability_Definition_And_Registry.md`）+ `02_Layer_Model/Capability_Contracts/`；开发/接入 3～10 个 capability 时以 02.5 与契约库为核对依据。
