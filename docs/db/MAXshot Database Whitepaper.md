# 📘 MAXshot 数据库白皮书 v2.0 Final：从全量矿石到金融情报

**版本**: v2.0 Final  
**创建日期**: 2025-01-30  
**审核人**: Mike (Database Expert)  
**状态**: ✅ 生产就绪 (Production Ready)

**致：运营团队 (Ops) 与 产品经理 (PM)**  
**核心宗旨**：数据不仅是记录，更是资产。我们通过"三层加工体系"，确保数据的**全量储备、因果透明、决策纯净**。

---

## 📋 执行摘要

MAXshot 数据库体系已完成从"杂货铺"到"自动化车间"的转变。本白皮书将为您全面展示：

- **数据源头**：全量清洗后的"数字矿山"（每分钟1条，每月约4.3万条）
- **数据加工**：四步精炼流程（收集→精炼→净化→封装）
- **数据模型**：三层架构（档案层/逻辑层/展示层）
- **核心视图**：5个智能视图，覆盖运营、审计、管理、运维四大场景
- **质量保障**：11条测试环境过滤规则 + 9维RAG标签完整性检测
- **性能指标**：处理延迟 < 5秒，查询响应秒级，支持每分钟10+条并发写入

**快速开始**：运营团队可直接通过Alex查询视图，无需写SQL；产品经理可通过"全量Cleaned Data"进行历史回溯分析。

---

## 一、数据源头：全量清洗后的"数字矿山" (Cleaned Raw Data)

在进入任何报表之前，我们首先维护着一个最完整的**原始档案库**。这是我们的第一资产，也是未来所有新需求的"孵化器"。

### 1.1 存储架构

- **存储位置**: Supabase Storage (`cleaned_execution_logs/`)
- **数据格式**: JSON (50-100KB/条)
- **写入频率**: 每分钟1条（心跳写入）
- **保留策略**: 保留90天，之后归档至冷存储

### 1.2 数据规模

- **当前数据量**: 约 4.3万条/月（每分钟1条 × 1440分钟/天 × 30天）
- **存储成本**: 约 2-4GB/月（未压缩）
- **查询性能**: 通过 `execution_id` 索引实现秒级检索

### 1.3 全景覆盖

这里封存了 Agent 每一秒钟的扫描路径。即便 Agent 最终决定"不调仓"，它观察到的利差、协议风险、流动性深度等原始 JSON 记录也被完整保存。

**不仅仅是数字**：它包含了复杂的路径决策日志、原始环境快照、以及多链协议的底层参数。

### 1.4 业务价值

- **回溯能力**：如果 PM 想要分析过去一个月里，有多少次是因为"协议安全性不足"而放弃调仓，我们无需重写程序，直接从"矿山"中摘录原始日志即可。
- **未来扩展**：目前我们提取了 5 个视图，但如果运营未来需要"协议活跃度分布"等新指标，原始数据早已就绪，只需 Alex 开启新的"加工产线"。

### 1.5 质量保障

- **完整性检测**: n8n工作流自动校验必填字段（Step1-13自动化清洗）
- **清洗流程**: Step1-13 自动化清洗，Step14 构建RAG文档
- **异常处理**: 清洗失败的数据自动标记并告警

---

## 二、数据加工流向：从"乱石"到"精金"

我们不仅仅是在存储数据，更是在对数据进行**"自动化精炼"**。

### 2.1 四步精炼流程

1. **收集（The Mine）**：Alex 负责将零散的 Cleaned Data 搬运进库，确保没有遗漏。
2. **精炼（The Refinery）**：我们将混乱的 JSON 文件拆解为整齐的数字（SQL）与逻辑（RAG）。
3. **净化（The Filter）**：**这是 Mike 优化的核心**。系统会自动识别并剔除所有的"测试、调试、模拟"脏数据，确保最终产出的是 100% 真实、可直接用于金融决策的纯净水。
4. **封装（The Views）**：将复杂的数据封装成运营一秒钟就能看懂的"视图"。

### 2.2 技术实现栈

- **收集层**: n8n工作流 Step1-13（数据清洗）
- **精炼层**: RPC函数 `process_log_data_v4`（SQL事实表写入）
- **净化层**: 11条测试环境过滤规则（自动剔除脏数据）
- **封装层**: 5个核心视图（见"核心视图资产清单"章节）

### 2.3 数据流转路径

```
Cleaned JSON (50-100KB)
    ↓ [RPC v4函数: process_log_data_v4]
┌─────────────────────────────────────┐
│ SQL 事实表 (心跳写入，每分钟1次)      │
├─────────────────────────────────────┤
│ • executions (执行记录)              │
│ • fact_execution_summary (财务总账)  │
│ • market_metrics (市场指标)          │
│ • allocation_snapshots (持仓快照)    │
│ • rebalance_decisions (决策记录)     │
└─────────────────────────────────────┘
    ↓ [11条测试环境过滤规则]
┌─────────────────────────────────────┐
│ 5个核心视图 (实时查询，秒级响应)      │
├─────────────────────────────────────┤
│ • v_rag_metadata_quality             │
│ • v_ops_vault_live_status           │
│ • v_audit_decision_flow            │
│ • v_ops_weekly_report               │
│ • v_ops_execution_health            │
└─────────────────────────────────────┘
    ↓ [事件驱动写入]
┌─────────────────────────────────────┐
│ RAG 叙事层 (execution_logs_rag)      │
│ 9维标签 + 向量内容                   │
└─────────────────────────────────────┘
```

