# 06 Intent Analyzer

> **依据**：FSD 06.1、v5.1 架构  
> **状态**：本目录为 FSD 唯一存放

| 文档 | 说明 |
|------|------|
| **06.1_Intent_Analyzer_Capability_Spec_v1.0.md** | Intent Analyzer 专项设计（输入形态、调用边界、架构守卫、验收标准） |

**核心要点**：
- Intent Analyzer 是函数式能力，不是 Agent
- Session = 启动 snapshot + turn 内复用
- 不偷偷 load context
- **技术实现**：详见 Cat `Technical_Architecture_Intent_Analyzer`、`Integration_Specification`

---

## v5.1 Ops P0 模块与本目录映射

| v5.1 Ops 模块 | 职责 | 与 06 的关系 |
|---------------|------|--------------|
| **Intent Parser** | 理解用户真正想问什么 | 06.1 Intent Analyzer 的语义解析部分；Few-shot + Clarification |
| **Context Memory** | 记住对话历史、指代消解 | 06.1 的 Session/Context Load；`/context/load` 生成 snapshot |
| **SQL Engine（三级策略）** | 模板优先 + 受控生成 + 沉淀闭环 | 下游 Capability（data_fact_query），不在此目录；详见 v5.1 §3.4 |
| **Answer Formatter** | 数据转人话 | 下游 Capability 输出，不在此目录 |
