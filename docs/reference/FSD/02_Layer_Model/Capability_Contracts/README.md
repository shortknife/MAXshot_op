# Capability Contracts — LEO 产品级契约库

> **Owner**: LEO (Product Manager)  
> **版本**: v1.0  
> **创建日期**: 2026-02-19  
> **适用范围**: Track A（Cat/Sam/Alex/John/Mike/Lily）+ Track B（Claude Code Agent）  
> **权威性**: 本目录为所有 Capability 的产品层面唯一定义来源。实现方式由各轨自主决定，但产品语义、验收标准、Side Effect 规则必须与本文档一致。
> **位置**: 本目录位于 FSD 内，`FSD/02_Layer_Model/Capability_Contracts/`，与 02.5 Capability 定义与接入同属 Module 02。

---

## 使用说明

- **Track A（n8n + TypeScript）**：实现时以本契约为产品规格，具体技术实现参见各自的设计文档
- **Track B（Claude Code Agent）**：实现时以本契约为产品规格，以 `MVP_Final_Development_Plan.md` 为技术执行计划
- **冲突处理**：若本契约与任何技术文档冲突，以本契约为准；如有疑问联系 LEO

---

## Capability 目录

| 编号 | Capability | 阶段 | 文件 |
|------|-----------|------|------|
| CC-01 | **Router** | P0 | [CC_01_Router.md](CC_01_Router.md) |
| CC-02 | **DataFactQuery** | P0 | [CC_02_DataFactQuery.md](CC_02_DataFactQuery.md) |
| CC-03 | **Publisher** | P0 | [CC_03_Publisher.md](CC_03_Publisher.md) |
| CC-04 | **ContentGenerator** | P1 | [CC_04_ContentGenerator.md](CC_04_ContentGenerator.md) |
| CC-05 | **ProductDocQnA** | P1 | [CC_05_ProductDocQnA.md](CC_05_ProductDocQnA.md) |
| CC-06 | **ContextAssembler** | P1 | [CC_06_ContextAssembler.md](CC_06_ContextAssembler.md) |

---

## 核心架构约束（两轨共同遵守）

1. **Router = 确定性调度器**：路由逻辑不得使用 LLM 参与决策
2. **LLM = 不可信建议来源**：LLM 输出必须经过验证层才能触发执行
3. **Side Effect 必须确认**：所有会改变外部状态的操作（发布、写入、更新）须经 `pending_confirmation` 流程
4. **Evolution = Recommendation Only**：Evolution Engine 输出建议，不自动执行
5. **三入口分工**：TG Bot（raw_query）/ Admin OS（structured）/ Notion（timeline）各有独立路由逻辑

---

**最后更新**: 2026-02-19