### 2.4 RPC函数说明

**函数名**: `process_log_data_v4`

**功能**: 将Cleaned JSON拆解为SQL事实表，实现"心跳写入"（每分钟1次）

**输入**: Cleaned JSON（包含执行记录、市场指标、持仓快照、决策记录）

**输出**: 
- `executions` 表：执行记录（`id` (PK), `workflow_id`, `vault_name`, `status`, `start_time`, `stop_time`, `duration_ms`, `total_gas_cost_usd`, `n8n_execution_id`）
- `market_metrics` 表：市场指标（`chain`, `protocol`, `market_name`, `base_apy`, `net_apy`, `reward_apy`, `tvl`, `market_id`, `vault_id`）
- `allocation_snapshots` 表：持仓快照（`vault_name`, `chain_name`, `protocol_name`, `market`, `asset`, `total_allocated`, `idle_liquidity`）
- `rebalance_decisions` 表：决策记录（`vault_name`, `rebalance_needed`, `is_blocked`, `rebalance_reason`, `action_summary`, `threshold_details`, `trigger_snapshot_id`, `decision_timestamp`）

**关联关系**：
- 所有子表的 `execution_id` 字段关联到 `executions.id`（主键）
- `market_metrics.market_id` 关联到 `dim_markets.id`（外键）
- `market_metrics.vault_id` 关联到 `dim_vaults.id`（外键）

**性能指标**:
- 处理延迟: < 5秒（从Cleaned JSON到SQL表可用）
- 并发能力: 支持每分钟10+条并发写入

### 2.5 11条测试环境过滤规则

为确保最终产出的是100%真实数据，系统自动剔除以下测试环境数据：

1. `vault_name IS NULL` - 空金库名称
2. `vault_name = ''` - 空字符串
3. `vault_name LIKE '%Test%'` - 测试金库
4. `vault_name LIKE '%Debug%'` - 调试金库
5. `vault_name LIKE '%Error%'` - 错误金库
6. `vault_name LIKE '%Staging%'` - 预发布环境
7. `vault_name LIKE '%Dev%'` - 开发环境
8. `vault_name LIKE 'Path_%'` - 路径错误
9. `vault_name LIKE 'Vault_%'` - 占位符金库
10. `vault_name LIKE 'Vault_Name_%'` - 名称缺失
11. `vault_name LIKE 'Vault_Path_%'` - 路径缺失
12. `vault_name IN ('Omni Vault', 'USDC Vault', 'USDT Vault')` - 通用占位符

**应用范围**: 所有5个核心视图均强制应用此过滤规则。

---

## 三、"三位一体"的数据模型

我们将数据资产划分为三个层次，满足不同维度的业务需求：

| 层次 | 核心资产 | 解决什么问题 | 业务场景示例 |
| --- | --- | --- | --- |
| **底层 (档案层)** | **全量 Cleaned Data** | 存储所有的可能性 | "我要查上周三下午 2 点 Agent 看到的原始路径。" |
| **中层 (逻辑层)** | **SQL + RAG 联轴器** | 解释"为什么" | "为什么利差够大，系统却拦截了这次调仓？" |
| **顶层 (展示层)** | **场景化智能视图** | 快速决策与播报 | "现在的 TVL 多少？上周收益率达标了吗？" |

### 3.1 技术架构明细

#### 底层（档案层）

- **表名**: `execution_logs_rag` (RAG语义记忆)
- **存储内容**: Agent思考逻辑、决策原因、环境噪音
- **查询方式**: 向量检索（pgvector）
- **写入频率**: 事件驱动（只有决策变动、被拦截、或每小时例行采样时才写入）
- **Metadata标签**: 9维标签（`execution_id`, `vault_name`, `chain_name`, `asset`, `protocol_name`, `is_blocked`, `apy_level`, `rebalance_reason`, `created_at`）

#### 中层（逻辑层）

**SQL事实表**:
- `executions` (执行记录) - 记录每次执行的开始/结束时间、状态、时长、Gas成本
- `fact_execution_summary` (财务总账 VIEW) - 通过聚合 `allocation_snapshots` 计算TVL，用于生成日报/周报
- `rebalance_decisions` (决策记录) - 记录调仓理由及是否触发再平衡，是逻辑审计的核心
- `market_metrics` (市场扫描) - 记录Agent决策时看到的实时利率和备选市场环境
- `allocation_snapshots` (持仓分布) - 记录资金在各个协议（Morpho, Aave）的即时分布

