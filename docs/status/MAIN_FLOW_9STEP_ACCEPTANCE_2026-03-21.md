# Main Flow 9-Step Acceptance

- Generated at: 2026-03-29T16:10:56.169Z
- Base URL: http://127.0.0.1:3003
- Active capabilities: capability.data_fact_query, capability.product_doc_qna, capability.content_generator, capability.context_assembler
- Regression: lint=PASS, phase0=FAIL, phase1=PASS, phase2=PASS

## 1. 测试目标

- 按主流程 9 步逐层确认系统是否可信，而不是只看最终回答。
- 每一步按统一模板记录：输入/输出、实现方式、边界、既有测试、本轮新增测试、通过标准、失败归因。
- 本轮主链优先级仍是 `data_fact_query`；`product_doc_qna` 只做边界验证。

## 2. 9 步模板化结果

### Step 1 - Entry（多通道归一）
- **目标**: 保证请求进入系统后不会在入口被错误改写或污染。
- **输入**: `raw_query`、`session_id`、`channel/body`
- **输出**: `标准化请求体`、`effectiveQuery`
- **实现方式**: Code（请求归一、session/new-question 判断由代码主导）
- **当前产品边界**:
  - 当前只重点覆盖 chat 主入口。
  - 已修复“新问题被旧澄清吞掉”的主风险。
  - 尚未做 TG / Notion 真入口联调。
- **之前已测过的数据**: 当前 vault APY 怎么样？；你能描述什么是MAXshot么？；prompt-intent 10-case gate checks
- **本轮新增测试**: 同 session 先问 APY 再切到产品定义类问题；无 session_id 的 standalone 产品定义问法
- **通过标准**: 新问题不被当成旧澄清补充；入口不把产品定义类问题改写成 APY/yield
- **失败归因**: Entry / session context / Entry / request normalization
- **本轮结果**: FAIL (0/2)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| E1 新问题切场景不被旧澄清吞掉 | FAIL | first=- second=MAXshot 是一个面向多链资产运营与治理的产品，用于管理金库、执行策略动作、追踪执行过程，并为运营决策提供可审计的上下文与事实依据。 |
| E2 无 session_id 时 standalone query 可独立进入 | FAIL | summary= |

### Step 2 - Context + Registry Load
- **目标**: 保证 registry、memory refs、session follow-up context 装载正确。
- **输入**: `session_context`、`active capability registry`、`memory refs`
- **输出**: `active capability 列表`、`memory_refs_ref`、`可供识别链使用的上下文`
- **实现方式**: Code（registry 与 memory runtime 由代码主导）
- **当前产品边界**:
  - registry-first 已接入运行时。
  - memory runtime 是收紧版，不是最终完整版。
  - 只验证 active capability，不验证 inactive publisher 执行。
- **之前已测过的数据**: memory_refs_ref；matched_capability_ids；phase2 audit checks
- **本轮新增测试**: vault query 的 registry ref 稳定出现；follow-up 只在合理场景生效
- **通过标准**: active capability 正确加载；memory refs 含 capability registry ref；context 不串场
- **失败归因**: Context / registry load
- **本轮结果**: PARTIAL (1/2)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| C1 Active capability registry 可装载到识别链 | FAIL | matched=[] |
| C2 memory refs 含 capability registry ref | PASS | memory_refs_ref=["business_data_query.index.sources","business_data_query.index.policy","business_data_query.intent.vault_list","capability_registry_v1","capability_registry_v1:capability.data_fact_query"] |

### Step 3 - Intent 识别
- **目标**: 正确得到 capability match、slots、clarification 状态。
- **输入**: `normalized query`、`session context`、`capability list`
- **输出**: `matched_capability_ids`、`primary_capability_id`、`slots`、`need_clarification`
- **实现方式**: 混合（LLM 负责 capability match/slot extraction，Code 负责 normalize/fallback/contract 校验）
- **当前产品边界**:
  - 已支持 capability-first。
  - 仍保留兼容 fallback。
  - product_doc_qna 只验证边界，不代表知识源已完成。
- **之前已测过的数据**: APY / vault / execution / content / 产品定义问法；absolute range prompt-intent report
- **本轮新增测试**: 绝对日期区间；产品定义问法；smalltalk/out_of_scope
- **通过标准**: 完整 query 不误澄清；产品定义不误进 business；smalltalk 不命中业务 capability
- **失败归因**: Prompt / slot extraction
- **本轮结果**: PARTIAL (2/3)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| I1 绝对时间区间被抽成 date_from/date_to | FAIL | type=- slots={} |
| I2 产品定义问法不误进 business_query | PASS | type=- matched=[] |
| I3 smalltalk 不命中业务 capability | PASS | type=- reason=- |

