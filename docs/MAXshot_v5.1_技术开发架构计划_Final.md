 orders WHERE created_at > NOW() - INTERVAL '7 days'",
  "tier": "tier_1",
  "template_id": "tpl_sales_range",
  "execution_time_ms": 45,
  "row_count": 1,
  "result": {"total_sales": 125680.00},
  "confidence": 1.0,
  "audit_trail": {
    "timestamp": "2026-02-15T10:30:00Z",
    "user_id": "u_001",
    "explanation": "使用模板 tpl_sales_range，参数: days=7"
  }
}
```

### 3.3 Marketing Module

**策略闭环设计**:

```
内容创作 → 发布 → 数据收集 → 归因分析 → 策略调整 → 内容创作
   ↑                                              │
   └──────────────── 循环迭代 ────────────────────┘
```

**核心组件**:

| 组件 | 职责 | 输出 |
|------|------|------|
| **Tagging System** | 内容标签管理 | 标签体系、自动打标 |
| **Attribution Engine** | 效果归因分析 | 转化路径、贡献度 |
| **Cycle Report** | 周期复盘报告 | 洞察、建议、行动项 |

**标签体系**:

```yaml
tags:
  content_type:
    - 长文
    - 短推
    - 图片
    - 视频
  topic:
    - 产品功能
    - 行业洞察
    - 用户故事
    - 活动推广
  tone:
    - 专业
    - 亲切
    - 幽默
    - 激励
  target_audience:
    - 新用户
    - 活跃用户
    - 沉睡用户
```

### 3.4 Memory Layer

**三层记忆架构**:

```
┌─────────────────────────────────────────────────────────────┐
│                  Foundation Memory                           │
│  静态配置：Schema、Business Rules、Capability Registry       │
│  存储：Supabase (持久化)                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Experience Memory                           │
│  执行历史：Query Logs、Task Results、User Feedback           │
│  存储：Supabase + Redis (热数据)                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Strategy Artifacts                          │
│  策略产物：Learned Patterns、Optimized Templates、Insights   │
│  存储：Supabase (版本化管理)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Evolution Engine

**设计原则**: 运行时不学习，所有策略变更离线审核

```python
class EvolutionEngine:
    """策略迭代引擎"""

    async def analyze_patterns(self) -> EvolutionReport:
        """离线分析执行模式，生成优化建议"""
        patterns = await self.extract_patterns()
        recommendations = await self.generate_recommendations(patterns)

        # 写入审核队列，不自动执行
        await self.queue_for_review(recommendations)

        return EvolutionReport(
            patterns=patterns,
            recommendations=recommendations,
            status="pending_review"
        )
```

**策略变更流程**:

```
数据分析 → 生成建议 → 人工审核 → 审批通过 → 版本发布
              ↓
         Audit Log (完整追溯)
```

---

## 4. 数据库设计

### 4.1 核心表结构