**RAG叙事表**:
- `execution_logs_rag` (9维标签 + 向量内容) - 存储Agent的思考逻辑、巡逻日志和环境噪音

**关联键**: 
- `executions.id` (UUID, PK) - 主表主键
- 所有子表的 `execution_id` (UUID) 关联到 `executions.id` - 确保SQL和RAG数据一一对应
- `market_metrics.market_id` → `dim_markets.id` (外键)
- `market_metrics.vault_id` → `dim_vaults.id` (外键)
- `execution_logs_rag.metadata->>'execution_id'` → `executions.id` (RAG关联)

#### 顶层（展示层）

**5个核心视图**（详见"核心视图资产清单"章节）:

1. **`v_rag_metadata_quality`** - Agent记忆质量审计（运维专用）
2. **`v_ops_vault_live_status`** - 实时金库看板（运营专用）
3. **`v_audit_decision_flow`** - 决策逻辑追踪（审计专用）
4. **`v_ops_weekly_report`** - 管理周报（管理层专用）
5. **`v_ops_execution_health`** - 运维健康监控（DevOps专用）

### 3.2 数据一致性保障

- **写入顺序**: RPC v4函数确保SQL表先写入，RAG后写入
- **关联验证**: 通过 `executions.id` 和子表的 `execution_id` 确保SQL和RAG数据一一对应
- **外键约束**: `market_metrics.market_id` 和 `market_metrics.vault_id` 通过外键关联到维度表
- **质量检测**: `v_rag_metadata_quality` 视图实时监控RAG标签完整性（9维标签检测）

### 3.3 Agent查询路由规则

为了让Agent在回答问题时不混淆"事实"与"叙事"，必须遵循以下路径：

1. **统计/数值问答** (如："USDC金库平均APY是多少？")
   - 👉 **工具路径**: SQL Tool → `fact_execution_summary` / `market_metrics`
   - **原因**: 数值查询需要高效聚合，SQL表已预计算，秒级响应

2. **因果/追溯问答** (如："上周三下午为何被拦截了？")
   - 👉 **工具路径**: RAG Tool → 根据 `execution_id` 检索 `rebalance_reason`
   - **原因**: 决策原因存储在RAG的叙事内容中，需要语义检索

---

## 四、核心视图资产清单

> **详细文档**: 请参考 `MAXshot 核心视图资产白皮书 (v1.0).md`

### 4.1 视图总览

| 视图编号 | 视图名称 | 功能定位 | 主要受众 | 查询频率 |
|---------|---------|---------|---------|---------|
| **View 01** | `v_rag_metadata_quality` | Agent记忆质量审计 | 运维 (DevOps) | 每小时 |
| **View 02** | `v_ops_vault_live_status` | 实时金库看板 | 运营 (Ops) | 每4小时 |
| **View 03** | `v_audit_decision_flow` | 决策逻辑追踪 | 审计 (Audit) | 按需 |
| **View 04** | `v_ops_weekly_report` | 管理周报 | 管理层 (Management) | 每周一 |
| **View 05** | `v_ops_execution_health` | 运维健康监控 | 运维 (DevOps) | 每小时 |

### 4.2 视图功能速览

#### View 01: `v_rag_metadata_quality` - Agent记忆质量审计

**功能**: 对Agent的"记忆"进行9维深度扫描，不仅看有没有记录，更看标签齐不齐。  
**业务价值**: 防止Agent在调仓决策中"失忆"，直接为运维提供修复清单。

**输出字段**:
- `rag_id`, `execution_id`, `vault_name`
- `missing_tags_count` (缺失标签数量，0-9)
- `completeness_pct` (完整度百分比，0-100%)
- `missing_fields` (缺失字段明细数组)
- `rag_status` (状态: `OK` / `INCOMPLETE`)
- `created_at`

**告警阈值**:
- `completeness_pct < 90%` → 🔴 严重告警
- `completeness_pct < 95%` → 🟡 警告
- `missing_tags_count > 2` → 🟡 警告

#### View 02: `v_ops_vault_live_status` - 实时金库看板

**功能**: 利用 `fact_execution_summary` 预计算层实现秒级响应，实时展示金库资产与收益。  
**业务价值**: Leo和运营团队的"首页仪表盘"，已强制剔除所有测试环境数据。

**输出字段**:
- `vault_name`, `chain_name`
- `total_tvl` (实时TVL，USD)
- `success_rate_24h_pct` (24小时成功率)
- `asset_distribution` (资产分布JSON)
- `last_update_time` (最后更新时间)

#### View 03: `v_audit_decision_flow` - 决策逻辑追踪

**功能**: 将执行状态、TVL与Agent的调仓决策原因（Reason）强关联。  
**业务价值**: 审计专用。当用户询问"为什么我的金库没动"时，此处提供标准答案。

**输出字段**:
- `execution_id`, `vault_name`, `chain_name`
- `exec_status` (执行状态)
- `total_tvl` (TVL金额)
- `rebalance_needed` (是否需要调仓)
- `is_blocked` (是否被拦截)
- `rebalance_reason` (调仓原因)
- `created_at`

