# MAXshot v5.1 差距分析报告

**分析时间**: 2026-02-16
**目的**: 产品文档要求 vs 现有实现对比

---

## 1. 产品文档要求（v5.1）

### 1.1 宪法级架构约束

| 约束 | 含义 | 优先级 |
|------|------|--------|
| Router = 确定性调度器 | LLM 只做建议，Router 代码驱动 | P0 |
| LLM = 不可信建议源 | Intent Analyzer 输出结构化数据 | P0 |
| Execution = 不可变历史 | 执行开始时快照冻结 | P0 |
| No Trace = Bug | 所有决策可审计、可回放 | P0 |

### 1.2 三入口架构

| 入口 | 用途 | 状态 |
|------|------|------|
| Telegram Bot | 自然语言对话 | ❌ 未实现 |
| Admin OS | 配置/调试面板 | ✅ 已实现 |
| Notion | 结构化内容管理 | ❌ 未实现 |

### 1.3 核心能力（v0）

| 能力 | 说明 | 状态 |
|------|------|------|
| capability.router | 核心编排 | ✅ 已实现 |
| capability.data_fact_query | 数据事实 + SQL Engine 3-tier | ⚠️ 部分实现 |
| capability.product_doc_qna | 产品知识 Q&A | ⚠️ Stub |
| capability.context_assembler | 上下文组装 | ❌ Stub |
| capability.content_generator | 内容生成（探索/生产模式） | ⚠️ Stub |
| capability.publisher | 发布 + 确认 | ❌ Stub |

### 1.4 SQL Engine 3-tier 策略

| Tier | 说明 | 准确率目标 | 状态 |
|------|------|-----------|------|
| Tier 1: Templates | 参数化 SQL，高频查询 | 95%+ | ⚠️ 模板已创建但不贴合业务 |
| Tier 2: LLM 生成 | LLM + Schema 注入，长尾查询 | 85%+ | ⚠️ RAG 框架已创建，但未测试 |
| Tier 3: 沉淀 | 成功查询 → Tier 1 模板 | 自动化 | ⚠️ Deposition Engine 已创建但未集成 |

### 1.5 Memory 系统

| 层级 | 说明 | 状态 |
|------|------|------|
| Foundation | 业务公理、硬规则（weight 1.0） | ✅ 表已创建，有初始数据 |
| Experience | 成功/失败路径量化（动态权重） | ⚠️ 表已创建，但未写入逻辑 |
| Insight | 高维模式自反思 | ❌ 未实现 |

---

## 2. 已实现的能力

### 2.1 Router 层（✅ 完整）

**文件**: `server-actions/router/router-main.ts`
- ✅ 执行编排
- ✅ Intent → Capability 映射
- ✅ 审计日志
- ✅ 错误处理

### 2.2 Intent Analyzer（✅ 完整）

**文件**: `server-actions/intent-analyzer/deepseek-client.ts`
- ✅ DeepSeek API 集成
- ✅ 结构化 JSON 输出
- ✅ Session 管理

### 2.3 Capability 框架（✅ 完整）

**文件**: `server-actions/capabilities/index.ts`
- ✅ 模块化注册机制
- ✅ 统一接口定义
- ✅ 6 个 capability stub

### 2.4 Admin OS 界面（✅ 核心功能）

**已实现页面**:
- ✅ `/login` - 邮箱认证
- ✅ `/dashboard` - 操作台
- ✅ `/operations` - 执行管理
- ✅ `/audit` - 审计时间线
- ✅ `/insight-review` - Insight 管理
- ✅ `/outcome` - 执行结果快照
- ✅ `/configs` - 系统配置

### 2.5 数据库（⚠️ 部分实现）

**已创建表** (5 张):
- ✅ `tasks_op` - 任务管理
- ✅ `task_executions_op` - 执行追踪
- ✅ `agent_memories_op` - Memory 系统
- ✅ `sql_templates_op` - SQL 模板（新创建）
- ✅ `sql_query_history_op` - SQL 查询历史（新创建）

