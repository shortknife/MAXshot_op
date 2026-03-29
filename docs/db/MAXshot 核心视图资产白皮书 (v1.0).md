# 💎 MAXshot 核心视图资产白皮书 v2.0 (终极定稿版)

**版本**: v2.0 (Production Ready)  
**创建日期**: 2025-01-30  
**审核人**: Mike (Database Expert) & Gemini (Architect)  
**状态**: ✅ 已就绪，可直接部署

**核心理念**: **事实存 SQL (高效)，因果存 RAG (深读)，数据纯净 (无测试脏数据)**

---

## 📋 视图总览

| 视图编号 | 视图名称 | 功能定位 | 主要受众 |
|---------|---------|---------|---------|
| **View 01** | `v_rag_metadata_quality` | Agent 记忆质量审计 | 运维 (DevOps) |
| **View 02** | `v_ops_vault_live_status` | 实时金库看板 | 运营 (Ops) |
| **View 03** | `v_audit_decision_flow` | 决策逻辑追踪 | 审计 (Audit) |
| **View 04** | `v_ops_weekly_report` | 管理周报 | 管理层 (Management) |
| **View 05** | `v_ops_execution_health` | 运维健康监控 | 运维 (DevOps) |

---

## 1️⃣ 记忆审计视图：`v_rag_metadata_quality`

**功能**：对 Agent 的"记忆"进行 9 维深度扫描，不仅看有没有记录，更看标签齐不齐。  
**业务价值**：防止 Agent 在调仓决策中"失忆"，直接为运维提供修复清单。

### 📊 输出样例

| 状态 | 完整度 | 缺失字段明细 | 巡检时间 |
| --- | --- | --- | --- |
| `🔴 INCOMPLETE` | **77.7%** | `[apy_level, is_blocked]` | 2026-01-07 10:00 |
| `🟢 OK` | **100.0%** | `[]` | 2026-01-07 10:05 |

### 👨‍💻 Alex 调用指南

**场景**：当 `completeness_pct < 90` 时发送 Discord 告警。

```sql
SELECT * FROM v_rag_metadata_quality 
WHERE rag_status != 'OK' OR completeness_pct < 90
ORDER BY created_at DESC;
```

---

## 2️⃣ 实时看板视图：`v_ops_vault_live_status`

**功能**：利用 `fact_execution_summary` 预计算层实现秒级响应，实时展示金库资产与收益。  
**业务价值**：Leo 和运营团队的"首页仪表盘"，已强制剔除所有测试环境数据。

### 📊 输出样例

| 金库名称 | 实时 TVL | 24h 成功率 | 资产分布 (JSON) | 最后更新 |
| --- | --- | --- | --- | --- |
| **dForce USDC** | `$12,850,000` | `100.0%` | `{"Aave": 20%, "Morpho": 80%}` | 2分钟前 |

### 👨‍💻 Alex 调用指南

**场景**：在 Discord 频道每 4 小时播报一次金库现状。

```sql
SELECT * FROM v_ops_vault_live_status;
```

---

## 3️⃣ 决策追踪视图：`v_audit_decision_flow`

**功能**：将执行状态、TVL 与 Agent 的调仓决策原因（Reason）强关联。  
**业务价值**：审计专用。当用户询问"为什么我的金库没动"时，此处提供标准答案。

### 📊 输出样例

| 执行 ID | 调仓必要 | 拦截状态 | 拦截/执行原因 |
| --- | --- | --- | --- |
| `exec_001` | `True` | `🔴 BLOCKED` | **处于 24h 冷却保护期** |
| `exec_002` | `False` | `🟢 IGNORED` | **当前利差未达 0.5% 阈值** |

### 👨‍💻 Alex 调用指南

**场景**：排查特定执行 ID 的决策细节。

```sql
SELECT rebalance_reason 
FROM v_audit_decision_flow 
WHERE execution_id = '你的UUID';
```

---

## 4️⃣ 管理周报视图：`v_ops_weekly_report`

**功能**：基于事实汇总表进行跨周聚合，展示 TVL 趋势与系统稳定性。  
**业务价值**：每周一早上自动发给管理层的业绩报告。