#### View 04: `v_ops_weekly_report` - 管理周报

**功能**: 基于事实汇总表进行跨周聚合，展示TVL趋势与系统稳定性。  
**业务价值**: 每周一早上自动发给管理层的业绩报告。

**输出字段**:
- `vault_name`, `report_week` (汇报周)
- `total_executions` (总执行次数)
- `success_count` (成功次数)
- `success_rate_pct` (成功率)
- `avg_weekly_tvl`, `max_weekly_tvl`, `min_weekly_tvl` (TVL波动区间)
- `rebalance_triggered_count` (调仓触发次数)
- `blocked_count` (拦截次数)
- `avg_duration_ms`, `p95_duration_ms` (执行时长统计)

#### View 05: `v_ops_execution_health` - 运维健康监控

**功能**: 统计每小时/每天的执行时长和报错率，监控系统性能。  
**业务价值**: 识别系统瓶颈，例如P95延迟过高时自动触发DevOps响应。

**输出字段**:
- `time_bucket` (小时粒度), `day_bucket` (天粒度)
- `vault_name`
- `runs` (总执行数)
- `success_count`, `errors` (成功/报错数)
- `success_rate_pct` (成功率)
- `avg_latency_ms`, `median_latency_ms`, `p95_latency_ms`, `max_latency_ms` (延迟统计)
- `system_load` (系统负载: `🟢 Low` / `🟡 Medium` / `🔴 High`)

---

## 五、业务应用场景：Alex如何赋能运营与产品

通过这套体系，Alex将成为运营团队的"超级数据助理"：

### 5.1 实时指挥部：Discord金库看板

**场景**: 运营需要每4小时在群里同步金库状态。

**支撑**: Alex调用 `v_ops_vault_live_status`。

**Alex调用示例**:
```sql
SELECT 
    vault_name,
    chain_name,
    ROUND(total_tvl::NUMERIC, 2) AS tvl_usd,
    success_rate_24h_pct,
    asset_distribution,
    last_update_time
FROM v_ops_vault_live_status
WHERE vault_name IS NOT NULL
ORDER BY total_tvl DESC;
```

**输出格式**:
```
📊 金库实时看板 (2026-01-30 15:00)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 dForce USDC - Morpho - arbitrum
   TVL: $94,189,879.14
   24h成功率: 100.0%
   资产分布: {"Aave": 20%, "Morpho": 80%}
   最后更新: 2分钟前
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 dForce USDC - Morpho - base
   TVL: $34,737,800.23
   24h成功率: 100.0%
   资产分布: {"Morpho": 100%}
   最后更新: 2分钟前
```

**效果**: 自动输出净化后的TVL、24h成功率、资产分布。运营看到的是排除了测试干扰的真实金额。

---

### 5.2 决策黑匣子：审计与解释

**场景**: 用户或Leo询问："为什么过去10小时没有调仓？"

**支撑**: Alex检索 `v_audit_decision_flow` 关联的RAG记忆。

**Alex调用示例（SQL事实层）**:
```sql
SELECT 
    execution_id,
    vault_name,
    chain_name,
    rebalance_needed,
    is_blocked,
    rebalance_reason,
    total_tvl,
    created_at
FROM v_audit_decision_flow
WHERE vault_name = 'dForce USDC - Morpho - arbitrum'
  AND created_at >= NOW() - INTERVAL '10 hours'
ORDER BY created_at DESC;
```

**Alex调用示例（RAG叙事层）**:
```python
# Alex通过RAG检索获取详细决策原因
rag_result = vector_search(
    query="为什么这次调仓被拦截了？",
    filter={
        "execution_id": "634983bd-67d5-446b-8a29-d8d919014b7c",
        "vault_name": "dForce USDC - Morpho - arbitrum"
    }
)
```

**输出格式**:
```
🔍 决策审计报告 (Execution ID: 634983bd-67d5-446b-8a29-d8d919014b7c)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 事实层 (SQL):
   • 调仓必要: False
   • 拦截状态: 🔴 BLOCKED
   • 拦截原因: 处于24h冷却保护期
   • 当前TVL: $94,189,879.14

📝 叙事层 (RAG):
   Agent在本次巡逻中发现：
   - 当前利差为0.35%，未达到0.5%阈值
   - 距离上次调仓仅18小时，仍在冷却期内
   - Aave协议当前深度为$500K，不足以支持大额调仓
   因此系统决定暂不调仓，等待冷却期结束。
```

**效果**: Alex能够清晰回答："因为此时处于24h冷却期，且Aave协议的当前深度不支持大额调仓。"（数据事实 + 逻辑原因）。

---

### 5.3 业绩军功簿：管理层周报

**场景**: 每周一早上的管理层会议需要TVL波动和系统健康度报告。

**支撑**: Alex调用 `v_ops_weekly_report`。

