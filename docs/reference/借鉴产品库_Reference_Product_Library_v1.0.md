# MAXshot 借鉴产品库 v1.0

> **创建日期**：2026-02  
> **维护者**：LEO (Product Manager)  
> **目的**：将参照产品、分析结论、借鉴与规避点统一记录，作为**产品架构调整与迭代**的重要参考标准。

---

## 一、产品清单与参照优先级

| 产品 | 参照优先级 | 核心价值 | 资料位置 |
|------|-----------|----------|----------|
| **OpenClaw** | **HIGH** | Agent 任务引擎、Gateway 设计、并发控制、容错机制、**安全/Tool-policy**、**记忆系统**、**成本分级** | 本文档 §二.1、`Reference_Projects/openclaw/`、`techdoc/OpenClaw*.pdf` |
| **Project NOVA** | **HIGH** | n8n + Router Agent、Switch 节点、工作流结构 | `Reference_Projects/Project_NOVA/`、`Reference_Projects_Cross_Analysis_Report_2025-01-30.md` |
| **Vanna** | **HIGH** | Text-to-SQL + RAG，data_fact_query 实现参考 | `Reference_Projects/Database/vanna/` |
| **OpenDeepWiki** | **MEDIUM** | 增量更新、多平台 Provider、多模型分阶段配置 | 本文档 §二.3、`techdoc/OpenDeepWiki v2.0.0*.pdf` |
| **Langflow** | **MEDIUM** | DAG 执行、可视化构建、可观测性 | `Reference_Projects/Langflow/`、`Reference_Projects_Cross_Analysis_Report_2025-01-30.md` |
| **AgentWeaver-Design** | **MEDIUM** | 内部设计传承：Memory 分层（Foundation/Experience/Insight）、Persona、Agent 成长 | `Reference_Projects/AgentWeaver-Design/` |
| **OpenClaw Skills 生态** | **LOW** | 产品用 Skill 挂载、ClawHub 资产形态 | `Cat-LEO_对话转发_Skill资产双轨与产品Skill库_2026-02.md` |
| **xiaomo-kit** | **LOW** | OpenClaw 中文 Starter、SOUL/USER/IDENTITY 模板 | `Reference_Projects/xiaomo-kit/` |
| **FM-Agent** | **LOW** | LLM + 进化搜索、分布式评估；Evolution 思路参考 | `Reference_Projects/FM-Agent/` |

### 优先级说明

| 优先级 | 含义 | 适用场景 |
|--------|------|----------|
| **HIGH** | 架构级参照，直接影响 Router/Entry/Capability/Memory 设计 | 做架构决策、补充 FSD 缺口时**必查** |
| **MEDIUM** | 功能级参照，可借鉴实现细节，非必须 | 做功能迭代、优化体验时参考 |
| **LOW** | 概念级参照，了解即可 | 做扩展规划、竞品对比时参考 |

---

## 二、各产品详情

### 2.1 OpenClaw

**定位**：自托管个人 AI 助手，Gateway + Agent 分层架构，多渠道统一入口。