### 📊 输出样例

| 汇报周 | 成功率 | 平均 TVL | TVL 波动区间 (Min - Max) |
| --- | --- | --- | --- |
| **2026-W01** | **99.2%** | `$12.45M` | `$12.1M - $12.8M` |

### 👨‍💻 Alex 调用指南

**场景**：每周一早上 8 点自动生成周报邮件数据。

```sql
SELECT * FROM v_ops_weekly_report 
ORDER BY report_week DESC
LIMIT 4;
```

---

## 5️⃣ 运维监控视图：`v_ops_execution_health` (🆕 Mike 建议新增)

**功能**：统计每小时/每天的执行时长和报错率，监控系统性能。  
**业务价值**：识别系统瓶颈，例如 P95 延迟过高时自动触发 DevOps 响应。

### 📊 输出样例

| 时间段 | 总执行 | 报错数 | P95 延迟 | 系统负载 |
| --- | --- | --- | --- | --- |
| 10:00 - 11:00 | 24 | 0 | **1.2s** | `🟢 Low` |

### 👨‍💻 Alex 调用指南

**场景**：每小时检查系统健康度，P95 延迟 > 5s 时告警。

```sql
SELECT * FROM v_ops_execution_health
WHERE p95_latency_ms > 5000
ORDER BY time_bucket DESC;
```

---

## 📖 Alex 调用手册 (Quick Start)

为了让 Alex 彻底明白怎么用，我们为他准备了三个指令：

* **指令 A (日常巡检)**：`SELECT * FROM v_ops_vault_live_status;`
* **指令 B (质量追责)**：`SELECT * FROM v_rag_metadata_quality WHERE rag_status != 'OK';`
* **指令 C (周报生成)**：`SELECT * FROM v_ops_weekly_report ORDER BY report_week DESC LIMIT 4;`

---

## 📦 MAXshot 核心视图 v2.0 完整部署脚本

> **⚠️ 重要提示**：以下 SQL 脚本可直接复制到 Supabase SQL Editor 执行，所有视图将一次性创建完成。