```sql
-- ============================================
-- 实例管理 (v6.0兼容)
-- ============================================

CREATE TABLE instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SQL Engine 三级策略
-- ============================================

-- Tier 1: SQL模板库
CREATE TABLE sql_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sql_template TEXT NOT NULL,
    intent_patterns JSONB NOT NULL,  -- 意图匹配模式
    param_schema JSONB NOT NULL,     -- 参数定义
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier 2: LLM生成的SQL记录
CREATE TABLE sql_generated_queries (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    generated_sql TEXT NOT NULL,
    validation_passed BOOLEAN DEFAULT FALSE,
    explain_result JSONB,           -- EXPLAIN ANALYZE 结果
    execution_count INTEGER DEFAULT 0,
    first_used_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tier 3: 模板候选池（人工审核队列）
CREATE TABLE sql_template_candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sql_text TEXT NOT NULL,
    source_query TEXT NOT NULL,
    reuse_count INTEGER DEFAULT 0,
    validation_history JSONB,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 能力注册表
-- ============================================

CREATE TABLE capabilities (
    capability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    module VARCHAR(100) NOT NULL,    -- ops, marketing, evolution
    description TEXT,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 审计日志
-- ============================================

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES instances(instance_id),
    user_id UUID,
    capability_id UUID REFERENCES capabilities(capability_id),
    action VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    execution_time_ms INTEGER,
    status VARCHAR(50) NOT NULL,     -- success, failed, pending_confirmation
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_instance ON audit_logs(instance_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- Marketing 模块
-- ============================================

-- 内容记录
CREATE TABLE content_records (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500),
    body TEXT,
    tags JSONB DEFAULT '{}',         -- {content_type, topic, tone, target_audience}
    platform VARCHAR(100),           -- twitter, wechat, notion
    published_at TIMESTAMPTZ,
    metrics JSONB DEFAULT '{}',      -- {views, likes, shares, clicks}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 周期复盘报告
CREATE TABLE cycle_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_start TIMESTAMPTZ NOT NULL,
    cycle_end TIMESTAMPTZ NOT NULL,
    insights JSONB NOT NULL,         -- 洞察列表
    recommendations JSONB NOT NULL,  -- 建议列表
    action_items JSONB NOT NULL,     -- 行动项
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Memory Layer
-- ============================================

-- Foundation Memory: Schema缓存
CREATE TABLE schema_cache (
    schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    schema_json JSONB NOT NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experience Memory: 执行历史
CREATE TABLE execution_history (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID REFERENCES capabilities(capability_id),
    input_hash VARCHAR(64),          -- 输入哈希，用于去重
    result_summary JSONB,
    user_feedback INTEGER,           -- 1-5评分
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strategy Artifacts: 学习到的模式
CREATE TABLE learned_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 向量存储 (pgvector)

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 意图嵌入向量表
CREATE TABLE intent_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_text TEXT NOT NULL,
    embedding vector(1536),          -- OpenAI embedding维度
    capability_id UUID REFERENCES capabilities(capability_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 相似度搜索索引
CREATE INDEX idx_intent_embeddings ON intent_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## 5. 技术栈选型

### 5.1 核心技术栈
> **n8n 禁用说明**：当前项目不使用任何外部编排平台（包括 n8n）。所有流程必须通过 Router + Capability 在本代码库内完成，并受 Human Gate 与审计约束。


| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **Bot框架** | python-telegram-bot | 成熟稳定，异步支持好 |
| **工作流引擎** | 内部 Router + Capability | 禁用外部编排，保持确定性与审计 |
| **数据库** | Supabase (PostgreSQL) | 托管服务，内置认证、pgvector |
| **缓存** | Redis (Upstash) | Serverless Redis，按需付费 |
| **LLM** | OpenAI API | GPT-4o 主力，GPT-3.5 辅助 |
| **向量存储** | pgvector | PostgreSQL原生，无需额外服务 |

### 5.2 Admin OS 技术方案

**MVP方案 (推荐)**:

| 方案 | 工具 | 搭建时间 | 适用场景 |
|------|------|---------|---------|
| **方案A** | Supabase Table Editor | 1小时 | 快速查看/编辑数据 |
| **方案B** | Retool | 1天 | 需要自定义面板 |
| **方案C** | AppSmith | 1天 | 需要复杂交互 |

**Supabase Table Editor 配置**:

```yaml
# 启用 Row Level Security
RLS: true

# 配置可编辑表
editable_tables:
  - sql_templates
  - sql_template_candidates
  - capabilities
  - content_records

# 配置只读视图
read_only_views:
  - audit_logs
  - execution_history
  - sql_generated_queries
