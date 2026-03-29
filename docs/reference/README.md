# Docs Reference Index

## 目的

`docs/reference` 是当前项目的**设计与实施参考层**。  
这里不放运行态报告，不放临时测试产物，只放：

1. 架构标准
2. 分步骤实施计划
3. Prompt 管理标准
4. 共享模板
5. 外部参考收敛后的项目内结论

---

## 当前目录用途

### Step 级架构与实施
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_架构参考对照笔记_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_落地实施计划_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_详细任务拆解_WBS_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_测试矩阵_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/STEP2_编码执行清单_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_模块级Contract_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_状态模型_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_Session_Resolver_Contract_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_Context_Policy_Decision_Table_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_Recall_Adapter_Contract_V1_2026-03-21.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/step2/STEP2_代码迁移映射表_V1_2026-03-21.md`

### Prompt 管理
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/prompts/PROMPT_LIBRARY_OP_V1_2026-03.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/PROMPT_本地管理标准_V1_2026-03-21.md`

### 模板
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/templates/PROMPT_SPEC_TEMPLATE_V1.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/templates/STEP_IMPLEMENTATION_PLAN_TEMPLATE_V1.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/templates/STEP_TEST_MATRIX_TEMPLATE_V1.md`

### FSD
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/reference/FSD`

---

## 维护原则

1. `docs/reference` 只放“可复用标准”
2. `docs/status` 只放“阶段结果 / 报告 / 对齐结论”
3. Prompt 不通过 Supabase 管理，当前项目以**本地文件**为真源
4. 任一步骤开始开发前，先补齐：
   - 架构参考
   - 实施计划
   - 任务拆解
   - 测试矩阵
   - Prompt 规格

---

## 当前共识

### Step 1
- 纯 `Entry Envelope`
- 不做语义判断

### Step 2
- 正式定义为 `Conversation Context Manager`
- LLM 主导 `turn_relation`
- Code 主导 harness / policy / state / guardrails

### Prompt 管理
- 本地文件真源
- 先定义 contract，再接运行时
- 不再以数据库 Prompt 表作为首选管理方式
