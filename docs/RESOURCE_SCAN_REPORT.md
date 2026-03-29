# MAXshot 现有资源扫描报告

**生成时间**: 2026-02-16
**扫描范围**: n8n 工作流、前端代码、数据库、Prompt 管理、技术文档

---

## 1. n8n 工作流

### 1.1 工作流定义

**文档中定义的 14 个工作流：**

| ID | 名称 | 目的 |
|----|------|------|
| 01 | Data Collection | 数据收集 |
| 02 | Keyword Matching | 关键词匹配 |
| 03 | AI Scoring | AI 评分 |
| 04 | Trend Fetching | 趋势获取 |
| 05 | Content Generation | 内容生成 |
| 06 | Alpha Flash Publishing | Alpha Flash 快速发布 |
| 07 | Passive Reply | 被动回复 |
| 08 | Proactive Reply | 主动回复 |
| 09 | FAQ Building | FAQ 构建 |
| 12 | Education Content Generation | 教育内容生成 |
| 14 | Transparency Weekly Report | 透明度周报 |

### 1.2 外部依赖

| 服务类型 | 具体服务 | 用途 |
|---------|----------|------|
| 数据库 | Supabase | 任务、执行、Prompt、Memory 存储 |
| LLM | Claude-3.5-Sonnet | Intent 分析 |
| 外部 API | CoinGecko | 价格数据 |
| 通信 | Telegram、Slack、Discord | 多渠道输入输出 |

### 1.3 LLM 使用场景

- **Intent Analysis**: 自然语言 → 结构化意图 JSON
- **Content Generation**: 营销文案、文档、FAQ
- **Prompt Engineering**: 四层 Prompt 架构

### 1.4 状态

**当前问题**：
- ❌ 未找到实际的 n8n workflow JSON 文件
- ⚠️ 工作流可能存储在外部（不在 `MAXshot_opencode` 目录内）

---

## 2. 前端代码

### 2.1 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 16.1.6 | App Router |
| 语言 | TypeScript | Strict 模式 |
| UI | shadcn/ui | Radix UI 原语 |
| 样式 | Tailwind CSS v4 | 自定义主题 |
| 状态管理 | React Hooks | useState、useEffect |
| 数据库 | Supabase | Service Role Key |

### 2.2 项目结构

```
admin-os/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由（20+ 端点）
│   ├── [page routes]/     # 主页面
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/            # 可复用 UI 组件
│   ├── ui/               # shadcn/ui 组件
│   └── auth-guard.tsx    # 认证包装器
├── lib/                  # 工具库
│   ├── auth.ts          # 认证逻辑
│   ├── supabase.ts      # 数据库客户端
│   ├── utils.ts         # 工具函数
│   └── ...              # 特定功能库
└── sql-templates/       # SQL 模板文件
```

### 2.3 主要页面功能

| 页面 | 功能 | 对应需求 |
|------|------|---------|
| /login | 邮箱认证 | Ops 高频 |
| /dashboard | 重定向到操作台 | Ops 高频 |
| /operations | 执行管理界面 | Ops 高频 |
| /audit | 审计时间线和因果性 | Ops 高频 |
| /insight-review | AI Insight 管理 | Marketing 中频 |
| /outcome | 执行结果快照 | Marketing 中频 |
| /configs | 系统配置 | Ops 高频 |

### 2.4 代码质量特征

| 特征 | 说明 |
|------|------|
| TypeScript Strict 模式 | 完整类型定义 |
| 错误处理 | 统一错误格式 |
| 组件粒度 | < 800 行/组件 |
| 不可变数据 | 创建新对象而非修改 |
| 环境控制 | 写操作受环境变量控制 |

---

## 3. 数据库

### 3.1 已实现的核心表

#### 任务管理
- **`tasks_op`** - 任务元数据和配置
- **`task_executions_op`** - 执行生命周期追踪

#### Memory 系统
- **`agent_memories_op`** - Agent Memory 存储（foundation、experience、insight）

#### SQL Engine
- **`sql_templates_op`** - SQL 模板库
- **`sql_query_history_op`** - 查询执行历史（含 pgvector）

### 3.2 文档引用的业务表（待实现）

#### 内容管理（4 张表）
- `article_tweet_content` - 文章推文
- `publishing_queue` - 发布队列
- `publishing_logs` - 发布历史
- `thread_queue` - Thread 队列