```

### 5.3 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Telegram API                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Bot Server (Railway/VPS)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 python-telegram-bot                  │   │
│  │                 Router + Modules                     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│    Supabase     │ │  Redis (Upstash)│ │      OpenAI API         │
│   (PostgreSQL)  │ │    (缓存/队列)   │ │      (LLM调用)          │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

---

## 6. 开发计划与里程碑

### 6.1 P0: Ops数据可信化 (2周)

**目标**: 查询准确率 ≥ 90%

| 阶段 | 任务 | 时间 | 交付物 |
|------|------|------|--------|
| **Week 1** | | | |
| Day 1-2 | 项目初始化 + 数据库Schema | 2天 | Prisma Schema, Supabase配置 |
| Day 3-4 | SQL Engine Tier 1 模板系统 | 2天 | 模板管理API, 5个核心模板 |
| Day 5 | Router基础版 + Telegram Bot | 1天 | 意图分类, Bot命令处理 |
| **Week 2** | | | |
| Day 6-7 | SQL Engine Tier 2 安全机制 | 2天 | LLM生成, EXPLAIN预检, 只读约束 |
| Day 8-9 | Admin OS MVP (Supabase) | 2天 | Table Editor配置, RLS策略 |
| Day 10 | 集成测试 + 准确率验证 | 1天 | 测试报告, 90%+准确率证明 |

**验收标准**:
- [ ] 10个测试查询中至少9个返回正确结果
- [ ] 每个查询返回Evidence结构
- [ ] 审计日志完整记录执行链路

### 6.2 P1: Marketing策略闭环 (3-4周)

**目标**: 互动率较Baseline提升 30%+

| 阶段 | 任务 | 时间 | 交付物 |
|------|------|------|--------|
| **Week 3** | | | |
| Day 11-12 | Tagging System设计+实现 | 2天 | 标签体系, 自动打标API |
| Day 13-14 | 内容源集成 | 2天 | 内容同步, Pipeline配置 |
| Day 15 | 发布流程自动化 | 1天 | 定时发布, 状态追踪 |
| **Week 4-5** | | | |
| Day 16-18 | 数据收集 + 归因分析 | 3天 | 指标采集, 转化路径分析 |
| Day 19-20 | Cycle Report生成 | 2天 | 周期报告模板, 自动生成 |
| Day 21-22 | A/B测试框架 | 2天 | 实验管理, 显著性检验 |
| Day 23-24 | 效果验证 + 优化 | 2天 | 30%+提升证明 |

**验收标准**:
- [ ] 内容自动打标准确率 ≥ 85%
- [ ] 周期报告自动生成，含至少3条洞察
- [ ] 互动率提升30%+的数据证明

### 6.3 P2: 有限进化 (未来)

**目标**: 策略自优化能力

| 功能 | 描述 | 前置条件 |
|------|------|---------|
| **模板自动推荐** | 根据查询模式推荐新模板 | P0完成, 有足够执行数据 |
| **归因模型优化** | 更精细的多触点归因 | P1完成, 有转化数据 |
| **策略A/B自动化** | 自动发现最佳策略组合 | P1 A/B框架成熟 |

### 6.4 里程碑图

```
Week 1        Week 2        Week 3        Week 4        Week 5
  │             │             │             │             │
  ▼             ▼             ▼             ▼             ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  P0.W1  │   │  P0.W2  │   │  P1.W1  │   │  P1.W2  │   │  P1.W3  │
│ SQL Tier1│→ │ SQL Tier2│→ │ Tagging │→ │Attribution│→ │ 验证    │
│ Router   │  │ Admin OS │  │ Notion  │  │ Reports  │   │ 优化    │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
      │             │                           │
      └─────────────┴───────────────────────────┘
                    │
                    ▼
              MVP发布 (P0+P1)