**待创建表** (15 张):
- ❌ `article_tweet_content` - 文章推文
- ❌ `publishing_queue` - 发布队列
- ❌ `thread_queue` - Thread 队列
- ❌ `execution_logs` - 工作流执行记录
- ❌ `rebalance_decisions` - 再平衡决策
- ❌ `market_snapshots` - 市场快照
- ❌ `allocation_snapshots` - 配置快照
- ❌ `user_events` - 用户事件
- ❌ `user_actions` - 用户行为
- ❌ `vault_configs` - 金库配置
- ❌ `prompts` - Prompt 模板（新创建）
- ❌ `prompt_versions` - 版本管理
- ❌ `audit_logs` - 审计日志
- ❌ `feedback` - 内容反馈

### 2.6 SQL Engine（⚠️ 框架已创建，模板不贴合）

**已创建文件**:
- ✅ `sql-template-engine.ts` - Tier 1 模板引擎
- ✅ `sql-generation-engine.ts` - Tier 2 LLM 生成 + RAG
- ✅ `sql-deposition-engine.ts` - Tier 3 沉淀引擎
- ✅ 8 个通用 SQL 模板

**问题**: 模板是通用的 `{{table_name}}`，不是针对具体业务表
- 应该是：`FROM article_tweet_content WHERE ...`
- 实际是：`FROM {{table_name}} WHERE ...`

### 2.7 Prompt 管理（⚠️ 部分实现）

**数据库**: `prompts` 表已创建
- ✅ 四层架构支持（schema）
- ❌ Intent Analyzer 未使用数据库 Prompt
- ❌ Admin 界面存在但未完全集成

---

## 3. 缺失的能力

### 3.1 P0 优先级缺失（阻塞 MVP-3）

| 缺失能力 | 影响 | 阻塞问题 |
|---------|------|---------|
| ❌ 15 张核心业务表未创建 | 无法查询真实数据 | SQL 模板无法执行 |
| ❌ SQL 模板不贴合具体业务 | 90%+ 准确率无法达到 | 运营决策依赖错误数据 |
| ❌ Telegram Bot 入口 | 用户无法自然语言查询 | 只能用 Admin OS |
| ❌ Notion 集成 | 无法结构化内容管理 | 营销闭环缺失 |
| ❌ n8n 工作流 JSON 文件 | 无法直接执行业务流程 | 手动触发或需外部调用 |

### 3.2 P1 优先级缺失（阻塞 MVP-4）

| 缺失能力 | 影响 |
|---------|------|
| ❌ Content Generator 实现 | 无法生成营销内容 |
| ❌ Publisher 实现 | 无法发布内容 |
| ❌ 内容效果分析 SQL | 无法分析互动率 |
| ❌ Attribution 数据存储 | 无法追踪归因 |
| ❌ Insight Layer 写入逻辑 | Memory 系统不完整 |

### 3.3 长期能力缺失

| 缺失能力 | 影响 |
|---------|------|
| ❌ Context Assembler | 无法组装上下文 |
| ❌ Product Doc Q&A (RAG) | 无法查询产品文档 |
| ❌ Insight 层实现 | 无法自反思学习 |

---

## 4. 不符合产品文档原则的实现

### 4.1 违宪实现

| 违宪项 | 违宪文件 | 严重程度 |
|---------|---------|---------|
| ❌ Intent Analyzer 用硬编码 Prompt | "LLM = 不可信建议源" | 高 |
  - 应该从 `prompts` 表读取 | 不应该是硬编码字符串 | |
| ❌ SQL 模板是通用占位符 | "Execution = 不可变历史" | 高 |
  - 应该是硬编码表名 | 不可变历史应基于真实表 | |
| ❌ 低置信度无多解释 | "可信化"原则 | 中 |
  - 当前只返回一个答案 | 应该返回 2-3 个可能解释 | |

### 4.2 架构偏离

| 偏离项 | 说明 | 影响 |
|---------|------|------|
| ⚠️ Admin OS 有登录页面 | 三入口应该是 TG + Admin OS + Notion | TG Bot 未实现，Admin OS 需登录 |
| ⚠️ Prompt 管理有 Admin 界面 | 但未与执行系统集成 | 用户体验割裂 |

