# MAXshot FSD 产品文档集

> **状态**：Active（以 v5.2 为当前执行版）  
> **目标读者**：技术 & 架构同学  
> **权威架构（执行版）**：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`  
> **愿景参考（冻结）**：`MAXshot_产品架构设计_v5.0_Autonomous_Soul.md`（本目录）

---

## 阅读入口（强制）

**新同学必须从这里开始**：`00_Read_First/00.4_How_To_Read_This_Document_Set.md`

---

## 目录结构

```
FSD/
├── 00_Read_First/          # 强制入口（5 文件，含 Soul_Cross_Cutting_Role）
├── 01_User_Journey/        # 用户路径与拒绝设计（4 文件）
├── 02_Layer_Model/         # 层级职责与审计矩阵（4 文件）
├── 03_Execution_Model/     # Task × Execution 生命周期（4 文件）
├── 04_Working_Mind/        # 心智合成与 Evolution（5 文件，含 04.5）
├── 05_Intelligence_Boundary/ # Allowed / Forbidden / Grey（4 文件）
├── 06_Intent_Analyzer/     # 06.1 专项设计（唯一存放）
├── 07_Skills_Compatibility/ # 07.1 OpenClaw n8n 集成、07.2 灵魂三件套借鉴（唯一存放）
├── 08_System_Integration/  # 索引
├── 09_Observability/       # 索引
└── 10_Appendix/            # 附录占位
```

---

## 设计哲学（一句话）

**v5.0 不是「更聪明」，而是「更不容易犯不可逆的错」。**  
**v5.1**：在 v5.0 基础上务实收敛为「小微团队增长 OS」，Ops 数据可信化（P0）→ Marketing 策略闭环（P1）。
**v5.2**：在 v5.1 基础上转入 Harness-first，优先解决多轮稳定性、source contract、result critic 与 artifact discipline。

---

## Clarified Addendum（2026-02-21）

- 汇总索引：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/CLARIFIED_ADDENDUM_MEMO_2026-02-21.md`
- 说明：本批改动采用“原文不改 + Addendum 补丁文件”方式，避免覆盖历史基线文档。


## v5.2（2026-03-25）

- 当前执行版：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/MAXshot_产品架构设计_v5.2_Harness_OS.md`
- 配套架构差距分析：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/MAXSHOT_HARNESS_GAP_MAP_2026-03-25.md`
- 配套开发计划：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/DEVELOPMENT_PLAN_V5.2_HARNESS_2026-03-25.md`
