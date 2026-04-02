# Nexa Solution Deck Outline (2026-04-02)

## Purpose

这份文档是 Nexa 对外演示版方案提纲，用于：
- 客户方案介绍
- 商务合作沟通
- 路演或融资场景的产品讲解
- 内部统一演示口径

它不是完整的产品白皮书，也不是 FSD。它的作用是把 Nexa 的产品价值、平台结构、能力边界与落地方向，整理成一套可以直接转成 PPT 的讲述顺序。

建议总页数：`12-15` 页。
建议演示时长：`15-25` 分钟。
建议讲述方式：先问题，再平台，再能力，再样板，再路线。

---

## Slide 1 - Cover

### 标题
`Nexa`

### 副标题
`An auditable AI agent platform for enterprise operations and knowledge workflows`

### 页面目标
在第一页明确 Nexa 不是单点 AI 工具，而是平台。

### 核心信息
- Nexa 是一个面向企业的 AI Agent Platform
- 它统一承载业务事实查询、知识问答、审核流程与受控动作
- `MAXshot` 是其当前客户样板项目，而不是平台本身

### 建议视觉
- 平台品牌标题
- 一个四层结构示意图的弱化背景：`Core / Ops & Data / FAQ & KB / Solution Layer`

### 演讲备注
开场不要先讲模型或技术栈，先讲平台定位。

---

## Slide 2 - The Problem

### 标题
`The Enterprise AI Gap`

### 页面目标
定义企业 AI 现状中的关键断层，让后续平台方案有承接点。

### 核心信息
- 企业已经有大量业务数据、FAQ、知识文档，但这些资产分散且缺乏统一入口
- 大多数 AI 工具停留在“聊天界面 + Prompt 封装”层面，缺乏审计、审核和系统接入能力
- 企业真正需要的不是更会说的 AI，而是更能接系统、更能保边界、更能沉淀知识的 AI 平台

### 可用 bullet
- Data is fragmented
- Knowledge is unmanaged
- AI outputs are often unverified
- Actions lack governance
- Teams cannot operationalize learning

### 建议视觉
- 左侧：碎片化工具图标
- 右侧：风险点列表，如 `No audit`, `No review`, `No bounded action`, `No reuse`

### 演讲备注
这一页不是泛讲“AI 很热”，而是讲企业为何难以真正落地 AI。

---

## Slide 3 - Why Now

### 标题
`Why This Platform Category Matters Now`

### 页面目标
建立产品方向的时代背景与合理性。

### 核心信息
- 新一代 AI 应用正在从单轮问答升级为具备工具、状态、审核和外部系统接入能力的 agent system
- 主流平台和协议都在推动模型与工具、知识、工作流之间的标准化连接
- 企业采购标准正在从“回答得像不像”转向“能否治理、能否审计、能否持续运营” 

### 可以引用的背景方向
- Tool use 与 external system integration 已成为主流 AI 产品能力
- File search / retrieval / background execution / MCP 等能力正在成为平台层基础设施
- 企业会更关注 governance、safety、auditability 和 ROI，而不是纯聊天体验

### 建议视觉
- 时间线：`Chatbot -> Tool Use -> Agent Runtime -> Governed AI Platform`

### 演讲备注
这一页是为了证明 Nexa 不是偶然想法，而是顺着产业方向走的产品。

---

## Slide 4 - What Is Nexa

### 标题
`Nexa at a Glance`

### 页面目标
用一句话和四个关键词把 Nexa 讲清楚。

### One-line positioning
`Nexa is an auditable AI agent platform for enterprise operations and knowledge workflows.`

### 四个关键词
- `Query`
- `Knowledge`
- `Review`
- `Bounded Action`

### 核心信息
Nexa 统一解决四类能力：
- 自然语言查询业务事实
- 通过知识库与 FAQ 回答产品问题
- 对低置信度结果进入审核与复核链
- 对写入型动作进行受控执行

### 建议视觉
- 四象限或四块能力卡片

### 演讲备注
这里要强调它不是一个 FAQ bot，也不是一个 ops dashboard，而是平台。

---

## Slide 5 - Platform Topology

### 标题
`Platform Topology`

### 页面目标
讲清楚平台不是单层应用，而是多层结构。