```sql
-- ============================================
-- MAXshot 核心视图资产 - 完整部署脚本 (v2.0)
-- 架构方案：事实表加速 + 9维标签审计 + 环境净化
-- 执行环境：PostgreSQL / Supabase
-- 创建日期：2025-01-30
-- 审核人：Mike (Database Expert) & Gemini (Architect)
-- ============================================

-- ============================================
-- 1. RAG 质量审计视图 (Mike 增强型 9 维检查)
-- ============================================
-- 功能：对 Agent 的"记忆"进行 9 维深度扫描
-- 输出：execution_id, vault_name, missing_tags_count, completeness_pct, missing_fields, rag_status, created_at

-- 先删除旧视图（如果存在），避免列顺序/名称冲突
DROP VIEW IF EXISTS v_rag_metadata_quality CASCADE;

CREATE VIEW v_rag_metadata_quality AS
SELECT 
    rag.id AS rag_id,
    rag.metadata->>'execution_id' AS execution_id,
    rag.metadata->>'vault_name' AS vault_name,
    -- 9 维标签完整性扫描
    (CASE WHEN rag.metadata->>'execution_id' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'vault_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'chain_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'asset' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'protocol_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'is_blocked' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'apy_level' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'rebalance_reason' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'created_at' IS NULL THEN 1 ELSE 0 END) AS missing_tags_count,
    -- 完整性百分比计算
    ROUND((9 - (
     CASE WHEN rag.metadata->>'execution_id' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'vault_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'chain_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'asset' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'protocol_name' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'is_blocked' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'apy_level' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'rebalance_reason' IS NULL THEN 1 ELSE 0 END +
     CASE WHEN rag.metadata->>'created_at' IS NULL THEN 1 ELSE 0 END))::NUMERIC / 9 * 100, 2) AS completeness_pct,
    -- 缺失字段明细（便于排查）
    ARRAY_REMOVE(ARRAY[
        CASE WHEN rag.metadata->>'execution_id' IS NULL THEN 'execution_id' END,
        CASE WHEN rag.metadata->>'vault_name' IS NULL THEN 'vault_name' END,
        CASE WHEN rag.metadata->>'chain_name' IS NULL THEN 'chain_name' END,
        CASE WHEN rag.metadata->>'asset' IS NULL THEN 'asset' END,
        CASE WHEN rag.metadata->>'protocol_name' IS NULL THEN 'protocol_name' END,
        CASE WHEN rag.metadata->>'is_blocked' IS NULL THEN 'is_blocked' END,
        CASE WHEN rag.metadata->>'apy_level' IS NULL THEN 'apy_level' END,
        CASE WHEN rag.metadata->>'rebalance_reason' IS NULL THEN 'rebalance_reason' END,
        CASE WHEN rag.metadata->>'created_at' IS NULL THEN 'created_at' END
    ], NULL) AS missing_fields,
    -- 状态标识
    CASE 
        WHEN (9 - (CASE WHEN rag.metadata->>'execution_id' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'vault_name' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'chain_name' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'asset' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'protocol_name' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'is_blocked' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'apy_level' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'rebalance_reason' IS NULL THEN 1 ELSE 0 END + 
                   CASE WHEN rag.metadata->>'created_at' IS NULL THEN 1 ELSE 0 END)) = 9 THEN 'OK'
        ELSE 'INCOMPLETE'
    END AS rag_status,
    -- 时间信息
    (rag.metadata->>'created_at')::TIMESTAMPTZ AS created_at
FROM execution_logs_rag rag;

-- ============================================
-- 2. 决策流审计视图 (关联事实表与决策表)
-- ============================================
-- 功能：将执行状态、TVL 与 Agent 的调仓决策原因强关联
-- 输出：execution_id, vault_name, chain_name, exec_status, total_tvl, rebalance_needed, is_blocked, rebalance_reason, created_at

-- 先删除旧视图（如果存在），避免列顺序/名称冲突
DROP VIEW IF EXISTS v_audit_decision_flow CASCADE;

CREATE VIEW v_audit_decision_flow AS
SELECT 
    e.id AS execution_id,
    e.vault_name,
    -- 链名称（从 allocation_snapshots 或 market_metrics 获取）
    COALESCE(
        (SELECT chain_name FROM allocation_snapshots WHERE execution_id = e.id LIMIT 1),
        (SELECT chain FROM market_metrics WHERE execution_id = e.id LIMIT 1),
        'N/A'
    ) AS chain_name,
    e.status AS exec_status,
    fes.total_tvl,
    rd.rebalance_needed,
    rd.is_blocked,
    rd.rebalance_reason,
    e.created_at
FROM executions e
LEFT JOIN fact_execution_summary fes ON e.id = fes.execution_id
LEFT JOIN rebalance_decisions rd ON e.id = rd.execution_id
WHERE e.vault_name IS NOT NULL 
  AND e.vault_name != ''
  -- 完整的测试环境过滤规则（基于数据质量分析报告）
  AND e.vault_name NOT LIKE '%Test%' 
  AND e.vault_name NOT LIKE '%Debug%'
  AND e.vault_name NOT LIKE '%Error%'
  AND e.vault_name NOT LIKE '%Staging%'
  AND e.vault_name NOT LIKE '%Dev%'
  AND e.vault_name NOT LIKE 'Path_%'
  AND e.vault_name NOT LIKE 'Vault_%'
  AND e.vault_name NOT LIKE 'Vault_Name_%'
  AND e.vault_name NOT LIKE 'Vault_Path_%'
  AND e.vault_name NOT IN ('Omni Vault', 'USDC Vault', 'USDT Vault');

-- ============================================
-- 3. 实时金库看板 (高性能事实表版)
-- ============================================
-- 功能：利用 fact_execution_summary 预计算层实现秒级响应，实时展示金库资产与收益
-- 输出：vault_name, current_tvl, avg_net_apy, last_update, execution_count_24h, success_rate_24h_pct, allocation_breakdown

-- 先删除旧视图（如果存在），避免列顺序/名称冲突
DROP VIEW IF EXISTS v_ops_vault_live_status CASCADE;

CREATE VIEW v_ops_vault_live_status AS
SELECT 
    e.vault_name,
    fes.total_tvl AS current_tvl,
    ROUND(AVG(mm.net_apy), 4) AS avg_net_apy,
    MAX(e.created_at) AS last_update,
    -- 24h 执行统计
    COUNT(DISTINCT CASE WHEN e.created_at >= NOW() - INTERVAL '24 hours' THEN e.id END) AS execution_count_24h,
    COUNT(DISTINCT CASE WHEN e.created_at >= NOW() - INTERVAL '24 hours' AND e.status = 'success' THEN e.id END) AS success_count_24h,
    ROUND(
        COUNT(DISTINCT CASE WHEN e.created_at >= NOW() - INTERVAL '24 hours' AND e.status = 'success' THEN e.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT CASE WHEN e.created_at >= NOW() - INTERVAL '24 hours' THEN e.id END), 0) * 100, 
        2
    ) AS success_rate_24h_pct,
    -- 资产分布（JSONB 格式，便于前端展示）
    jsonb_agg(DISTINCT jsonb_build_object(
        'chain', asn.chain_name, 
        'protocol', asn.protocol_name, 
        'allocated', asn.total_allocated
    )) AS allocation_breakdown
FROM executions e
JOIN fact_execution_summary fes ON e.id = fes.execution_id
LEFT JOIN allocation_snapshots asn ON e.id = asn.execution_id
LEFT JOIN market_metrics mm ON e.id = mm.execution_id
WHERE e.created_at >= NOW() - INTERVAL '24 hours'
  -- 完整的测试环境过滤规则
  AND e.vault_name IS NOT NULL 
  AND e.vault_name != ''
  AND e.vault_name NOT LIKE '%Test%'
  AND e.vault_name NOT LIKE '%Debug%'
  AND e.vault_name NOT LIKE '%Error%'
  AND e.vault_name NOT LIKE '%Staging%'
  AND e.vault_name NOT LIKE '%Dev%'
  AND e.vault_name NOT LIKE 'Path_%'
  AND e.vault_name NOT LIKE 'Vault_%'
  AND e.vault_name NOT LIKE 'Vault_Name_%'
  AND e.vault_name NOT LIKE 'Vault_Path_%'
  AND e.vault_name NOT IN ('Omni Vault', 'USDC Vault', 'USDT Vault')
GROUP BY e.vault_name, fes.total_tvl;

-- ============================================
-- 4. 业绩周报视图 (管理层视角)
-- ============================================
-- 功能：基于事实汇总表进行跨周聚合，展示 TVL 趋势与系统稳定性
-- 输出：vault_name, report_week, total_runs, success_runs, error_runs, success_rate_pct, avg_weekly_tvl, max_weekly_tvl, min_weekly_tvl, rebalance_triggered_count, blocked_count, avg_duration_ms, p95_duration_ms

-- 先删除旧视图（如果存在），避免列顺序/名称冲突
DROP VIEW IF EXISTS v_ops_weekly_report CASCADE;

CREATE VIEW v_ops_weekly_report AS
SELECT 
    e.vault_name,
    DATE_TRUNC('week', e.created_at) AS report_week,
    -- 执行统计
    COUNT(*) AS total_runs,
    COUNT(CASE WHEN e.status = 'success' THEN 1 END) AS success_runs,
    COUNT(CASE WHEN e.status = 'error' THEN 1 END) AS error_runs,
    COUNT(CASE WHEN e.status = 'running' THEN 1 END) AS running_runs,
    -- 成功率
    ROUND(
        COUNT(CASE WHEN e.status = 'success' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS success_rate_pct,
    -- TVL 统计（从 fact_execution_summary 获取）
    ROUND(AVG(fes.total_tvl), 2) AS avg_weekly_tvl,
    ROUND(MAX(fes.total_tvl), 2) AS max_weekly_tvl,
    ROUND(MIN(fes.total_tvl), 2) AS min_weekly_tvl,
    -- 再平衡统计
    COUNT(CASE WHEN rd.rebalance_needed = true THEN 1 END) AS rebalance_triggered_count,
    COUNT(CASE WHEN rd.is_blocked = true THEN 1 END) AS blocked_count,
    -- 执行时长统计
    ROUND(AVG(e.duration_ms), 2) AS avg_duration_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e.duration_ms)::NUMERIC, 2) AS p95_duration_ms,
    -- 时间信息
    MIN(e.created_at) AS week_start,
    MAX(e.created_at) AS week_end,
    COUNT(DISTINCT DATE(e.created_at)) AS active_days
FROM executions e
LEFT JOIN fact_execution_summary fes ON e.id = fes.execution_id
LEFT JOIN rebalance_decisions rd ON e.id = rd.execution_id
WHERE e.created_at >= NOW() - INTERVAL '12 weeks'
  -- 完整的测试环境过滤规则
  AND e.vault_name IS NOT NULL 
  AND e.vault_name != ''
  AND e.vault_name NOT LIKE '%Test%'
  AND e.vault_name NOT LIKE '%Debug%'
  AND e.vault_name NOT LIKE '%Error%'
  AND e.vault_name NOT LIKE '%Staging%'
  AND e.vault_name NOT LIKE '%Dev%'
  AND e.vault_name NOT LIKE 'Path_%'
  AND e.vault_name NOT LIKE 'Vault_%'
  AND e.vault_name NOT LIKE 'Vault_Name_%'
  AND e.vault_name NOT LIKE 'Vault_Path_%'
  AND e.vault_name NOT IN ('Omni Vault', 'USDC Vault', 'USDT Vault')
GROUP BY e.vault_name, DATE_TRUNC('week', e.created_at)
HAVING COUNT(*) > 0;

-- ============================================
-- 5. 运维健康度视图 (Mike 建议新增)
-- ============================================
-- 功能：统计每小时/每天的执行时长和报错率，监控系统性能
-- 输出：time_bucket, day_bucket, vault_name, runs, success_count, errors, success_rate_pct, avg_latency_ms, p95_latency_ms, max_latency_ms, system_load

-- 先删除旧视图（如果存在），避免列顺序/名称冲突
DROP VIEW IF EXISTS v_ops_execution_health CASCADE;

CREATE VIEW v_ops_execution_health AS
SELECT 
    DATE_TRUNC('hour', e.created_at) AS time_bucket,
    DATE_TRUNC('day', e.created_at) AS day_bucket,
    e.vault_name,
    COUNT(*) AS runs,
    COUNT(CASE WHEN e.status = 'success' THEN 1 END) AS success_count,
    COUNT(CASE WHEN e.status = 'error' THEN 1 END) AS errors,
    COUNT(CASE WHEN e.status = 'running' THEN 1 END) AS running_count,
    -- 成功率
    ROUND(
        COUNT(CASE WHEN e.status = 'success' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) AS success_rate_pct,
    -- 执行时长统计
    ROUND(AVG(e.duration_ms), 2) AS avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.duration_ms)::NUMERIC, 2) AS median_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e.duration_ms)::NUMERIC, 2) AS p95_latency_ms,
    MAX(e.duration_ms) AS max_latency_ms,
    -- 系统负载标识（基于 P95 延迟）
    CASE 
        WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e.duration_ms)::NUMERIC < 2000 THEN '🟢 Low'
        WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY e.duration_ms)::NUMERIC < 5000 THEN '🟡 Medium'
        ELSE '🔴 High'
    END AS system_load,
    -- 再平衡统计
    COUNT(DISTINCT CASE WHEN rd.rebalance_needed = true THEN rd.execution_id END) AS rebalance_triggered_count,
    COUNT(DISTINCT CASE WHEN rd.is_blocked = true THEN rd.execution_id END) AS blocked_count
FROM executions e
LEFT JOIN rebalance_decisions rd ON e.id = rd.execution_id
WHERE e.created_at >= NOW() - INTERVAL '7 days'
  -- 完整的测试环境过滤规则
  AND e.vault_name IS NOT NULL 
  AND e.vault_name != ''
  AND e.vault_name NOT LIKE '%Test%'
  AND e.vault_name NOT LIKE '%Debug%'
  AND e.vault_name NOT LIKE '%Error%'
  AND e.vault_name NOT LIKE '%Staging%'
  AND e.vault_name NOT LIKE '%Dev%'
  AND e.vault_name NOT LIKE 'Path_%'
  AND e.vault_name NOT LIKE 'Vault_%'
  AND e.vault_name NOT LIKE 'Vault_Name_%'
  AND e.vault_name NOT LIKE 'Vault_Path_%'
  AND e.vault_name NOT IN ('Omni Vault', 'USDC Vault', 'USDT Vault')
GROUP BY 
    DATE_TRUNC('hour', e.created_at),
    DATE_TRUNC('day', e.created_at),
    e.vault_name;

-- ============================================
-- 部署完成
-- ============================================
-- 所有视图已创建完成，可以开始使用
-- 验证命令：SELECT * FROM v_rag_metadata_quality LIMIT 1;
-- ============================================
```

