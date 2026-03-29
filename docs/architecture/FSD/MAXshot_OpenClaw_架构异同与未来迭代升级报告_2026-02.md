# MAXshot × OpenClaw 架构异同与未来迭代升级报告（面向运营展示版｜可溯源）

> **目的**：让运营同学快速理解 MAXshot 与 OpenClaw 的差异、我们为什么这样设计、未来怎么升级；并且每个升级点都能回溯「参考了哪个项目/资料」。  
> **日期**：2026-02  
> **维护者**：LEO (Product Manager)

---

## 1. 一句话总览

- **OpenClaw**：偏个人生产力 Agent，工程上强调「能干活」与生产级补强（安全/记忆/成本/协作）。
- **MAXshot**：偏业务型 Autonomous Operator，强调「可控可审计可复盘」，坚持 **Router 确定性调度**，LLM 只做不可信建议/生成类能力，避免未来「架构演变式重做」。

---

## 2. 架构异同（运营能听懂版）

### 2.1 调度哲学：谁来决定「怎么做」

| 维度 | OpenClaw | MAXshot |
|---|---|---|
| 调度核心 | Gateway/Agent Loop 更强，LLM 更深度参与流程 | **Router = 确定性调度器（代码/规则）**；LLM 仅做不可信建议/生成 |
| 推理范式 | 常见 ReAct/Agent Loop | **不用 ReAct**；优先审计可追溯、成本可控、合规可解释 |
| MVP 定位 | 可逐步工程化 | **MVP = 最小完整架构（麻雀虽小五脏俱全）**；迭代不触发架构演变 |

---

### 2.2 安全与权限：如何「管住手脚」

| 维度 | OpenClaw | MAXshot |
|---|---|---|
| 工具权限 | **Tool-policy（ACL）**：构建上下文时移除未授权工具句柄 | Entry Gate / Grey Area / Policy；未来可补 **Tool-policy 式白名单**（按 entry_channel/requester_role） |
| 子 Agent 安全 | Subagent 默认 deny 敏感工具 + 二次拦截 | 当前不引入 Subagent；若未来引入按「最小权限 + 明确边界 + 回退路径」 |

---

### 2.3 记忆系统：如何「长期记住且可解释」

| 维度 | OpenClaw | MAXshot |
|---|---|---|
| 记忆形态 | Markdown 双层：`memory/YYYY-MM-DD.md`（日志）+ `MEMORY.md`（精华） | 结构化记忆：Foundation / Experience / Insight；Router 输出 `memory_refs`（已留位） |
| 检索方式 | 向量 + BM25 混合（例：0.7/0.3） | 当前以向量为主；Phase 2 可引入 BM25 |
| 关键策略 | **压缩前 Memory Flush**：临界阈值先写记忆再压缩 | 可作为 Memory 闭环落地细节吸收 |

---

### 2.4 成本与效能：如何「跑得起、跑得稳」

| 维度 | OpenClaw | MAXshot |
|---|---|---|
| 推理分级 | 6 级思考等级；不支持则自动降档重试 | Intent 已有 fallback；可扩展为「任务复杂度→等级策略」+ 降档重试 |
| 上下文治理 | 压缩、裁剪、缓存 TTL 策略 | 可补「上下文守卫/裁剪策略」作为 Phase 2 增强 |

---

## 3. 我们「借鉴但不照搬」的原则（对运营讲法）

- **借鉴机制**：安全（Tool-policy）、记忆（Flush/混合检索）、成本（分级/降档）、协作（异步/边界）。
- **不照搬运行时形态**：OpenClaw 的 Gateway/Agent Loop/LLM 自主调度不引入 MAXshot；MAXshot 坚持 Router 确定性与审计优先。

---

## 4. 未来迭代升级路线（每条可溯源）

> 说明：下表的「溯源」让你能直接展示：我们每条升级是参考了哪个项目/哪份资料；若要深挖再回到原文/源码即可。

### 4.1 Phase 1.5 / Phase 2（优先补强，收益直接）