### Step 4 - Gate
- **目标**: 判断是继续聊天、通过、还是确认。
- **输入**: `intent IR`、`slots`、`matched capability`
- **输出**: `continue_chat / pass / require_confirmation`
- **实现方式**: Code
- **当前产品边界**:
  - read-only 主链已稳定。
  - 写路径仍要求 confirmation token / operator。
- **之前已测过的数据**: clarification；too_many_capability_matches；phase2 gate checks
- **本轮新增测试**: 完整 query 不能继续追问；incomplete query 必须 continue_chat
- **通过标准**: Gate 不越权重做意图识别；完整 read-only query 可 pass；不完整 query 必须 continue_chat
- **失败归因**: 无
- **本轮结果**: PASS (2/2)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| G1 incomplete query -> continue_chat | PASS | gate_result=continue_chat reason=missing_required_slots |
| G2 complete read-only query -> pass | PASS | gate_result=pass require_confirmation=false |

### Step 5 - Sealer（task/create）
- **目标**: 正确把 intent 封进 task/execution。
- **输入**: `gate pass 结果`、`slots`、`capability binding`
- **输出**: `task_id`、`execution_id`、`sealed payload`
- **实现方式**: Code
- **当前产品边界**:
  - 依赖可写环境和 confirm token。
  - 当前重点验证封印结构，不扩展新写路径能力。
- **之前已测过的数据**: phase2 task/create；too_many_capability_matches
- **本轮新增测试**: payload 保留 matched capability 和 slots
- **通过标准**: 生成 execution_id；封印内容与上游一致
- **失败归因**: 无
- **本轮结果**: PASS (2/2)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| S1 phase2 中 task/create 成功 | PASS | 来源: phase2 smoke |
| S2 phase2 中 execution confirm 成功 | PASS | 来源: phase2 smoke |

### Step 6 - Router（确定性 -> capability）
- **目标**: Router 根据 sealed data 做确定性调度。
- **输入**: `task/execution payload`
- **输出**: `capability binding`、`decomposition/context tags`
- **实现方式**: Code
- **当前产品边界**:
  - 已 capability-first。
  - 仍保留少量兼容层。
- **之前已测过的数据**: follow-up chain/protocol/vault；task_decomposition audit
- **本轮新增测试**: content_generator execution 的 decomposition；capability binding 审计检查
- **通过标准**: Router 不错绑 capability；不串 scope；审计中可见 decomposition/binding
- **失败归因**: Router / follow-up scope inference / Router / capability binding
- **本轮结果**: FAIL (0/2)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| R1 yield follow-up 不串 scope | FAIL | scope=- chain=- |
| R2 execution 查询不被 vault/yield 上下文污染 | FAIL | scope=- summary= |

### Step 7 - Capability 执行
- **目标**: capability 返回正确结果或正确失败语义。
- **输入**: `capability input envelope`
- **输出**: `capability output`
- **实现方式**: 混合（主体为 Code，某些 capability 依赖 Prompt/LLM）
- **当前产品边界**:
  - data_fact_query 可用。
  - content_generator 可用。
  - product_doc_qna 未接真实文档源。
- **之前已测过的数据**: yield/vault/execution/content；prompt-intent 10-case cases
- **本轮新增测试**: 绝对时间 top1 APY no_data 语义；content_generator execution chain
- **通过标准**: 完整查询不能返回误导性失败文案；主 capability 链可跑通
- **失败归因**: Capability / no-data handling / Capability / content_generator
- **本轮结果**: PARTIAL (1/3)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| X1 data_fact_query 绝对区间 no-data 语义正确 | FAIL | error=- summary= |
| X2 vault 列表查询 capability 正常返回 | PASS | scope=vault summary=当前可见 3 个 Vault，示例：dForce USDC - Morpho - base、dForce USDC - Morpho - ethereum、Maxshot Omni Vault USDC - Best Yield；主协议 N... |
| X3 content_generator capability 正常返回 | FAIL | type=- summary= |