---

## ✅ 部署验证清单

执行部署脚本后，请验证以下内容：

### 1. 视图创建验证

```sql
-- 检查所有视图是否创建成功
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'v_rag_metadata_quality',
    'v_ops_vault_live_status',
    'v_audit_decision_flow',
    'v_ops_weekly_report',
    'v_ops_execution_health'
  )
ORDER BY table_name;
```

### 2. 数据质量验证

```sql
-- 验证测试环境数据是否已被过滤
SELECT 
    'v_audit_decision_flow' AS view_name,
    COUNT(*) AS total_records,
    COUNT(CASE WHEN vault_name LIKE '%Test%' OR vault_name LIKE '%Staging%' THEN 1 END) AS test_env_count
FROM v_audit_decision_flow;
-- 预期：test_env_count 应该为 0
```

### 3. 功能验证

```sql
-- 验证视图 1：RAG 质量检查
SELECT * FROM v_rag_metadata_quality LIMIT 5;

-- 验证视图 2：实时看板
SELECT * FROM v_ops_vault_live_status;

-- 验证视图 3：决策流
SELECT * FROM v_audit_decision_flow LIMIT 5;

-- 验证视图 4：周报
SELECT * FROM v_ops_weekly_report ORDER BY report_week DESC LIMIT 5;

-- 验证视图 5：运维监控
SELECT * FROM v_ops_execution_health ORDER BY time_bucket DESC LIMIT 5;
```