| 升级项 | 价值（运营视角） | 我们怎么做（不改架构） | 溯源：借鉴项目 | 溯源：资料路径 |
|---|---|---|---|---|
| Tool-policy 式权限控制 | 更安全：不同入口/角色权限不同 | 在构建上下文/执行清单前做白名单过滤（entry_channel/requester_role），未授权能力不进入上下文 | OpenClaw | `Knowledgebase/techdoc/OpenClaw生产级Agent系统深度拆解（下）：安全、记忆、成本与协作机制-2026年02月10日-来自【Get 笔记】.pdf` |
| Execution Queue / Lane 隔离 | 更稳：避免并发导致「上下文串台」 | Router 按 user/session 串行执行；排队与超时可观测 | OpenClaw | `Knowledgebase/techdoc/OpenClaw Agent任务引擎深度解析（上篇）：从架构到工程实践-2026年02月09日-来自【Get 笔记】.pdf` |
| Steer（消息修正时间窗） | 体验更好：说错一句可快速修正 | Entry/Router 增加 200–500ms 时间窗，未入 Capability 前允许修正/合并 | OpenClaw | `Knowledgebase/techdoc/OpenClaw Agent任务引擎深度解析（上篇）：从架构到工程实践-2026年02月09日-来自【Get 笔记】.pdf` |
| 压缩前 Memory Flush | 记忆更可靠：关键结论不丢 | 上下文逼近阈值时先写 Experience/Insight，再压缩 | OpenClaw | `Knowledgebase/techdoc/OpenClaw全量记忆系统深度解析：agent持久化记忆的实现框架与技术细节-2026年02月10日-来自【Get 笔记】.pdf` |
| 混合检索（向量+BM25） | 问答更准：抽象/关键词都能命中 | 语义检索 + BM25 加权融合（参考 0.7/0.3） | OpenClaw | `Knowledgebase/techdoc/OpenClaw全量记忆系统深度解析：agent持久化记忆的实现框架与技术细节-2026年02月10日-来自【Get 笔记】.pdf` |
| 记忆提炼流程（日志→精华） | 运营可读：可解释、可追溯 | Experience（过程）→ Insight（提炼）沉淀路径固化（写入规则、触发时机） | OpenClaw / AgentWeaver-Design | `Knowledgebase/techdoc/OpenClaw全量记忆系统深度解析：agent持久化记忆的实现框架与技术细节-2026年02月10日-来自【Get 笔记】.pdf`；`Knowledgebase/Reference_Projects/AgentWeaver-Design/` |
| Text-to-SQL（data_fact_query 完整化） | Ops 主链路更强：真实查库与可解释结论 | Schema+示例 RAG → 生成 SQL → 只读执行 → 审计留痕 | Vanna | `Knowledgebase/Reference_Projects/Database/vanna/` |
| 消息合并器（碎片合并） | 对话体验更顺：减少碎片化 | Entry 层连续消息聚合（可与 Steer 协同） | OpenDeepWiki | `Knowledgebase/techdoc/OpenDeepWiki v2.0.0 预览版发布：架构重构与功能革新-2026年02月09日-来自【Get 笔记】.pdf` |

---

### 4.2 Phase 2+（增强项，非 MVP 必需）

| 升级项 | 价值 | 做法 | 溯源：借鉴项目 | 溯源：资料路径 |
|---|---|---|---|---|
| 3 级上下文守卫（预检→压缩→降级重置） | 长对话可持续运行 | 上下文超限前防线体系化 | OpenClaw | `Knowledgebase/techdoc/OpenClaw Agent任务引擎深度解析（上篇）：从架构到工程实践-2026年02月09日-来自【Get 笔记】.pdf` |
| 思考分级 + 降档重试 | 成本更可控、稳定性更好 | 系统预设 > 用户指定 > 自动判断；不支持则降档重试 | OpenClaw | `Knowledgebase/techdoc/OpenClaw生产级Agent系统深度拆解（下）：安全、记忆、成本与协作机制-2026年02月10日-来自【Get 笔记】.pdf` |
| Subagent 最小权限框架（若引入） | 复杂任务可并行且安全 | 默认 deny 敏感能力、明确边界与回退 | OpenClaw | `Knowledgebase/techdoc/OpenClaw生产级Agent系统深度拆解（下）：安全、记忆、成本与协作机制-2026年02月10日-来自【Get 笔记】.pdf` |
| 分层记忆结构（Category/Item/Resource） | 记忆更结构化、可治理 | 作为 Memory Rationale/索引结构参考，不引入其运行时 | MemU | `https://github.com/NevaMind-AI/MemU` |
| DAG 可视化 / Admin OS 编排 | 更易运营：可视化编排与调试 | Admin OS 引入 DAG/拖拽编排（在 Contract 成熟后） | Langflow | `Knowledgebase/Reference_Projects/Langflow/` |

---

## 5. 记忆方向：我们是否「有计划/有吸收」？（展示重点段落）

### 5.1 已吸收（原则层面）

- **记忆类型分层**：Foundation / Experience / Insight  
  - **溯源**：AgentWeaver-Design（分层记忆）+ OpenClaw（日志/精华职责划分）

### 5.2 已进入迭代清单（机制层面）

- **压缩前 Memory Flush**（P1）：临界阈值先写再压缩  
  - **溯源**：OpenClaw 全量记忆系统
- **混合检索（向量+BM25）**（P2）：0.7/0.3 加权参考  
  - **溯源**：OpenClaw 全量记忆系统
- **分层记忆结构参考（Category/Item/Resource）**（P1）：用于 Memory Rationale 的结构化索引参考  
  - **溯源**：MemU（不引入运行时）

---

## 6. 附：报告引用来源（可回溯）

- `Knowledgebase/techdoc/OpenClaw Agent任务引擎深度解析（上篇）：从架构到工程实践-2026年02月09日-来自【Get 笔记】.pdf`
- `Knowledgebase/techdoc/OpenClaw生产级Agent系统深度拆解（下）：安全、记忆、成本与协作机制-2026年02月10日-来自【Get 笔记】.pdf`
- `Knowledgebase/techdoc/OpenClaw全量记忆系统深度解析：agent持久化记忆的实现框架与技术细节-2026年02月10日-来自【Get 笔记】.pdf`
- `Knowledgebase/techdoc/OpenDeepWiki v2.0.0 预览版发布：架构重构与功能革新-2026年02月09日-来自【Get 笔记】.pdf`
- `Knowledgebase/Reference_Projects/Project_NOVA/`
- `Knowledgebase/Reference_Projects/Database/vanna/`
- `Knowledgebase/Reference_Projects/Langflow/`
- `Knowledgebase/Reference_Projects/AgentWeaver-Design/`
- `https://github.com/NevaMind-AI/MemU`

---

**文档位置**：`LEO_ProductManager/4.Working/MAXshot_OpenClaw_架构异同与未来迭代升级报告_2026-02.md`
