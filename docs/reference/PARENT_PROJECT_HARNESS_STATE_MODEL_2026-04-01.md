# 母项目 Harness 状态模型提炼（2026-04-01）

## 1. 目的

这份文档不是复刻母项目实现，而是把 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot` 中仍然有价值的运行时状态定义提炼成当前仓库可持续使用的术语层。

提炼来源：
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/Integration_Specification_v4.1.md`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot/LEO_Decision_Layer/2.Knowledge/Technical_Architecture_Intent_Analyzer_v1.0.md`

---

## 2. 仍然值得保留的核心定义

### 2.1 Entry 三分法

母项目的 `EntryRequest` 三分法仍然成立：
- `raw_query`
- `structured`
- `timeline`

对当前仓库的意义：
- `raw_query` 继续对应 chat / tg / web 文本入口
- `structured` 对应系统或表单驱动的结构化任务
- `timeline` 保留为未来的计划执行入口，不要求在 MVP 内完整实现

### 2.2 Continue Chat ≠ Reject

这个定义必须继续保留：
- 信息不足、目标不清、槽位不完整：`Continue Chat`
- 明确超边界、明确风险、明确禁止：`Reject`

不能把“暂时不能执行”误写成 Reject。

### 2.3 pending_confirmation 是状态，不是文案

母项目里对 `pending_confirmation` 的处理是对的：
- 它是一个执行状态
- 不是一句“请确认”的自然语言替代品
- 它要求有后续 `confirmed / rejected / expired` 分支

对当前仓库的意义：
- side-effect 能力如果恢复推进，仍应围绕这个状态机实现

### 2.4 session_context 与 memory_refs 必须分离

这个边界必须保留：
- `session_context`：对话连续性、指代消解、短期上下文
- `memory_refs`：Router/Capability 使用的知识引用

不能让两者互相替代，也不要把 session 里的短期对话直接当成长期 Memory。

### 2.5 Entry Memory 与 session_context 不是一回事

母项目中这个概念区分是有价值的：
- `Entry Memory`：判定入口能否执行、有哪些合法 intent / capability / policy
- `session_context`：帮助理解当前这轮话在说什么

对当前仓库的意义：
- policy/gate 规则应继续留在代码与受控文档内
- 不要让 LLM 自行在运行时发明 policy

---

## 3. 当前仓库可采用的最小状态机

### 3.1 Entry 层

- `accepted_for_parse`
- `continue_chat`
- `rejected`

### 3.2 Execution 层

- `created`
- `pending_confirmation`
- `confirmed`
- `executing`
- `completed`
- `failed`
- `rejected`
- `expired`

当前仓库已经覆盖其中大部分状态；这份提炼的意义是统一术语，而不是引入新复杂度。

---

## 4. 这次实际吸收到了哪里

### 4.1 类型层

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/types/memory.ts`

已补强为：
- `MemoryType`
- `MemoryRef`
- `ResolvedMemory`
- `MemoryLoadOptions`
- `WorkingMind`

### 4.2 运行时层

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/router/memory-selection.ts`

已让 `WorkingMind` 显式携带：
- `source_policy`
- `memory_ref_count`

### 4.3 测试层

- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__fixtures__/parent-project-query-corpus.ts`
- `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot(opencode)/admin-os/lib/capabilities/__tests__/parent-project-query-corpus.test.ts`

已把母项目中有价值的 query phrasing 转成当前仓库可消费的 regression corpus。

---

## 5. 不吸收的部分

以下内容这次明确不吸收：
- 母项目旧实现环境细节
- 大量角色协作文档
- 历史页面/UI 结构
- 旧实现耦合的流程配置

这次吸收只保留：
- 状态定义
- Memory 合同
- 测试语料

---

## 6. 结论

母项目对当前 Harness 的真正价值，不是“提供另一套实现”，而是帮助当前仓库把这些边界继续说清楚：
- 什么是入口态
- 什么是执行态
- 什么是澄清态
- 什么是 Memory
- 什么不是 Memory

这部分已经完成第一轮吸收，可以作为后续 Runtime Evolution 的术语底座。