---

## 📝 使用说明

### 测试环境过滤规则说明

所有视图都使用统一的测试环境过滤规则，过滤以下类型的金库：
- 包含 `Test`, `Debug`, `Error`, `Staging`, `Dev` 的金库名称
- 以 `Path_`, `Vault_`, `Vault_Name_`, `Vault_Path_` 开头的金库名称
- 通用名称：`Omni Vault`, `USDC Vault`, `USDT Vault`

如需调整过滤规则，请修改所有视图的 `WHERE` 子句。

### 性能优化建议

1. **索引建议**：
   ```sql
   -- 为视图查询创建索引
   CREATE INDEX IF NOT EXISTS idx_executions_vault_created 
     ON executions(vault_name, created_at DESC);
   
   CREATE INDEX IF NOT EXISTS idx_executions_status_created 
     ON executions(status, created_at DESC) WHERE status IN ('success', 'error');
   ```

2. **物化视图**（可选）：
   - 如果查询频率高，可以考虑创建物化视图
   - 建议物化：`v_ops_vault_live_status`（每 5 分钟刷新）

---

## 📎 相关文档

- **视图设计方案点评**: `Mike_DatabaseExpert/4.Working/Database/视图设计方案点评_2025-01-30.md`
- **部署脚本审核报告**: `Mike_DatabaseExpert/4.Working/Database/MAXshot核心视图v2.0_部署脚本审核报告_2025-01-30.md`
- **数据质量分析报告**: `Mike_DatabaseExpert/4.Working/Database/MAXshot核心视图资产白皮书_评价与改进建议_2025-01-30.md`

---

**文档版本**: v2.0 (Production Ready)  
**创建时间**: 2025-01-30  
**最后更新**: 2025-01-30  
**维护者**: Mike (Database Expert) & Gemini (Architect)  
**状态**: ✅ 已就绪，可直接部署