### Step 8 - Trace + Audit
- **目标**: 保证链路可追踪、可审计。
- **输入**: `execution result`、`metadata`、`audit event hooks`
- **输出**: `audit events`、`evidence chain`、`memory refs`、`execution trace`
- **实现方式**: Code
- **当前产品边界**:
  - 已具备审计链。
  - 重点看 meta 一致性，不扩展新 observability 能力。
- **之前已测过的数据**: phase2 causality / lineage / audit metrics；memory_refs_ref checks
- **本轮新增测试**: execution audit_steps canonical type；memory_refs_ref presence
- **通过标准**: 关键 trace 字段完整；与真实路径一致
- **失败归因**: 无
- **本轮结果**: PASS (3/3)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| T1 phase2 中 audit event persisted | PASS | 来源: phase2 smoke |
| T2 phase2 中 memory_refs_ref 已入审计链 | PASS | 来源: phase2 smoke |
| T3 phase2 中 audit contract 通过 | PASS | 来源: phase2 smoke |

### Step 9 - 回传
- **目标**: 用户看到的结果不误导。
- **输入**: `capability output`、`response normalizer`
- **输出**: `summary`、`error`、`next_actions`、`highlights`、`meta`
- **实现方式**: 混合（Code 为主，少量 summary 由 capability 输出）
- **当前产品边界**:
  - 当前 UX 已可用，但仍是 MVP 形态。
  - next_actions 是引导，不是完整按钮系统。
- **之前已测过的数据**: APY summary；clarification；qna fallback；content draft
- **本轮新增测试**: no_data_in_selected_range 文案；clarification next_actions；content 回传
- **通过标准**: summary / error / next_actions 与真实状态一致；不误导用户
- **失败归因**: UX 文案 / UX / clarification
- **本轮结果**: PARTIAL (1/3)

| 检查项 | PASS/FAIL | 结果摘要 |
| --- | --- | --- |
| U1 no_data_in_selected_range 文案不误导 | FAIL | error=- summary= |
| U2 clarification 与 next_actions 保持自然语言引导 | FAIL | error=- next_actions=[] |
| U3 content draft 回传正常 | PASS | type=marketing summary=已生成草稿，你可以继续改写语气或缩短长度。 |

## 3. 关键 Query 映射

| Query | 主要覆盖步骤 | 当前结论 |
| --- | --- | --- |
| `当前 vault APY 怎么样？` | 1,3,4,9 | 会触发合理澄清 |
| `最近7天` | 1,6,7,9 | 可承接上轮 APY 澄清 |
| `看 arbitrum 的 APY` | 1,6,7,9 | follow-up 可沿用 yield 上下文并正确加 chain 过滤 |
| `3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？` | 3,4,7,9 | 已识别绝对时间区间；当前按 `no_data_in_selected_range` 正确降级 |
| `MAXshot 有哪些 vault 可以用？` | 2,3,7,9 | 正确走 `capability.data_fact_query(scope=vault)` |
| `给我最近一笔 execution 详情` | 1,3,6,7 | 正确走 execution scope |
| `最近7天 arbitrum morpho 的 vault 列表` | 3,6,7 | 组合过滤可跑 |
| `你能描述什么是MAXshot么？` | 1,3,9 | 不再误路由到 APY/yield；文档能力本体仍未完成 |
| `MAXshot 品牌故事是什么？` | 3,9 | 不应误进业务数据查询；当前属于文档边界/安全 fallback |
| `写一条关于新品发布的帖子` | 3,5,6,7,9 | content_generator 主链可用 |

## 4. 问题分类

- Entry / session context: E1 新问题切场景不被旧澄清吞掉
- Entry / request normalization: E2 无 session_id 时 standalone query 可独立进入
- Context / registry load: C1 Active capability registry 可装载到识别链
- Prompt / slot extraction: I1 绝对时间区间被抽成 date_from/date_to
- Router / follow-up scope inference: R1 yield follow-up 不串 scope
- Router / capability binding: R2 execution 查询不被 vault/yield 上下文污染
- Capability / no-data handling: X1 data_fact_query 绝对区间 no-data 语义正确
- Capability / content_generator: X3 content_generator capability 正常返回
- UX 文案: U1 no_data_in_selected_range 文案不误导
- UX / clarification: U2 clarification 与 next_actions 保持自然语言引导

## 5. 结论

- 当前仍存在未通过步骤，不能宣告主链完全可信。
- 需要按上文“问题分类”继续修正，再重复本轮 9-step 验收。