---

## 5. 差距优先级总结

### P0（阻塞 MVP-3，必须立即解决）

1. **创建 15 张核心业务表**
   - 优先级: 最高
   - 影响: SQL 模板无法执行
   - 工作量: 1-2 天

2. **重写 7-10 个 SQL 模板为具体业务表**
   - 优先级: 最高
   - 影响: 准确率无法达到 90%+
   - 工作量: 1 天

3. **修复 Intent Analyzer 使用硬编码 Prompt**
   - 优先级: 高
   - 影响: 违宪，无法动态调整
   - 工作量: 0.5 天

### P1（阻塞 MVP-4，需要解决）

4. **实现低置信度多解释**
   - 优先级: 高
   - 影响: 不符合"可信化"原则
   - 工作量: 0.5 天

5. **创建 Content Generator 能力**
   - 优先级: 中
   - 影响: 无法生成营销内容
   - 工作量: 3-5 天

6. **创建 Publisher 能力**
   - 优先级: 中
   - 影响: 无法发布内容
   - 工作量: 2-3 天

7. **实现 Marketing 归因 SQL 模板**
   - 优先级: 中
   - 影响: 无法分析内容效果
   - 工作量: 1-2 天

### P2（长期优化）

8. **实现 Telegram Bot 入口**
9. **集成 Notion**
10. **实现 Product Doc Q&A (RAG)**
11. **实现 Context Assembler**
12. **实现 Insight Layer**

---

## 6. 产品层面对齐问题

### Q1: 15 张业务表，是分批创建还是一次性创建所有表？

**考虑因素**:
- 一次性创建：Schema 验证快，但失败影响大
- 分批创建：风险可控，但需要更多测试时间

### Q2: SQL 模板重写，是先测试现有的 8 个模板，还是直接重写？

**当前情况**:
- 有 8 个通用模板已经写入数据库
- 需要改为具体业务表
- 可以先测试通用模板能否work，再决定重写范围

### Q3: Intent Analyzer 改造，是从数据库读取 Prompt 的所有版本，还是只读 active 版本？

**考虑因素**:
- 读取所有版本：支持 A/B 测试，回滚方便
- 只读 active 版本：简单直接，但灵活性低

### Q4: n8n 工作流 JSON 文件未找到，是：

选项：
- A. 存储在外部目录（不在 MAXshot_opencode 内）
- B. 通过 n8n 平台直接管理，不存储在代码库
- C. 还未创建，需要从零开始

---

## 7. 结论

### 7.1 整体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构符合度 | ⚠️ 70% | Router 和 Intent Analyzer 符合，但其他能力不完整 |
| 功能完整度 | ⚠️ 60% | 核心框架有，但业务能力大量缺失 |
| 代码质量 | ✅ 90% | TypeScript Strict，错误处理好 |
| 文档完整度 | ⚠️ 75% | 架构文档全，但实施文档缺失 |

### 7.2 MVP-3 完成度评估

**MVP-3 目标**: 真实数据库查询，90%+ 准确率

| 子目标 | 完成度 | 阻塞项 |
|-------|--------|---------|
| 数据库表创建 | 25% | 15 张表未创建 |
| SQL 模板 | 30% | 模板是通用的，不贴合业务 |
| LLM 生成 | 80% | 框架已创建，未测试 |
| 沉淀机制 | 70% | Engine 已创建，未集成 |
| 准确率验证 | 0% | 无法验证（表未创建） |

**预计完成时间**: 当前基础上还需 **2-3 周**

### 7.3 MVP-4 完成度评估

**MVP-4 目标**: 营销策略闭环（内容生成 + 归因）

| 子目标 | 完成度 | 说明 |
|-------|--------|------|
| Content Generator | 10% | 仅 Stub |
| Publisher | 10% | 仅 Stub |
| 归因分析 | 0% | 未开始 |
| Attribution 存储 | 0% | 表未创建 |

**预计完成时间**: 需 **4-6 周**

---

**报告结束**