### 核心结构
1. `Nexa Core`
2. `Nexa Ops / Data Plane`
3. `Nexa FAQ / KB Plane`
4. `Customer Solution Layer`

### 每层一句话
- `Nexa Core`: 提供 session、intent、routing、execution、audit、delivery 等 runtime 基础能力
- `Ops / Data Plane`: 面向业务事实、执行记录、分析解释
- `FAQ / KB Plane`: 面向知识问答、知识治理、FAQ review 与 KB QC
- `Customer Solution Layer`: 承载客户专属数据、知识与工作流

### 建议视觉
用四层 stacked diagram 表示。避免复杂组件图。

### 演讲备注
这页是 deck 里的关键页。后面每一页都从这一层结构展开。

---

## Slide 6 - Core Runtime Design

### 标题
`How Nexa Runs`

### 页面目标
说明平台运行方式与普通聊天产品的区别。

### 核心流程
`Interpret -> Route -> Execute -> Verify -> Deliver -> Learn`

### 核心设计原则
- Router 保持确定性控制
- LLM 用于理解和建议，而不是最终调度
- 低置信度与高风险输出不能静默通过
- 审核、确认和写入边界是系统内建能力

### 建议视觉
- 用线性流程图展示 6 个阶段

### 演讲备注
如果听众偏技术，这页非常重要；如果偏商务，这页可以讲短一点。

---

## Slide 7 - Ops / Data Plane

### 标题
`Operations and Data Plane`

### 页面目标
讲清楚 Nexa 如何把结构化业务数据做成自然语言交互能力。

### 典型能力
- execution 查询
- APY / yield 趋势分析
- allocation / vault 查询
- rebalance 原因解释
- ranking / compare / time-window analysis

### 典型问题示例
- 最近一次 execution 发生了什么
- 最近 7 天 APY 走势如何
- 为什么今天没有 rebalance
- 哪条链当前收益最好

### 业务价值
- 降低业务查询门槛
- 缩短分析与复盘时间
- 提升运营与管理效率

### 建议视觉
- 放 3-4 个自然语言 query 示例 + 右侧结构化回答示意

---

## Slide 8 - FAQ / KB Plane

### 标题
`FAQ and Knowledge Plane`

### 页面目标
说明 Nexa 不是只处理业务数据，也能处理产品知识与客户知识库。

### 典型能力
- FAQ answering
- bounded fallback
- FAQ QA review
- KB upload QC
- review queue
- KB management

### 关键设计
- 知识库是可治理资产，不是随便上传的文件堆
- 低置信度回答进入 review，而不是伪装成正确答案
- KB source 需要 QC、状态和可追踪性

### 业务价值
- 增强帮助中心与客户支持效率
- 把 FAQ 运营从内容堆管理升级为知识资产治理
- 让企业能够逐步沉淀可复用知识面

### 建议视觉
- 左：FAQ ask
- 中：confidence / fallback / review
- 右：KB management / review queue

---

## Slide 9 - Human Review and Governance

### 标题
`Governance by Design`

### 页面目标
讲清楚 Nexa 为什么适合企业而不是个人玩具型 AI。

### 核心机制
- review queue
- approval-required mutations
- operator identity
- confirm token
- bounded status transitions
- audit and replay

### 关键观点
Nexa 不把“自动化”理解为无边界地让模型执行，而是把自动化建立在治理能力之上。

### 建议视觉
- 一个 bounded action lifecycle 图：`prepared -> approved/rejected -> resolved`

### 演讲备注
这页适合重点讲给企业客户、合规角色、运营负责人听。

---

## Slide 10 - Memory and Learning

### 标题
`From Context to Learning`

### 页面目标
讲清楚 Nexa 不是只保存聊天记录，而是在建设可演进的平台记忆层。

### 三层模型
1. `Session Context`
2. `System Learning Memory`
3. `Customer Long-Term Memory`

### 核心信息
- 当前平台已经具备 session context 和薄层 runtime memory
- 下一阶段会把真实交互沉淀成结构化 learning log
- 长期目标是形成客户偏好与系统学习闭环，而不是无限堆上下文

### 建议视觉
- 三层阶梯图或三层同心结构图