**Alex调用示例**:
```sql
SELECT 
    vault_name,
    report_week,
    total_executions,
    success_count,
    success_rate_pct,
    ROUND(avg_weekly_tvl::NUMERIC, 2) AS avg_tvl,
    ROUND(max_weekly_tvl::NUMERIC, 2) AS max_tvl,
    ROUND(min_weekly_tvl::NUMERIC, 2) AS min_tvl,
    rebalance_triggered_count,
    blocked_count,
    avg_duration_ms,
    p95_duration_ms
FROM v_ops_weekly_report
WHERE report_week >= DATE_TRUNC('week', NOW() - INTERVAL '4 weeks')
ORDER BY report_week DESC, vault_name;
```

**输出格式**:
```
📈 管理周报 (2026-W04)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 dForce USDC - Morpho - arbitrum
   • 总执行: 1,008次
   • 成功率: 99.2%
   • 平均TVL: $12.45M
   • TVL波动: $12.1M - $12.8M
   • 调仓触发: 3次
   • 拦截次数: 12次
   • 平均延迟: 1.2s
   • P95延迟: 2.5s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**效果**: 一键生成包含最大/最小TVL、平均收益率、系统报错分布的精美数据源。

---

### 5.4 质量纠察队：Agent记忆巡检

**场景**: 运维需要确保Agent没有"变傻"或"失忆"。

**支撑**: Alex实时扫描 `v_rag_metadata_quality`。

**告警阈值**:
- `completeness_pct < 90%` → 🔴 严重告警 → Discord #ops-alerts 频道
- `completeness_pct < 95%` → 🟡 警告 → 每日汇总报告
- `missing_tags_count > 2` → 🟡 警告 → 每日汇总报告

**Alex调用示例**:
```sql
SELECT 
    rag_id,
    execution_id,
    vault_name,
    missing_tags_count,
    completeness_pct,
    missing_fields,
    rag_status,
    created_at
FROM v_rag_metadata_quality
WHERE rag_status != 'OK' OR completeness_pct < 90
ORDER BY created_at DESC
LIMIT 10;
```

**输出格式**:
```
⚠️ Agent记忆质量告警 (2026-01-30 15:00)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 严重告警 (完整度 < 90%):
   • Execution ID: 634983bd-67d5-446b-8a29-d8d919014b7c
   • 完整度: 77.7%
   • 缺失字段: [apy_level, is_blocked]
   • 状态: INCOMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**效果**: 如果Agent的记忆标签完整度低于90%，系统自动向Alex预警，在影响业务前完成修复。

---

### 5.5 系统健康监控：运维性能追踪

**场景**: DevOps需要每小时检查系统健康度，P95延迟 > 5s时告警。

**支撑**: Alex调用 `v_ops_execution_health`。

**Alex调用示例**:
```sql
SELECT 
    time_bucket,
    vault_name,
    runs,
    success_count,
    errors,
    success_rate_pct,
    avg_latency_ms,
    p95_latency_ms,
    system_load
FROM v_ops_execution_health
WHERE p95_latency_ms > 5000
   OR success_rate_pct < 95
   OR system_load = '🔴 High'
ORDER BY time_bucket DESC;
```