**参照优先级**：**HIGH**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **Gateway** | 指挥中枢：Router 消息路由、Session Store、Skills Registry、Tool Policy | MAXshot **不建 Gateway**，Router 即调度核心（FSD 08.1） |
| **Agent Loop** | ReAct 循环：思考→行动→观察，LLM 驱动任务拆解 | MAXshot **确定性调度**，LLM = 不可信建议源 |
| **Lane 隔离** | 每 Session 串行队列，防并发导致状态损坏 | MAXshot **缺失**，需 Phase 2 补充 |
| **消息处理** | Steer/Collect/Followup/Interrupt 四种模式 | MAXshot 仅有 session_context 指代消解 |
| **上下文守卫** | 3 级：预检→自动压缩→降级重置 | MAXshot **缺失** |
| **模型容错** | 认证轮转 + 模型降级 | MAXshot **缺失** |
| **Tool-policy** | 构建上下文时完成权限控制，按 channel/group/sender ACL；未授权工具不出现 | Entry Gate + Grey Area + Policy，可借鉴按身份/场景白名单 |
| **Subagent 限制** | 默认 deny 敏感工具（sessions_spawn、memory_search 等），二次拦截 | 无 Subagent；若未来引入可参考最小权限 |
| **记忆双层** | 日常（YYYY-MM-DD.md）+ 长期（MEMORY.md），压缩前 Memory Flush | FSD 04 Foundation/Experience/Insight；可借鉴 Flush 时机 |
| **混合检索** | 向量 + BM25，0.7×向量 + 0.3×BM25 | 当前以向量为主，Phase 2 可增强 |
| **思考分级** | 6 级（off→xhigh），按复杂度匹配模型，降档重试 | FSD 06.5 模型降级，可借鉴等级预设 > 用户指定 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **Lane 隔离 / Execution Queue** | P0 | Router 按 user_id 串行执行，防上下文错乱 | Phase 2 必补 |
| **Steer 模式（消息修正）** | P0 | Entry/Router 增加 200–500ms 时间窗，新消息可修正未进入 Capability 的请求 | Phase 1.5/2 |
| **3 级上下文守卫** | P1 | Sam `/context/load` 增加 token 限制；John 设计压缩模式 Prompt | Phase 2 |
| **模型降级** | P1 | Intent Analyzer 配置 fallback model；FSD 06.5 明确降级路径 | Phase 2 |
| **Tool-policy 式权限控制** | P1 | 构建上下文前完成权限过滤；按 entry_channel/requester_role 白名单 Capability；默认不可信 | Phase 2（与 Degraded Mode 协同） |
| **压缩前 Memory Flush** | P1 | 上下文逼近阈值时，先执行一次记忆写入再压缩；减少摘要丢失 | 04.2 Memory 闭环实现细节，Phase 1.5/2 |
| **思考分级与降档重试** | P2 | 按任务复杂度分级；等级预设 > 用户指定 > 自动判断；遇不支持时降档重试 | 强化 FSD 06.5 |
| **Subagent 最小权限（若引入）** | P2 | 默认 deny 敏感工具；明确边界（输入/输出/允许操作/失败回退） | 未来若引入子 Agent |
| **混合检索权重** | P2 | 0.7×向量 + 0.3×BM25 可作参考配置 | Phase 2 混合检索 |
| **双层记忆职责** | P2 | 日常日志 vs 长期精华，对应 Experience/Insight 提炼沉淀流程 | 04.2 实现参考 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不建 Gateway** | MAXshot 单产品、单调度核心，Router 足够；Gateway 增加复杂度 |
| **不用 ReAct 循环** | 审计可追溯、成本可控、企业合规需要确定性；ReAct 自主性过高 |
| **不采用 Agent Loop 自主调度** | Architecture Guardrails：Router = 确定性调度器，LLM 仅做 Intent 建议 |
| **Markdown 文件存储记忆** | OpenClaw 用 MEMORY.md、memory/*.md；MAXshot 用 Supabase 等结构化存储，便于审计、多租户、留痕 |

#### 资料来源

- `Knowledgebase/techdoc/OpenClaw Agent任务引擎深度解析（上篇）：从架构到工程实践-2026年02月09日-来自【Get 笔记】.pdf`
- `Knowledgebase/techdoc/OpenClaw生产级Agent系统深度拆解（下）：安全、记忆、成本与协作机制-2026年02月10日-来自【Get 笔记】.pdf`
- `Knowledgebase/techdoc/OpenClaw全量记忆系统深度解析：agent持久化记忆的实现框架与技术细节-2026年02月10日-来自【Get 笔记】.pdf`
- `Knowledgebase/Reference_Projects/openclaw/`（源码）
- `LEO_ProductManager/4.Working/OpenClaw_Capability_Analysis_2026-02.md`

---

### 2.2 Project NOVA

**定位**：n8n + Router Agent 架构，25+ specialized agents，与 MAXshot Router + Capability 高度相似。

**参照优先级**：**HIGH**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **Router** | LangChain Agent 节点，LLM 输出 `SELECTED AGENT` | MAXshot：Intent Analyzer（LLM）→ Router（**确定性**选 Capability） |
| **Switch 节点** | 26 分支，按 agent_id 路由 | 可借鉴：Capability 路由用 Switch 比 IF 更清晰 |
| **Conversation History** | 表达式处理，注入 Router Prompt | 可借鉴：需适配 memory_layer_context、session_context |
| **Execute Workflow** | 调用子工作流（各 Agent） | 与 MAXshot Capability 子工作流一致 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **Switch 节点** | P1 | Capability 路由优先用 Switch 替代 IF | 可选 |
| **Conversation History 处理** | P1 | 参考表达式格式，适配 MAXshot 上下文结构 | Phase 2 |
| **Follow-up 问题识别** | P2 | 参考其机制，适配 session_context 继承 | Phase 2 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **LLM 直接调度** | NOVA 的 LLM 输出 SELECTED AGENT 即调用；MAXshot 必须保持 Router 确定性 |
| **单 Agent 调用** | NOVA 一次只调一个 agent；MAXshot 需支持 Capability Chain 串联 |
| **无 Memory 选择** | NOVA Router 只选 agent；MAXshot 需同时决定 Capability + memory_refs |

#### 资料来源

- `LEO_ProductManager/4.Working/Reference_Projects_Cross_Analysis_Report_2025-01-30.md`
- `Knowledgebase/Reference_Projects/Project_NOVA/`

---

### 2.3 OpenDeepWiki

**定位**：代码仓库 → AI 知识库，自动生成文档、结构图、思维导图，支持 MCP、飞书/QQ/微信。

**参照优先级**：**MEDIUM**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **增量更新引擎** | Git Diff 只更新变更文件，Token 降 80% | 若有产品文档金库随代码变更，可借鉴 |
| **多平台 Provider** | 飞书/QQ/微信统一接口，消息合并器 | Entry 若接飞书等，可借鉴 Provider 抽象 |
| **消息合并器** | 合并连续消息，减碎片化 | 与 OpenClaw Steer/Collect 类似 |
| **AI Agent 工厂** | 目录/内容/翻译用不同模型 | Intent vs content_generator 可分离模型 |
| **AUTO_CONTEXT_COMPRESS** | Prompt 编码压缩，90%+ 压缩比 | 长对话上下文可借鉴 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **消息合并器** | P1 | Entry 层连续消息聚合 | Phase 2（与 OpenClaw Steer 协同） |
| **多模型分离配置** | P1 | Intent 用低成本模型，content_generator 用高性能 | Phase 2 |
| **增量更新** | P2 | 若金库随代码/文档变更，参考 Git Diff 增量任务 | 按需 |
| **AUTO_CONTEXT_COMPRESS** | P2 | 长对话场景可参考其编码压缩策略 | 按需 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不照搬 Wiki 生成管线** | OpenDeepWiki 面向代码仓库；MAXshot 面向业务产品，知识来源不同 |

#### 资料来源

- `Knowledgebase/techdoc/OpenDeepWiki v2.0.0 预览版发布：架构重构与功能革新-2026年02月09日-来自【Get 笔记】.pdf`
- GitHub: https://github.com/AIDotNet/OpenDeepWiki

---

### 2.4 Langflow

**定位**：可视化 DAG 构建、Flow 编排、可组合执行。

**参照优先级**：**MEDIUM**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **DAG 执行** | 依赖排序、并行执行、错误处理 | Capability Chain 串联可参考 |
| **可视化构建** | React Flow + 拖拽式设计 | Admin OS 未来可视化可参考 |
| **类型兼容性检查** | 连接时检查 I/O Schema | Capability Contract 成熟后可参考 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **DAG 执行模式** | P2 | Capability Chain 依赖排序、并行 | 未来 Capability 编排复杂时 |
| **可视化构建** | P2 | Admin OS 拖拽式 Capability 编排 | 未来 Admin OS 迭代 |
| **Playground 测试** | P2 | Capability 单测/联调环境 | 按需 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不采用 Flow 优先** | MAXshot 当前以 n8n 工作流为主，可视化为增强项 |

#### 资料来源

- `LEO_ProductManager/4.Working/Reference_Projects_Cross_Analysis_Report_2025-01-30.md`
- `Knowledgebase/Reference_Projects/Langflow/DAG_Execution_Analysis_2025-01-30.md`

---

### 2.5 OpenClaw Skills 生态

**定位**：ClawHub、Awesome OpenClaw Skills，产品可挂载能力。

**参照优先级**：**LOW**

#### 要点

- **产品用 Skill**：从 `Knowledgebase/Claude Skills` 选 5 个（summarize、document-writer、bird、notebooklm、notion），MVP 试点 = summarize
- **与 Lucy 开发用 Skill 区分**：产品 Skill 供终端用户，开发 Skill 供团队

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **产品 Skill 挂载** | P1 | 按 LEO 圈定清单约束 audit.used_skills | 已定，Cat 写入大票 |
| **ClawHub 资产形态** | P2 | 了解 OpenClaw Skill 注册与分发方式 | 参考 only |

#### 资料来源

- `LEO_ProductManager/5.Collaboration/Cat-LEO_对话转发_Skill资产双轨与产品Skill库_2026-02.md`
- `Knowledgebase/Claude Skills/`

---

### 2.6 Vanna

**定位**：Text-to-SQL + RAG 开源方案，自然语言 → 检索 Schema/示例 → LLM 生成 SQL → 执行。

**参照优先级**：**HIGH**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **Schema/示例 RAG** | 用 DDL、数据字典、示例 SQL 训练/检索 | Mike 提供 Text-to-SQL 教材（50 条标准 SQL） |
| **LLM 生成 SQL** | 自然语言 → SQL | data_fact_query Capability 核心逻辑 |
| **只读执行** | 安全约束，禁止 DDL/DML | 与 MAXshot 查库底线一致 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **Text-to-SQL 管线** | P0 | data_fact_query 实现参考 | 大票已定，Alex 工票引用 |
| **RAG 检索结构** | P1 | Schema + 示例 SQL 作为 RAG 文档 | Mike 教材就绪后集成 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不照搬训练流程** | MAXshot 用 Mike 产出的教材，按项目 DDL 定制 |

#### 资料来源

- `Knowledgebase/Reference_Projects/Database/vanna/`
- `Cat_TechnicalLead/4.Working/tickets/Ops_主链路闭环_大票_2026-02.md`（§data_fact_query）

---

### 2.7 AgentWeaver-Design

**定位**：内部产品设计传承，Agent 孵化平台 PRD、Memory 分层、Persona、成长系统。

**参照优先级**：**MEDIUM**（内部设计传承）

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **Memory 分层** | Foundation / Experience / Insight | FSD Memory Layer 已采纳 |
| **Persona 设计** | 拟人化、自主性、成长性 | Soul Layer、Evolution Engine |
| **Agent 生命周期** | 创建→觉醒→运营→成长 | Capability 编排、Evolution 归因 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **Memory 分层体系** | — | 已纳入 FSD 02、04 | 已落地 |
| **Persona/Soul 设计** | P2 | Soul 横切层、00.5 Soul 文档 | 已落地 |
| **成长/Evolution 思路** | P2 | Evolution Engine、Recommendation | 设计中 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不照搬游戏化** | AgentWeaver 偏 C 端社媒 Agent；MAXshot 偏 B 端 Ops/产品能力 |

#### 资料来源

- `Knowledgebase/Reference_Projects/AgentWeaver-Design/`
- `AgentWeaver_Memory_System_Design_v1.0.md`、`AgentWeaver_PRD_v2.0.md`

---

### 2.8 xiaomo-kit

**定位**：OpenClaw 中文 Starter 模板，预配置 SOUL/USER/IDENTITY 等。

**参照优先级**：**LOW**

#### 要点

- **灵魂三件套**：SOUL.md / USER.md / IDENTITY.md 模板
- **与 MAXshot**：FSD 07.2 已借鉴 OpenClaw Soul 结构；xiaomo-kit 为落地参考

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **SOUL/USER 模板结构** | P2 | 若需快速搭建新 Agent 工作区可参考 | 按需 |

#### 资料来源

- `Knowledgebase/Reference_Projects/xiaomo-kit/`
- GitHub: https://github.com/mengjian-github/xiaomo-starter-kit

---

### 2.9 FM-Agent

**定位**：百度开源，LLM 推理 + 大规模进化搜索，多智能体框架。

**参照优先级**：**LOW**

#### 架构要点

| 模块 | 说明 | MAXshot 对应 |
|------|------|--------------|
| **进化搜索** | Cold-Start 初始化、自适应采样、多岛并行 | Evolution Engine 归因/反思可参考 |
| **领域评估** | 多维度评估（正确性、效果、LLM 监督） | Capability 质量评估、Recommendation |
| **分布式基础设施** | Ray、异步评估 | 当前 MAXshot 无需 |

#### 借鉴清单

| 借鉴点 | 优先级 | 建议落地 | 状态 |
|--------|--------|----------|------|
| **多维度评估反馈** | P2 | Evolution 归因时可参考其评估信号设计 | 未来 |
| **Cold-Start 初始化** | P2 | 新 Capability 上线时的基线策略 | 按需 |

#### 规避清单

| 规避点 | 原因 |
|--------|------|
| **不采用进化搜索主循环** | FM-Agent 面向优化/调参；MAXshot 面向任务执行，架构不同 |

#### 资料来源

- `Knowledgebase/Reference_Projects/FM-Agent/`
- GitHub: https://github.com/baidubce/FM-Agent

---

## 三、按主题汇总：借鉴落地清单

### 3.1 并发与调度

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **Execution Queue** | OpenClaw Lane 隔离 | Router 按 user_id 串行，防上下文错乱 | P0 |
| **Switch 节点** | Project NOVA | Capability 路由用 Switch 替代 IF | P1 |

### 3.2 消息与输入

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **Steer 模式** | OpenClaw | Entry/Router 200–500ms 时间窗，新消息可修正 | P0 |
| **消息合并器** | OpenDeepWiki | 合并连续消息 | P1 |
| **Follow-up 识别** | Project NOVA | 适配 session_context | P2 |

### 3.3 容错与降级

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **3 级上下文守卫** | OpenClaw | 预检→压缩→降级重置 | P1 |
| **模型降级** | OpenClaw | Intent Analyzer fallback model | P1 |
| **AUTO_CONTEXT_COMPRESS** | OpenDeepWiki | 长对话编码压缩 | P2 |

### 3.4 可观测性

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **queue_wait_time** | OpenClaw | 记录排队时间 | P2 |
| **model_used / fallback_count** | OpenClaw | 记录模型与降级次数 | P2 |

### 3.5 可视化与 Admin OS

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **DAG 执行** | Langflow | Capability Chain 依赖排序 | P2 |
| **React Flow 拖拽** | Langflow | Admin OS 可视化编排 | P2 |

### 3.6 Text-to-SQL / data_fact_query

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **Text-to-SQL 管线** | Vanna | Schema + 示例 RAG → LLM 生成 SQL → 只读执行 | P0 |
| **RAG 文档结构** | Vanna | Mike 教材（DDL、数据字典、50 条 SQL）作为 RAG | P1 |

### 3.7 安全与权限

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **Tool-policy 式权限** | OpenClaw | 构建上下文前完成权限过滤；按 entry_channel/requester_role 白名单；默认不可信 | P1 |
| **Subagent 最小权限** | OpenClaw | 若引入子 Agent：默认 deny 敏感工具；明确边界与回退路径 | P2 |

### 3.8 记忆与上下文

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **压缩前 Memory Flush** | OpenClaw | 上下文逼近阈值时，先执行记忆写入再压缩；04.2 Memory 闭环实现 | P1 |
| **混合检索** | OpenClaw | 0.7×向量 + 0.3×BM25 可作参考配置 | P2 |
| **双层记忆职责** | OpenClaw | 日常日志 vs 长期精华，对应 Experience/Insight 提炼 | P2 |
| **按需检索不全量加载** | OpenClaw | Router 生成 memory_refs，Capability 按需拉取 | 已与 FSD 一致 |

### 3.9 成本与效能

| 主题 | 来源 | 建议 | 优先级 |
|------|------|------|--------|
| **思考分级** | OpenClaw | 按任务复杂度分级；等级预设 > 用户指定 > 自动判断；降档重试 | P2 |
| **冗余裁剪** | OpenClaw | 工具结果截断、cache-ttl 修剪，降低 token 成本 | P2 |

---

## 四、更新与维护约定

- **新增产品**：在 §一 增加一行，在 §二 增加对应章节；注明参照优先级与理由。
- **更新借鉴/规避**：根据架构迭代或新分析，增补 §二、§三。
- **优先级调整**：若某产品参照价值变化，更新 §一 与对应章节的优先级说明。
- **资料链接**：所有引用文档使用相对路径，确保可追溯。
- **MVP vs 未来拓展**：借鉴项中「本周期执行」与「非 MVP、未来引入」的划分，见 `MVP架构补全与未来拓展_复盘沉淀_2026-02.md`。

---

**文档版本**：v1.2  
**最后更新**：2026-02（纳入 OpenClaw 下篇「安全、记忆、成本、协作」及「全量记忆系统」两文借鉴条目；新增 §3.7 安全与权限、§3.8 记忆与上下文、§3.9 成本与效能）  
**维护者**：LEO (Product Manager)