### 演讲备注
这里不要讲成“我们已经有超级长期记忆”，要讲成清晰的演进方向。

---

## Slide 11 - Example Solution: MAXshot

### 标题
`A Customer Solution on Top of Nexa`

### 页面目标
用样板项目证明平台不是抽象概念。

### 核心信息
- `MAXshot` 是当前客户样板解决方案
- 它运行在 Nexa 平台之上
- 它结合了 Ops / Data Plane 与平台治理能力
- 它证明平台可以被客户解决方案化，而不是只停留在内部 demo

### 建议讲法
- 不是说“我们只有 MAXshot”
- 而是说“MAXshot 证明了 Nexa 的 solution layer 可以承载真实业务场景”

### 建议视觉
- 一张 `Nexa Platform -> MAXshot Solution` 的 overlay 图

---

## Slide 12 - Product Differentiation

### 标题
`Why Nexa Is Different`

### 页面目标
总结差异化，帮助听众形成记忆点。

### 推荐 5 个差异点
1. `Audit-first, not chat-first`
2. `Deterministic routing, not model-only orchestration`
3. `Knowledge as governed asset, not static file ingestion`
4. `Verify and review built in, not bolted on`
5. `Platform + solutions, not single-use bot`

### 建议视觉
- 左右对比表：`Generic AI Tool` vs `Nexa`

### 演讲备注
这页不要堆太多技术术语，重点是形成产品上的区隔。

---

## Slide 13 - Roadmap

### 标题
`Where Nexa Goes Next`

### 页面目标
讲清楚产品不是停在 MVP，而是有明确升级路径。

### 下一阶段重点
1. `Interaction Learning Log`
2. `KB Mutation Workflow`
3. `Customer / Tenant Model`
4. `Stronger Memory Layer`
5. `Runtime Evolution`

### 核心原则
- 先深化现有平面，不盲目加更多杂散功能
- 先做平台化，再做包装和大规模扩张
- 先保证治理与可用性，再扩大自治能力

### 建议视觉
- 分阶段 roadmap：`Stage 1 -> Stage 2 -> Stage 3`

---

## Slide 14 - Ideal Customers

### 标题
`Who Nexa Is For`

### 页面目标
让听众快速判断是否属于目标客户。

### 目标客户类型
- 有结构化业务数据，需要自然语言查询与解释能力的团队
- 有 FAQ / 帮助中心 / 产品知识库，需要知识问答与知识治理能力的团队
- 对 AI 自动化有兴趣，但不能接受黑箱执行与无审计流程的组织
- 希望一个平台同时覆盖内部运营面与客户知识面的企业

### 团队画像
- 运营密度高
- 知识更新频繁
- 流程复杂但不愿引入不可控黑箱系统

### 建议视觉
- 行业或团队角色图标：Ops / Product / Support / Management

---

## Slide 15 - Closing Statement

### 标题
`Nexa: A Governed AI Platform, Not Just Another Chat Layer`

### 页面目标
给出最终的产品心智锚点。

### Closing message
Nexa 的目标，不是再造一个聊天窗口。

它的目标是把：
- 业务事实
- 知识资产
- 审核流程
- 受控动作
- 长期学习

统一到同一个可治理、可审计、可扩展的平台里。

### CTA 可选方向
- `Pilot with a customer solution`
- `Integrate your ops and knowledge surfaces`
- `Start with one governed plane, then expand`

---

## Appendix - Presenter Notes

### 适合对外讲的主线顺序
1. 先讲企业 AI 的断层
2. 再讲 Nexa 是平台不是 bot
3. 再讲两个产品平面
4. 再讲 governance 与 review
5. 再讲 MAXshot 样板
6. 最后讲 roadmap

### 演示时不要过度强调的内容
- 不要把当前平台讲成“已经 fully autonomous”
- 不要把 memory 讲成“已经具备强长期人格记忆”
- 不要过早承诺复杂策略自动执行
- 不要把平台名和客户样板名混在一起

### 推荐搭配文档
- 对外说明主文档：
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_PLATFORM_EXTERNAL_PRODUCT_BRIEF_2026-04-02.md`
- 平台设计升级主文档：
  - `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/docs/status/NEXA_V5_3_DELTA_DESIGN_2026-04-02.md`