**输出格式**:
```
🚨 系统健康告警 (2026-01-30 15:00)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 高延迟告警:
   • 时间段: 14:00 - 15:00
   • 金库: dForce USDC - Morpho - arbitrum
   • P95延迟: 6.2s (阈值: 5s)
   • 系统负载: 🔴 High
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**效果**: 识别系统瓶颈，例如P95延迟过高时自动触发DevOps响应。

---

## 六、数据质量保障机制

### 6.1 11条测试环境过滤规则

所有5个核心视图均强制应用以下过滤规则，确保产出100%真实数据：

1. `vault_name IS NOT NULL` - 排除空金库名称
2. `vault_name != ''` - 排除空字符串
3. `vault_name NOT LIKE '%Test%'` - 排除测试金库
4. `vault_name NOT LIKE '%Debug%'` - 排除调试金库
5. `vault_name NOT LIKE '%Error%'` - 排除错误金库
6. `vault_name NOT LIKE '%Staging%'` - 排除预发布环境
7. `vault_name NOT LIKE '%Dev%'` - 排除开发环境
8. `vault_name NOT LIKE 'Path_%'` - 排除路径错误
9. `vault_name NOT LIKE 'Vault_%'` - 排除占位符金库
10. `vault_name NOT LIKE 'Vault_Name_%'` - 排除名称缺失
11. `vault_name NOT LIKE 'Vault_Path_%'` - 排除路径缺失
12. `vault_name NOT IN ('Omni Vault', 'USDC Vault', 'USDT Vault')` - 排除通用占位符

### 6.2 RAG 9维标签完整性检测

`v_rag_metadata_quality` 视图实时监控RAG标签完整性，检测以下9个核心字段：

1. `execution_id` - 执行ID（关联键）
2. `vault_name` - 金库名称
3. `chain_name` - 链名称
4. `asset` - 资产类型
5. `protocol_name` - 协议名称
6. `is_blocked` - 是否被拦截
7. `apy_level` - APY等级（competitive/stable/low_yield）
8. `rebalance_reason` - 调仓原因
9. `created_at` - 创建时间

**完整性计算**:
- `completeness_pct = (9 - missing_tags_count) / 9 * 100`
- `rag_status = CASE WHEN completeness_pct = 100 THEN 'OK' ELSE 'INCOMPLETE' END`

### 6.3 数据一致性验证

- **写入顺序**: RPC v4函数确保SQL表先写入，RAG后写入
- **关联验证**: 通过 `executions.id` 和子表的 `execution_id` 以及 RAG metadata 中的 `execution_id` 确保SQL和RAG数据一一对应
- **外键约束**: `market_metrics.market_id` 和 `market_metrics.vault_id` 通过外键关联到维度表
- **质量检测**: `v_rag_metadata_quality` 视图实时监控RAG标签完整性

### 6.4 异常处理机制

- **清洗失败**: 清洗失败的数据自动标记并告警（Discord #ops-alerts）
- **数据缺失**: 缺失关键字段的数据自动标记为 `INCOMPLETE`
- **关联断裂**: SQL和RAG数据关联断裂时自动告警

---

## 七、性能指标与SLA

### 7.1 处理性能

- **处理延迟**: < 5秒（从Cleaned JSON到SQL表可用）
- **视图刷新**: 实时（基于物化视图或索引优化）
- **并发能力**: 支持每分钟10+条并发写入

### 7.2 查询性能

- **简单查询**: < 100ms（单表查询，带索引）
- **聚合查询**: < 500ms（多表JOIN，带预计算）
- **复杂查询**: < 2s（跨周聚合，带物化视图）

### 7.3 存储性能

- **写入吞吐**: 每分钟10+条（RPC v4函数）
- **存储成本**: 约2-4GB/月（未压缩）
- **索引效率**: 所有核心字段均已建立索引

### 7.4 可用性SLA

- **数据可用性**: 99.9%（Supabase SLA）
- **查询可用性**: 99.9%（视图查询）
- **告警响应**: < 5分钟（Discord告警）

---

## 八、快速开始指南

### 8.1 对于运营团队

**第一步**: 了解5个核心视图的功能定位（见"核心视图资产清单"章节）

**第二步**: 通过Alex直接查询视图（无需写SQL）

**常用查询**:
- **日常巡检**: `SELECT * FROM v_ops_vault_live_status;`
- **质量追责**: `SELECT * FROM v_rag_metadata_quality WHERE rag_status != 'OK';`
- **周报生成**: `SELECT * FROM v_ops_weekly_report ORDER BY report_week DESC LIMIT 4;`

**第三步**: 设置Discord告警接收质量监控通知

**告警设置**:
- 严重告警 (`completeness_pct < 90%`) → Discord #ops-alerts 频道
- 警告 (`completeness_pct < 95%`) → 每日汇总报告

### 8.2 对于产品经理

**第一步**: 查看"MAXshot FInal optimized Database.md"了解数据模型

**第二步**: 提出新业务指标需求，Mike负责设计新视图

**第三步**: 通过"全量Cleaned Data"进行历史回溯分析

**回溯查询示例**:
```sql
-- 查询过去一个月因"协议安全性不足"而放弃调仓的次数
SELECT COUNT(*) 
FROM execution_logs_rag
WHERE content LIKE '%协议安全性不足%'
  AND created_at >= NOW() - INTERVAL '1 month';
