# MAXshot 产品架构设计 v5.2 (Harness OS)

> 创建日期: 2026-03-25  
> 维护者: Codex / Alex 共同留档  
> 状态: Active（当前执行版）  
> 版本: v5.2  
> 上一执行版: `MAXshot_产品架构设计_v5.1_Small_Team_Growth_OS.md`

---

## 1. 文档定位

v5.2 不是推翻 v5.1 的产品方向，而是把 v5.1 从“功能版”收紧为“harness 版”。

v5.1 回答了：
- 我们做什么产品
- 主要入口是什么
- Ops / Marketing 两条主线怎么分工

v5.2 重点回答：
- 为什么系统仍会产生“看起来合理但其实不对”的回答
- 如何用 harness 而不是继续堆 prompt / capability 来解决这个问题
- 后续开发的主线为什么应从“扩能力”改为“硬化运行环境”

一句话定义：

- `MAXshot v5.2 = Small Team Growth OS + Harness-first runtime`

---

## 2. v5.1 -> v5.2 的核心变化

| 维度 | v5.1 | v5.2 |
|---|---|---|
| 执行重点 | 功能可用、双主线成型 | Harness 硬化、结果可信、对话稳定 |
| 主问题 | 能力不足 | 错能力执行、会话串场、结果无独立质检 |
| LLM 角色 | 主要在 intent / SQL 生成 / 文案 | 主要在 match / relation / critic；不碰确定性边界 |
| Router | 确定性调度器 | 保持不变，但要消费更严格 artifact |
| Context | 有会话壳与澄清壳 | 升级为正式 Session Harness |
| SQL / Data Query | 澄清后执行 | 必须先形成 Query Contract 再执行 |
| 验收 | 端到端跑通 | 端到端跑通 + 中间每步 artifact 可解释 |

---

## 3. v5.2 的核心判断

当前系统的主要瓶颈不是模型能力，而是 harness 成熟度。

典型症状：
- 新问题被旧澄清吞掉
- capability 命中看起来合理，但其实答的是另一类问题
- capability 返回了结果，但结果并不真正回答用户的问题
- 数据源选择、freshness 选择、失败语义不稳定
- Web / TG 渠道可用，但多轮体验不一致

因此 v5.2 的架构优先级调整为：

1. Session Harness
2. Intent Harness
3. Artifact Contract
4. Result Critic
5. Canonical Source Contract
6. 然后才是 Capability 扩展

---

## 4. v5.2 目标形态

### 4.1 系统公式

- `Agent = Model + Harness`

### 4.2 Harness 的组成

MAXshot 的 Harness 由以下部分组成：

1. Entry normalization
2. Session / conversation manager
3. Capability registry runtime
4. Intent matcher
5. Deterministic gate
6. Deterministic router
7. Capability executor
8. Result critic
9. Trace / audit / replay
10. Release verification harness

### 4.3 设计原则

1. Router = deterministic scheduler
2. LLM-first for semantics：用户意图、对话关系、澄清策略、语义质检由 LLM 主判断
3. Harness-enforced for reliability：能力面、artifact、数据源、回滚、审计由 harness 约束
4. Code is the enforcement layer, not the semantic brain：代码负责执行约束，不负责替代 LLM 做用户语义理解
5. Capability 只执行，不决定系统主流程
6. 任何可见回答都必须可追溯到 source contract
7. 任何多轮上下文继承都必须经过明确 relation classification

---

## 5. v5.2 主流程（9 步保留，但定义收紧）

| Step | 名称 | v5.2 定义 |
|---|---|---|
| 1 | Entry | 只做标准化输入封装，不做业务判断 |
| 2 | Context Load | 由 Session Harness 输出 `ContextPacket` |
| 3 | Intent 识别 | registry-first capability match + slot extraction + relation-aware clarification |
| 4 | Gate | 只做边界、完整性、权限与确认，不重做意图识别 |
| 5 | Sealer | 形成不可变 task/execution 输入 |
| 6 | Router | 基于 sealed artifact 确定性绑定 capability |
| 7 | Capability 执行 | 只能根据 `CapabilityBinding + Query Contract` 执行 |
| 8 | Trace + Audit | 所有关键工件留痕并可 replay |
| 9 | 回传 | 必须经过 CriticDecision 才能给用户 |

v5.2 的关键变化不在“多一步”，而在：
- 每一步都要有硬 artifact
- Step 7 和 Step 9 之间新增一个逻辑必经层：`CriticDecision`

---

## 6. 四个核心新增对象

### 6.1 Session Harness

职责：
- 判断用户这句话与前文是什么关系
- 决定是否继承上下文
- 决定是否继续澄清、纠偏、切题、回溯历史

必须显式输出的 relation taxonomy：
- `new_session`
- `new_topic_same_window`
- `continuation`
- `clarification_reply`
- `correction`
- `history_callback`

原则：
- LLM 主判断 turn relation、是否追问、是否纠偏、是否切题
- Code 只负责 TTL、继承边界、最大澄清轮次、policy enforcement
- 不允许用正则枚举/硬编码分支替代多轮语义判断

### 6.2 Intent Harness

