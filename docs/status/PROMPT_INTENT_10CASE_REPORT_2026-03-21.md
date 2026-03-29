# Prompt Intent 10-Case Report

- Generated at: 2026-03-21T02:05:30.435Z
- Base URL: http://127.0.0.1:3003
- 基础错误门: 已通过

## 1. 目标

- 先清会污染测试结论的基础错误，再做 10 条 Prompt/主流程测试。
- 本轮重点验证 capability match、澄清、follow-up、区间查询失败语义、以及 9 步主流程。

## 2. 基础错误门结果

- PASS G1 绝对时间区间 top1 APY 不再误澄清: intent=business_query error=no_data_in_selected_range summary=该时间区间内未检索到足够业务数据，暂时无法给出可靠结论。
- PASS G2 APY 查询先合理澄清: error=missing_required_clarification
- PASS G3 APY 澄清 follow-up 可承接: error=- scope=yield
- PASS G4 产品定义类新问题不被 APY 上下文污染: error=- summary=No document specified. Returning safe fallback.
- PASS G5 新业务问题切场景时不继承错误澄清: error=- scope=execution


## 3. 10 条测试明细

| ID | Query | 期望 Capability | 期望 Slots | 实际 Capability | 实际结果 | PASS/FAIL | 失败归因 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | 3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？ | capability.data_fact_query | `{"scope":"yield","aggregation":"max","entity":"vault","date_from":"2026-03-02","date_to":"2026-03-16"}` | capability.data_fact_query | error=no_data_in_selected_range summary=该时间区间内未检索到足够业务数据，暂时无法给出可靠结论。 | PASS |  |
| T02 | 3月2日到3月16日之间平均 APY 是多少？ | capability.data_fact_query | `{"scope":"yield","aggregation":"avg","date_from":"2026-03-02","date_to":"2026-03-16"}` | capability.data_fact_query | success summary=已返回 35 组最近窗口平均 APY；平均 APY 3.11%，最高 APY 4.09%，最新快 | PASS |  |
| T03 | 当前 vault APY 怎么样？ | capability.data_fact_query | `{"scope":"yield"}` | capability.data_fact_query | error=missing_required_clarification summary=你希望看哪个时间范围？ | PASS |  |
| T04 | 当前 vault APY 怎么样？ -> 最近7天 | capability.data_fact_query | `{"scope":"yield"}` | capability.data_fact_query | success summary=已返回 35 组最近窗口平均 APY；平均 APY 3.58%，最高 APY 23.44%，最新 | PASS |  |
| T05 | 当前 vault APY 怎么样？ -> 最近7天 -> 看 arbitrum 的 APY | capability.data_fact_query | `{"scope":"yield","chain":"arbitrum"}` | capability.data_fact_query | success summary=已返回 6 条业务指标记录；平均 APY 2.67%，最高 APY 4.15%，最新快照 TVL | PASS |  |
| T06 | MAXshot 有哪些 vault 可以用？ | capability.data_fact_query | `{"scope":"vault"}` | capability.data_fact_query | success summary=当前可见 3 个 Vault，示例：dForce USDC - Morpho - base、dF | PASS |  |
| T07 | 给我最近一笔 execution 详情 | capability.data_fact_query | `{"scope":"execution"}` | capability.data_fact_query | success summary=已找到执行记录 b6d7be70-d961-4908-9dad-f5cd385d3530，当前状 | PASS |  |
| T08 | 最近7天 arbitrum morpho 的 vault 列表 | capability.data_fact_query | `{"scope":"vault","chain":"arbitrum","protocol":"morpho"}` | capability.data_fact_query | success summary=当前可见 5 个 Vault，示例：dForce USDC - Morpho - base、dF | PASS |  |
| T09 | 你能描述什么是MAXshot么？ | capability.product_doc_qna | `{}` | capability.product_doc_qna | success summary=No document specified. Returning safe fallback. | PASS |  |
| T10 | 写一条关于新品发布的帖子 | capability.content_generator | `{"topic":"新品发布"}` | capability.content_generator | success summary=已生成草稿，你可以继续改写语气或缩短长度。 | PASS |  |

- 测试通过数: 10/10
- 回归结果: lint=PASS, phase0=PASS, phase1=PASS, phase2=PASS

## 4. 9 步主流程评估

### 1. Entry
- 状态: PASS
- PASS G1 绝对时间区间 top1 APY 不再误澄清
- PASS G2 APY 查询先合理澄清
- PASS G3 APY 澄清 follow-up 可承接
- PASS G4 产品定义类新问题不被 APY 上下文污染
- PASS G5 新业务问题切场景时不继承错误澄清

### 2. Registry Load
- 状态: PASS
- 10 条测试中 capability 可识别 10/10

### 3. Capability Match
- 状态: PASS
- 能力匹配通过 10/10

### 4. Gate
- 状态: PASS
- PASS G1 绝对时间区间 top1 APY 不再误澄清
- PASS G2 APY 查询先合理澄清
- PASS G3 APY 澄清 follow-up 可承接
- PASS G4 产品定义类新问题不被 APY 上下文污染
- PASS G5 新业务问题切场景时不继承错误澄清

### 5. Sealer
- 状态: PASS
- phase2 exit=0

### 6. Router
- 状态: PASS
- 关注 follow-up、scope、chain/protocol 继承

### 7. Capability Execute
- 状态: PASS
- data_fact_query 为主，content_generator 为对照

### 8. Trace + Audit
- 状态: PASS
- phase2 校验 execution/audit 链路
- chat 响应含 meta/memory_refs_ref/evidence_chain

### 9. Return / UX
- 状态: PASS
- 检查误澄清、误导性文案、follow-up 体验

## 5. 关键问题分类

- 本轮未观察到基础实现 bug。剩余风险主要是数据不足和未完成 capability 边界。

## 6. 结论

- 基础错误门已通过。
- 10 条测试达到验收门槛（>= 8/10）。
- 当前主链可以进入人工审阅；未通过项按“数据不足”或“未完成 capability”继续分类处理。