```

### 8.3 对于技术团队

**第一步**: 查看"MAXshot 核心视图资产白皮书 (v1.0).md"了解视图技术细节

**第二步**: 查看RPC函数 `process_log_data_v4` 的输入输出格式

**第三步**: 查看11条测试环境过滤规则，确保新视图也应用此规则

### 8.4 获取帮助

- **技术文档**: `Mike_DatabaseExpert/4.Working/Database/`
- **视图白皮书**: `MAXshot 核心视图资产白皮书 (v1.0).md`
- **问题反馈**: Discord #database-support 频道

---

## 九、未来规划

### 9.1 短期优化计划（Q1 2026）

- **数据归档**: 实现数据归档和冷热分离（90天热数据，1年冷数据）
- **性能优化**: 优化跨周聚合查询性能（物化视图）
- **告警增强**: 增强Discord告警通知（包含修复建议）

### 9.2 中期扩展计划（Q2 2026）

- **新视图**: 新增"协议活跃度分布"视图
- **数据挖掘**: 基于历史数据挖掘调仓模式
- **可视化**: 集成Grafana仪表盘

### 9.3 长期愿景（Q3 2026）

- **实时流**: 实现实时数据流（Kafka/WebSocket）
- **数据治理**: 建立完整的数据治理体系（数据质量、数据安全、数据合规）
- **AI增强**: 基于历史数据训练调仓决策模型

---

## 十、寄语：数据驱动的未来

这份白皮书的发布，标志着MAXshot的数据底座已经完成了**从"杂货铺"到"自动化车间"**的转变。

- **对运营**：你们不再需要去表格里一个个找数据，Alex是你们的接口，视图是你们的眼睛。
- **对产品**：底层的全量Cleaned Data是你们无限的创意空间。只要你们能想到的业务指标，我们都有原始数据支撑。
- **对技术**：我们建立了一套完整的数据质量保障机制，确保数据的准确性、一致性和可用性。

---

## 附录

### A. 技术架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    MAXshot 数据库体系架构                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Cleaned JSON    │  (50-100KB/条，每分钟1条)
│  (数字矿山)       │
└────────┬─────────┘
         │
         │ [RPC v4函数: process_log_data_v4]
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQL 事实层 (心跳写入)                       │
├─────────────────────────────────────────────────────────────┤
│ • executions (执行记录)                                       │
│ • fact_execution_summary (财务总账)                          │
│ • market_metrics (市场指标)                                  │
│ • allocation_snapshots (持仓快照)                             │
│ • rebalance_decisions (决策记录)                             │
└────────┬────────────────────────────────────────────────────┘
         │
         │ [11条测试环境过滤规则]
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    5个核心视图 (实时查询)                      │
├─────────────────────────────────────────────────────────────┤
│ • v_rag_metadata_quality (记忆质量审计)                      │
│ • v_ops_vault_live_status (实时金库看板)                     │
│ • v_audit_decision_flow (决策逻辑追踪)                       │
│ • v_ops_weekly_report (管理周报)                             │
│ • v_ops_execution_health (运维健康监控)                      │
└────────┬────────────────────────────────────────────────────┘
         │
         │ [事件驱动写入]
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              RAG 叙事层 (execution_logs_rag)                  │
│              9维标签 + 向量内容 (pgvector)                   │
└─────────────────────────────────────────────────────────────┘
```

### B. 表结构清单

#### B.1 核心事实表

**`executions`** (执行记录)
- `id` (UUID, PK) - 主键，关联键（子表的 `execution_id` 关联到此字段）
- `workflow_id` (TEXT) - 工作流ID
- `vault_name` (TEXT) - 金库名称（索引）
- `status` (TEXT) - 执行状态（success/error/running）
- `start_time` (TIMESTAMPTZ) - 开始时间
- `stop_time` (TIMESTAMPTZ) - 结束时间
- `duration_ms` (INTEGER) - 执行时长（毫秒）
- `total_gas_cost_usd` (NUMERIC) - 总Gas成本（USD）
- `created_at` (TIMESTAMPTZ) - 创建时间
- `updated_at` (TIMESTAMPTZ) - 更新时间
- `n8n_execution_id` (TEXT) - n8n原始执行ID（数字ID）

**`fact_execution_summary`** (财务总账 VIEW)
- `execution_id` (UUID) - 关联到 `executions.id`
- `timestamp` (TIMESTAMPTZ) - 分钟粒度时间戳
- `r_date` (DATE) - 日期（天粒度）
- `r_week` (DATE) - 周开始日期（周粒度）
- `vault_name` (TEXT) - 金库名称
- `total_tvl` (NUMERIC) - 总TVL（聚合自 `allocation_snapshots.total_allocated`）

**说明**：这是一个 **VIEW**（视图），不是 TABLE（表）。通过聚合 `allocation_snapshots` 表计算得出。

**`rebalance_decisions`** (决策记录)
- `id` (UUID, PK) - 主键
- `execution_id` (UUID, NOT NULL, FK → executions.id) - 执行ID（关联到 `executions.id`）
- `vault_name` (TEXT, NOT NULL) - 金库名称
- `rebalance_needed` (BOOLEAN, NOT NULL) - 是否需要调仓
- `rebalance_reason` (TEXT) - 调仓原因
- `action_summary` (JSONB) - 操作摘要（JSON格式）
- `trigger_snapshot_id` (UUID) - 触发快照ID
- `decision_timestamp` (TIMESTAMPTZ) - 决策时间戳
- `is_blocked` (BOOLEAN, NOT NULL) - 是否被拦截
- `threshold_details` (JSONB) - 阈值详情（JSON格式）

**`market_metrics`** (市场指标)
- `id` (UUID, PK) - 主键
- `execution_id` (UUID, NOT NULL, FK → executions.id) - 执行ID（关联到 `executions.id`）
- `chain` (TEXT) - 链名称
- `protocol` (TEXT) - 协议名称
- `market_name` (TEXT) - 市场名称
- `base_apy` (NUMERIC) - 基础APY（%）
- `reward_apy` (JSONB) - 奖励APY（JSON格式）
- `net_apy` (NUMERIC) - 净APY（%）
- `tvl` (NUMERIC) - 总锁仓价值（USD）
- `est_deposit_gas` (NUMERIC) - 预估存款Gas成本（USD）
- `protocol_market_id` (TEXT) - 协议市场ID（格式：chain-protocol-market）
- `is_available` (BOOLEAN) - 是否可用
- `created_at` (TIMESTAMPTZ) - 创建时间
- `market_id` (INTEGER, FK → dim_markets.id) - 市场维度ID（外键）
- `vault_id` (INTEGER, FK → dim_vaults.id) - 金库维度ID（外键）