职责：
- 从 active capability surface 中做 capability match
- 提取 slots
- 给出 need_clarification / out_of_scope / unknown

原则：
- LLM 主判断 capability match、slot extraction、clarification target、unknown/out_of_scope
- active registry 是唯一可执行能力面
- Code 只负责 registry 白名单、schema 校验、最大候选数、兼容字段留痕
- canonical intent 只可作为兼容字段，不再反向主导路由

### 6.3 Query Contract

对 `data_fact_query`，执行前必须先形成 `Query Contract`。

必须明确：
- entity
- metric
- aggregation
- time_range
- filters
- source_contract
- clarification completeness

原则：
- 没有 contract，不执行数据查询
- contract 不完整，先澄清
- source contract 不成立，返回准确失败语义

### 6.4 CriticDecision

职责：
- 拦截“技术上有输出，但语义上答错”的结果

最低检查项：
- capability 是否和 query 类型一致
- 结果是否真正回答用户问题
- clarification 是否合理
- 失败文案是否和真实失败原因一致
- evidence/source 是否与回答类型匹配

原则：
- Critic 不替代 Router
- Critic 的语义判断由 LLM 主导
- Code 只负责 critic contract 执行、必填项检查与阻断放行
- Critic 只负责放行 / 打回 / 要求重试 / 要求再澄清

---

## 7. v5.2 Capability 边界

### 7.1 当前 active capability

1. `capability.data_fact_query`
2. `capability.product_doc_qna`
3. `capability.content_generator`
4. `capability.context_assembler`

### 7.2 v5.2 对 capability 的要求

Capability 必须：
- 只消费输入 contract，不自己决定主流程
- 不直接承担 conversation management
- 不直接承担 router authority
- 不直接承担 final answer authority

Capability 不必：
- 负责 session 管理
- 负责多轮澄清策略本身
- 负责决定是否允许 side effect

因此，v5.2 明确承认：
- capability 很重要
- 但 capability 不是系统稳定性的主来源
- 系统稳定性主要来自 harness

---

## 8. Canonical Source Discipline

v5.2 新要求：

每个高频查询类型都必须定义 canonical source rule。

最少包含：
- source object
- freshness key
- completeness rule
- allowed fallback
- rejection rule

示例：
- `execution_detail.latest`
  - source: `executions`
  - freshness: `updated_at desc`, fallback `created_at desc`
  - completeness: `id/status` required
  - if row incomplete: answer must mark source incomplete rather than pretending detail is complete

这是 harness 规则，不是 prompt 规则。

---

## 8.5 LLM 与 Code 的正式分工

v5.2 后续开发的唯一标准如下：

### LLM 主导的部分

- 用户意图理解
- 对话关系判断
- 澄清问题生成
- slot 提取与语义补全判断
- capability 结果是否答对题的语义质检
- 用户可见话术生成

### Harness / Code 主导的部分

- active capability surface 限定
- artifact contract 校验
- 数据源白名单与 source contract 执行
- side-effect 权限与 gate
- trace / audit / replay
- fail-fast / rollback / release verification

### 明确禁止

- 用正则枚举、关键词 if-else、硬编码问法表来替代 Step 2/3 的主语义判断
- 让 Capability 自己决定系统主流程
- 让 Code 冒充意图理解器或对话管理器

一句话：

- LLM 负责“理解和判断”
- Harness 负责“约束和证明”
- Code 负责“执行这些约束”

---

## 9. 入口形态调整

v5.2 保留 v5.1 的多入口产品定义，但更强调：

### Telegram
- 主对话入口
- 优先承载真实多轮测试
- Session Harness 必须首先服务 TG

### Web / Admin OS
- 继续承担配置、调试、审计与验证
- 用户对话 UX 要逐步向真实对话形态收敛，不再停留在 MVP 卡片拼装

### Notion
- 暂不作为 v5.2 主推进对象
- 保持在产品编排视野中，但不占当前 harness 优先级

---

## 10. 版本优先级（v5.2）

### Phase A - Harness Hardening

1. Step 2 Session Harness 正式化
2. Step 3 Intent Harness 正式化
3. `Query Contract` 落地
4. `CriticDecision` 落地
5. top business query canonical source rules 落地

### Phase B - Hot Path Tightening

1. 减少 legacy compatibility branches
2. 让 Gate / Sealer / Router 只消费严格 artifact
3. Return path 强制依赖 critic pass/fail

### Phase C - Capability Expansion

1. 强化 `product_doc_qna` 真文档路径
2. 深化 `content_generator`
3. 再考虑 `publisher` 激活

---

## 11. 与旧版本关系

- `v5.0`：愿景冻结版，不动
- `v5.1`：功能执行版，保留作为历史基线
- `v5.2`：当前架构执行版，强调 harness-first
- `v6.0`：未来 control plane / memory runtime 完整版

---

## 12. 最终结论

v5.2 的核心不是“更聪明”，而是：

- 更少隐式状态
- 更强中间工件
- 更清楚的 source contract
- 更稳定的多轮会话
- 更严格的结果质检

一句话总结：

- `MAXshot v5.2 = Small Team Growth OS, hardened by Harness.`