```

---

## 7. 宪法级约束

### 7.1 设计原则

| 原则 | 描述 | 实现方式 |
|------|------|---------|
| **Router确定性** | Router = 确定性调度器，LLM = 不可信建议源 | 规则优先，LLM仅辅助 |
| **禁止运行时学习** | 无在线权重调整 | 所有策略变更离线审核 |
| **执行可Replay** | 所有执行可重现 | 输入+参数+时间戳完整记录 |
| **审计可追溯** | 所有Side Effect有Audit Log | 全链路日志，不可篡改 |
| **SQL只读** | 仅允许SELECT操作 | 白名单校验 + 权限控制 |

### 7.2 安全约束

```yaml
security_constraints:
  sql_engine:
    - 只允许SELECT语句
    - 禁止UNION注入
    - 禁止子查询嵌套超过3层
    - EXPLAIN预检执行时间 < 5秒
    - 结果集限制 10000 行

  llm_calls:
    - 所有LLM输出必须校验
    - 置信度 < 0.7 需人工确认
    - 敏感操作需二次确认

  data_access:
    - Row Level Security 启用
    - 用户数据隔离
    - 审计日志保留 90 天
```

### 7.3 v6.0 兼容约束

```sql
-- 所有表预留 instance_id 字段
ALTER TABLE audit_logs ADD COLUMN instance_id UUID REFERENCES instances(instance_id);
ALTER TABLE sql_templates ADD COLUMN instance_id UUID REFERENCES instances(instance_id);

-- 预留 telemetry 接口
CREATE TABLE telemetry_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. 风险与缓解策略

### 8.1 技术风险

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|---------|
| **LLM幻觉导致错误SQL** | 中 | 高 | 三级策略+EXPLAIN预检+只读约束 |
| **查询性能问题** | 中 | 中 | 索引优化+查询超时+结果集限制 |
| **第三方服务不稳定** | 低 | 高 | 重试机制+降级策略+本地缓存 |

### 8.2 业务风险

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|---------|
| **用户不信任AI结果** | 高 | 高 | Evidence结构+透明度+人工确认 |
| **内容效果不达预期** | 中 | 中 | A/B测试+快速迭代+Baseline对比 |
| **学习曲线陡峭** | 中 | 低 | 文档+示例+渐进式功能开放 |

### 8.3 应急预案

```yaml
incident_response:
  severity_levels:
    P1_critical:  # 数据泄露/服务完全不可用
      response_time: 15min
      escalation: 立即通知所有stakeholder
      actions: [回滚, 隔离, 修复]

    P2_major:     # 功能部分不可用
      response_time: 1hour
      escalation: 通知tech lead
      actions: [降级, 修复]

    P3_minor:     # 小bug/体验问题
      response_time: 1day
      escalation: 记录到backlog
      actions: [排期修复]

  rollback_procedure:
    - 停止Bot服务
    - 回滚数据库migration
    - 恢复上一个稳定版本
    - 验证核心功能
    - 通知用户恢复
```

---

## 附录

### A. Day 1 任务清单

```markdown
- [ ] 创建Supabase项目
- [ ] 配置Prisma Schema
- [ ] 创建数据库表结构
- [ ] 配置RLS策略
- [ ] 初始化Telegram Bot项目
- [ ] 实现基础命令处理 (/start, /help)
- [ ] 创建第一个SQL模板 (sales_daily)
- [ ] 提交代码到Git仓库
```

### B. 关键指标监控

```yaml
metrics:
  ops:
    - query_accuracy_rate      # 查询准确率
    - tier1_hit_rate           # Tier1模板命中率
    - avg_response_time_ms     # 平均响应时间
    - error_rate               # 错误率

  marketing:
    - engagement_rate          # 互动率
    - content_publish_count    # 内容发布数
    - attribution_confidence   # 归因置信度
    - cycle_report_completion  # 周期报告完成率

  system:
    - llm_call_count           # LLM调用次数
    - llm_avg_latency_ms       # LLM平均延迟
    - cache_hit_rate           # 缓存命中率
    - audit_log_size_mb        # 审计日志大小
```

### C. 参考文档

- [Supabase Documentation](https://supabase.com/docs)
- [python-telegram-bot Documentation](https://docs.python-telegram-bot.org/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

**文档维护**: 本文档随项目迭代持续更新，当前版本对应 v5.1 架构设计。