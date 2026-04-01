# MAXshot 母项目资产评估（2026-04-01）

## 1. 结论

`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot` 不是适合整体并入的代码基线。

它更像一个“母工作区”：
- 同时承载产品设计、角色协作、过程文档、模板、测试资产、旧版 `admin-os`
- 过程资产远多于可直接运行的产品资产
- 真正可复用的价值集中在少数几类：**Memory 合同与加载器思路、集成/Intent 规格、测试与模拟语料、模板治理资产**

结论判断：
- **不建议整体迁移**
- **适合定向并购**
- **优先并购文档/合同/测试资产，其次才是代码资产**

---

## 2. 扫描范围

已扫描的高价值区域：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/00.System/Team_Memory/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/scripts/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/e2e/`

---

## 3. 可直接并购的资产

### 3.1 Memory 类型合同

文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/types/memory.ts`

价值：
- 明确了 `foundation / experience / insight` 三类 Memory 的类型边界
- 定义了 `MemoryRef`、`ResolvedMemory`、`LoadOptions` 等运行时合同
- 比当前仓库的薄层 Memory 描述更完整，适合作为 **Memory v2 类型合同草案**

建议：
- **并购其类型设计思路**，不要整文件原样引入业务字段
- 保留以下抽象：
  - `MemoryType`
  - `MemoryRef`
  - `ResolvedMemory`
  - `LoadOptions`
- 删除或重写其中明显偏旧内容运营场景的字段（如 channel template / publishing feedback）

结论：**高价值，可直接吸收其抽象层**。

### 3.2 Team Memory 四层结构文档

文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/00.System/Team_Memory/README.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/00.System/Team_Memory/MEMORY.md`

价值：
- 提供了清晰的开发记忆分层：
  - 核心记忆
  - 情景记忆
  - 语义记忆
  - 程序记忆
- 这和我们当前已经建立的 `docs/project-memory/` 很接近，但母项目的分层表述更系统

建议：
- **不迁移整个 Team_Memory 目录**
- 只吸收其“分层原则”和“写入规则”到当前项目的 Memory/Docs 治理文档

结论：**高价值文档资产，可直接并购理念与结构**。

### 3.3 规格模板库

目录：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/`

优先文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/Capability_Schema_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/Context_Rebuild_Guide_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/Prompt_Design_Document_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/Status_Template.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/TODO_Template.md`

价值：
- 这批模板适合当前仓库继续做：
  - capability 契约文档统一化
  - prompt 设计文档规范化
  - step 状态与 TODO 的固定格式

建议：
- 只选择上述模板并购
- `AGENTS_Template.md` / `PERSONA_Template.md` 价值较低，当前仓库已有自己的规则体系

结论：**中高价值，可并购到 `docs/templates/` 或 `docs/reference/`**。

---

## 4. 可改造后并购的资产

### 4.1 Memory Loader / Resolver 代码

文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/lib/memory-loader.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/lib/memory-refs-resolver.ts`

价值：
- `memory-loader.ts` 提供了比较成熟的：
  - TTL cache
  - cache key 构造
  - typed load options
  - memory 分类型加载
- `memory-refs-resolver.ts` 提供了：
  - `memory_refs` 解析流程
  - circular reference 防护
  - 格式化为 LLM 上下文的统一出口

问题：
- 业务数据模型明显偏旧内容生产系统，不匹配当前 MAXshot(opencode) 的业务事实表
- 直接复制会带入无关字段和旧表依赖

建议：
- **不直接 merge 代码**
- 但应把其中这 4 个能力抽出来重做：
  1. `MemoryCache` TTL 与统计
  2. `MemoryRef` 到实体的统一解析器
  3. circular reference 防护
  4. `formatMemoriesForContext()` 的统一格式化出口

结论：**高价值代码思路，可重写并购，不宜原样迁入**。

### 4.2 Intent / Integration 规格文档