**`allocation_snapshots`** (持仓快照)
- `id` (UUID, PK) - 主键
- `execution_id` (UUID, NOT NULL, FK → executions.id) - 执行ID（关联到 `executions.id`）
- `vault_name` (TEXT, NOT NULL) - 金库名称
- `chain_name` (TEXT) - 链名称
- `protocol_name` (TEXT) - 协议名称
- `market` (TEXT, NOT NULL) - 市场名称
- `asset` (TEXT) - 资产类型（如 USDC, USDT）
- `total_allocated` (NUMERIC) - 总分配金额（USD）
- `idle_liquidity` (NUMERIC) - 闲置流动性（USD）
- `created_at` (TIMESTAMPTZ) - 创建时间

#### B.2 RAG叙事表

**`execution_logs_rag`** (RAG语义记忆)
- `id` (UUID, PK)
- `content` (TEXT) - 向量化内容
- `metadata` (JSONB) - 9维标签
- `embedding` (VECTOR) - pgvector向量
- `created_at` (TIMESTAMPTZ)

**Metadata结构** (9维标签):
```json
{
  "execution_id": "uuid",
  "vault_name": "string",
  "chain_name": "string",
  "asset": "string",
  "protocol_name": "string",
  "is_blocked": "boolean",
  "apy_level": "competitive|stable|low_yield",
  "rebalance_reason": "string",
  "created_at": "timestamp"
}
```

### C. RPC函数说明

**函数名**: `process_log_data_v4`

**功能**: 将Cleaned JSON拆解为SQL事实表

**输入参数**:
```json
{
  "executionId": "uuid",        // 对应 executions.id (主键)
  "workflowId": "string",       // 对应 executions.workflow_id
  "vaultName": "string",        // 对应 executions.vault_name
  "n8nExecutionId": "string",   // 对应 executions.n8n_execution_id
  "startedAt": "timestamp",     // 对应 executions.start_time
  "stoppedAt": "timestamp",     // 对应 executions.stop_time
  "status": "success|error|running",  // 对应 executions.status
  "markets": [...],             // 写入 market_metrics 表
  "allocations": [...],         // 写入 allocation_snapshots 表
  "rebalanceDecision": {...}    // 写入 rebalance_decisions 表
}
```

**输出**: 
- 写入 `executions` 表（主表，生成 `id` 作为主键）
- 写入 `market_metrics` 表（`execution_id` 关联到 `executions.id`）
- 写入 `allocation_snapshots` 表（`execution_id` 关联到 `executions.id`）
- 写入 `rebalance_decisions` 表（`execution_id` 关联到 `executions.id`）

**关联关系**：
- 所有子表的 `execution_id` 字段关联到 `executions.id`（主键）
- `fact_execution_summary` 是一个 VIEW，通过聚合 `allocation_snapshots` 计算得出

**性能**: 处理延迟 < 5秒，支持每分钟10+条并发写入

---

**文档版本**: v2.0 Final (Updated 2025-01-30)  
**最后更新**: 2025-01-30  
**维护者**: Mike (Database Expert)  
**审核人**: LEO (Product Manager)

---

## 📝 更新记录

### v2.0 Final (2025-01-30)
- ✅ 修正 `executions` 表结构（删除错误的 `execution_id` 字段，添加 `workflow_id`, `total_gas_cost_usd`, `updated_at`, `n8n_execution_id`）
- ✅ 修正 `fact_execution_summary` 描述（从 TABLE 改为 VIEW，更新字段列表：`execution_id`, `timestamp`, `r_date`, `r_week`, `vault_name`, `total_tvl`）
- ✅ 修正 `market_metrics` 表结构（`supply_apy` → `base_apy`，删除 `borrow_apy`，添加实际字段：`chain`, `net_apy`, `tvl`, `est_deposit_gas`, `protocol_market_id`, `is_available`, `market_id`, `vault_id`）
- ✅ 修正 `allocation_snapshots` 表结构（`allocated_amount` → `total_allocated`，添加实际字段：`market`, `asset`, `idle_liquidity`）
- ✅ 修正 `rebalance_decisions` 表结构（添加缺失字段：`vault_name`, `action_summary`, `trigger_snapshot_id`, `decision_timestamp`）
- ✅ 明确关联关系：所有子表的 `execution_id` 关联到 `executions.id`（主键），不是 `executions.execution_id`（该字段不存在）
- ✅ 添加外键关系说明（`market_metrics.market_id` → `dim_markets.id`, `market_metrics.vault_id` → `dim_vaults.id`）
- ✅ 修正所有相关章节的字段引用（RPC函数说明、数据流转路径、Agent查询路由规则等）
