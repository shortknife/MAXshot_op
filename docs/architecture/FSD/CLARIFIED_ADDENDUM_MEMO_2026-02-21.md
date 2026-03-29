# FSD Clarified Addendum Memo (2026-02-21)

> 状态：For review  
> 规则：原文不改，新增补丁文件（Addendum）

## 已新增 Addendum 文件

1. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/00_Read_First/00.6_v5.1_Clarified_Product_Scope_Addendum_2026-02-21.md`
2. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/01_User_Journey/01.5_Business_Query_Rejection_Addendum_2026-02-21.md`
3. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/02_Layer_Model/02.5_Business_vs_Governance_Data_Plane_Addendum_2026-02-21.md`
4. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/03_Execution_Model/03.5_Task_Families_And_No_Silent_Downgrade_Addendum_2026-02-21.md`
5. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/06_Intent_Analyzer/06.6_Intent_Precedence_And_Prompt_Reuse_Addendum_2026-02-21.md`
6. `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/architecture/FSD/09_Observability/09.5_Business_Answer_Provenance_Addendum_2026-02-21.md`

## 对齐结果（摘要）

- 产品主入口：业务查询（Business Data Plane）
- 控制面定位：治理底座（Governance Plane）
- 强约束：禁止业务查询静默降级为治理数据回答
- 拒绝语义：新增业务域拒绝码并要求可读文案
- Intent：业务优先，治理动作需用户显式触发
- Prompt：优先复用既有模板，最小改造
- Observability：业务证据链与治理审计链分离记录