文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/Integration_Specification_v4.1.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/Technical_Architecture_Intent_Analyzer_v1.0.md`

价值：
- 虽然文档里包含旧实现背景，但有 3 类内容仍然有价值：
  1. `EntryRequest` / `Execution` / `CapabilityInput` 等合同表达
  2. `pending_confirmation`、`Continue Chat`、`Entry Gate` 的状态定义
  3. `Entry Memory` vs `session_context` vs `memory_refs` 的职责边界

问题：
- 文档里混有旧实现环境与历史路线，不能当作现行系统规范直接引用

建议：
- 仅提炼这些“冻结边界词汇和状态机定义”
- 重写成当前仓库的 Runtime / Harness 文档

结论：**高价值规格资产，适合提炼后并购**。

### 4.3 测试语料与模拟脚本

文件：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/scripts/simulate_router_18_v2_three_capabilities.js`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/scripts/router_18_v2_three_capabilities_local_results.json`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/scripts/run_intent_prompt_tests.js`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/e2e/business-query-e2e_v1.0_skill_none_v1.0_source_qa-agent.spec.ts`
- 以及 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/e2e/` 下其余 business/query/chat 相关 spec

价值：
- 这些资产最重要的不是实现，而是：
  - query phrasing 语料
  - capability 分发 case
  - 拒绝/降级/治理查询防误用 case
  - E2E 行为断言结构

问题：
- endpoint、页面、表名、运行方式都已经不是当前仓库的主实现

建议：
- **把它们当测试 corpus 迁入**，不要当现成测试直接运行
- 可转为：
  - `chat/ask` regression prompts
  - capability route regression
  - governance / forbidden query negative cases

结论：**非常高价值，但必须改造后并购**。

---

## 5. 仅参考、不建议并购的资产

### 5.1 母项目整套角色/团队目录

目录示例：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Alex-CoreEngineer/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEE_MemoryManager/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/Lily_QASpecialist/`

判断：
- 过程文档过多
- 角色时代痕迹强
- 大量文件是协作快照，不是产品资产

结论：**只查，不迁**。

### 5.2 旧版 `admin-os` UI / 页面实现

目录：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/app/`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/components/`

判断：
- 可能有局部页面细节可参考
- 但当前仓库已经演化到自己的主线，整体搬运价值低

结论：**除非明确需要某个组件，否则不并购**。

### 5.3 过程归档与阶段总结

例如：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEE_MemoryManager/1.Archive/Skill-First_Architecture_Task_Execution_Summary_2025-01-30.md`

判断：
- 对理解母项目历史有帮助
- 对当前产品工程直接价值低

结论：**仅供历史追踪，不并购**。

---

## 6. 明确应忽略的资产

1. 旧平台耦合的实现细节
2. 角色协作文档中的日常过程稿
3. 已过时的工作流/提示词发布痕迹
4. 与当前 bounded harness 无关的历史运维文件

这些内容会显著增加噪音，不值得进入当前仓库。

---

## 7. 建议并购优先级

### P0：应尽快吸收

1. **Memory 抽象合同**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/types/memory.ts`
- 目标：升级当前薄层 Memory 合同

2. **测试语料 / Query regression corpus**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/e2e/`
- 目标：扩充当前 chat/business query 固定验收集

3. **Intent / Entry / Confirmation 状态定义**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/*.md`
- 目标：补强当前 Harness 文档和 runtime state model

### P1：值得在下一阶段吸收

4. **Memory loader / resolver 运行时模式**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/lib/memory-loader.ts`
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/admin-os/lib/memory-refs-resolver.ts`
- 目标：Memory v2 runtime

5. **Team Memory 四层治理**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/00.System/Team_Memory/`
- 目标：开发记忆 / 迭代记忆治理

6. **模板资产**
- 来源：`/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/02.Templates/`
- 目标：统一 Capability / Prompt / Status 文档格式

---

## 8. 最终判断

母项目对当前 MAXshot(opencode) 的价值，不在于“再拿一套旧产品实现”，而在于提供 4 类成熟资产：
- Memory 抽象
- Harness / Intent 状态定义
- 测试语料与模拟样本
- 治理模板

一句话结论：

**母项目是一个高价值资产矿，但不是可直接合并的代码母版。最值得并购的是 Memory 合同、测试 corpus、Intent/Entry 状态规格，以及少量治理模板。**