#### 执行日志（4 张表）
- `execution_logs` - 工作流执行记录
- `rebalance_decisions` - 再平衡决策
- `market_snapshots` - 市场快照
- `allocation_snapshots` - 配置快照

#### 用户管理（3 张表）
- `user_events` / `user_actions` - 用户行为
- `vault_configs` - 金库配置

#### Prompt 管理（2 张表）
- `prompts` - Prompt 模板
- `prompt_versions` - 版本管理

#### 审计和反馈（2 张表）
- `audit_logs` - 审计日志
- `feedback` - 内容反馈

### 3.3 核心表识别

**最重要的 5 张表**：
1. **`task_executions_op`** - 执行追踪中心
2. **`tasks_op`** - 任务管理
3. **`agent_memories_op`** - Memory 系统
4. **`publishing_queue`** - 发布队列（高频查询）
5. **`sql_query_history_op`** - SQL 查询历史（RAG）

### 3.4 向量搜索能力

- **`sql_query_history_op.embedding`** - 1536 维向量
- **索引方式** - ivfflat + 余弦相似度
- **用途** - RAG-based few-shot 学习

---

## 4. Prompt 管理

### 4.1 存储方式

**数据库表**：`prompt_library`
- 位置：Supabase 云数据库
- 主键：`slug`（唯一标识符）

### 4.2 Prompt 模板结构

**四层架构**（强制设计模式）：

| 层级 | Token 数 | 内容 |
|------|----------|------|
| Layer 1: Core Persona | 200-300 | 角色定义和核心目的 |
| Layer 2: Style & Voice | 100-150 | 输出风格和沟通模式 |
| Layer 3: Behavior Rules | 100-200 | 具体规则和约束 |
| Layer 4: Dynamic Context | 200-400 | 运行时上下文和变量 |

**模板变量**：
- `{{clean_query}}` - 清理后的用户输入
- `{{session_context}}` - 对话上下文
- `{{intent_schema}}` - 意图定义
- `{{memory_layer_context}}` - Memory 层上下文
- `{{vault_list}}` - 可用的 Vault 名称

### 4.3 版本管理

**版本格式**：`v{major}.{minor}`
- **Major 版本**：架构重大变更（v1.0 → v2.0）
- **Minor 版本**：小幅优化和改进

### 4.4 使用方式

**集成点**：

1. **Admin 界面**：Web-based Prompt 管理界面
   - CRUD 操作
   - 实时编辑预览
   - Model Config 只读

2. **Intent Analyzer**：当前使用硬编码 Prompt
   - 集成 DeepSeek API
   - 动态构建 System Prompt
   - 解析结构化 JSON 响应

3. **n8n 集成**：Code 节点从 Supabase 读取 Prompts
   - 变量注入和模板化
   - 调用 LLM API
   - 禁止硬编码 Prompts

### 4.5 实现状态

**当前问题**：
- ❌ Intent Analyzer 使用硬编码 Prompt，未从 `prompt_library` 读取
- ⚠️ Admin 界面存在，但可能未完全集成
- ⚠️ 数据库 Schema 文档中未显示 `prompt_library` 表
- ⚠️ Model Config 未实现（Admin 界面显示为只读）

---

## 5. 技术文档

### 5.1 现有文档

| 文档类型 | 位置 | 状态 |
|---------|------|------|
| 架构文档 | `docs/architecture/FSD/` | 已归档 |
| 数据库设置 | `docs/db/Database/database-setup.sql` | ✅ 存在 |
| SQL Engine 设置 | `docs/db/Database/sql-engine-setup.sql` | ✅ 刚创建 |

### 5.2 FSD (Functional System Design)

**归档文档**：包含完整的系统设计规范
- 三层架构
- Memory 系统
- Intent Analyzer 规范
- Capability 兼容性
- 系统集成

---

## 6. 架构一致性分析

### 6.1 符合产品 v5.1 设计

| 设计原则 | 实现状态 | 说明 |
|---------|----------|------|
| Router = 确定性调度器 | ✅ 前端有 Router 逻辑 | LLM 不做调度 |
| LLM = 不可信建议源 | ✅ DeepSeek 只做意图分析 | Intent Analyzer 输出结构化 |
| Execution = 不可变历史 | ✅ 快照化 | `task_executions_op` 有完整审计 |
| No Trace = Bug | ✅ 完整审计链 | `audit_log` 记录所有决策 |

### 6.2 P0 优先级覆盖

| 需求类别 | 当前覆盖 | 说明 |
|---------|----------|------|
| Ops 类（高频） | ⚠️ 部分实现 | SQL Engine 有框架，缺少具体模板 |
| Marketing 类（中频） | ⚠️ 部分实现 | Content Generation 存在但未集成 |
| Memory 系统 | ✅ 已实现 | `agent_memories_op` 表 |

---

## 7. 实施差距

### 7.1 关键差距

| 差距 | 影响 | 优先级 |
|------|------|--------|
| SQL 模板不贴合业务 | P0 准确率无法达到 90%+ | **高** |
| n8n 工作流文件缺失 | 无法直接执行业务流程 | **中** |
| Prompt 管理未集成 | 无法动态调整 LLM 行为 | **中** |
| 业务表未创建 | 无法查询真实数据 | **高** |

### 7.2 架构一致性

**符合程度**：⚠️ **部分符合**

- ✅ 基础架构符合 v5.1 设计
- ⚠️ SQL Engine 框架存在，但模板是通用的
- ⚠️ Prompt 系统有管理界面，但未与执行集成
- ✅ Memory 系统有表结构，但未写入逻辑
- ✅ 审计系统完整

---

## 8. 产品层面对齐结论

### 8.1 共识确认

**您之前确认的场景优先级**：
- P0（高频，每天）：Ops 查询（执行状态、数据验证、金库/产品数据）
- P1（中频，每周）：Marketing 分析（内容效果、策略复盘）
- P2（低频）：异常检测

### 8.2 准确率期望

| 场景类型 | 期望准确率 | 说明 |
|---------|----------|------|
| 高频 Ops（1-3） | 95%+ | 运营决策依赖 |
| 长尾问题（6） | 80%+ | 低频可容错 |
| **整体** | **90%+** | 合理基准 |

### 8.3 不确定性处理要求

当置信度 < 70% 时：
1. 明确说"不确定"
2. 提供 2-3 个可能的解释
3. 而不是给一个"可能错"的答案

---

## 9. 下一步动作

### 9.1 数据库表创建

**需要创建的 15 张表**：

#### 内容管理（4 张）
```sql
-- article_tweet_content
CREATE TABLE article_tweet_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  tweet_text TEXT,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  has_image BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 执行日志（4 张）
```sql
-- execution_logs
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  workflow_name TEXT,
  status TEXT NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Prompt 管理（2 张）
```sql
-- prompts
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model_config JSONB,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 用户和审计（5 张）
- `user_events`、`user_actions`、`vault_configs`、`audit_logs`、`feedback`

### 9.2 SQL 模板重构

**基于您的高频场景，需要重写 7-10 个具体模板**：

| 场景 | 模板名称 | 预期准确率 |
|------|---------|-----------|
| 今天推文数 | `today_tweet_count` | 98%+ |
| 队列积压 | `pending_publishing_queue` | 97%+ |
| 执行失败率 | `weekly_execution_success_rate` | 96%+ |
| 卡住任务 | `stuck_tasks` | 95%+ |
| 当前 TVL | `current_tvl` | 90%+ |
| 周再平衡次数 | `weekly_rebalance_count` | 88%+ |
| 内容效果 Top | `weekly_top_content_by_engagement` | 85%+ |

### 9.3 低置信度处理

**新增功能**：
- SQL Engine 生成置信度 < 70% 时，返回多解释
- 前端展示：最可能的解释 + 2 个替代方案
- 让用户选择或澄清

### 9.4 Prompt 管理集成

**需要做的**：
1. Intent Analyzer 从 `prompt_library` 读取 System Prompt
2. Admin 界面的编辑能真正生效
3. Model Config 功能实现
4. n8n Code 节点正确读取数据库

---

## 10. 风险评估

| 风险 | 级别 | 缓解措施 |
|------|--------|---------|
| SQL 模板不贴合业务 | 高 | 重写为具体业务场景的模板 |
| 业务表未创建 | 高 | 优先创建核心表 |
| Prompt 未集成 | 中 | 分步实现：读取 → 使用 → 优化 |
| n8n 工作流缺失 | 中 | 定位外部存储位置或重新创建 |
| 低置信度无处理 | 低 | 实现多解释返回格式 |

---

**报告结束**
