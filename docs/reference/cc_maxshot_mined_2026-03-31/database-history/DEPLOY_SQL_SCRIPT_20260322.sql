-- =====================================================
-- 生产环境部署 SQL 脚本
-- =====================================================
-- 创建时间: 2026-03-22
-- 目的: Phase 8 + Phase 9 生产环境部署
-- 预计执行时间: 10 分钟
-- =====================================================
-- ⚠️ 重要提示：
-- 1. 在 Supabase SQL Editor 中按顺序执行
-- 2. 每个部分执行后检查结果
-- 3. 如有错误，请记录并停止执行
-- =====================================================

-- =====================================================
-- Part 1: 检查现有表状态
-- =====================================================

-- 检查所有关键表
SELECT
  table_name,
  table_type,
  CASE
    WHEN table_name IN ('allocation_snapshots', 'market_metrics', 'rebalance_decisions', 'vault_configs')
    THEN '✅ 业务表'
    WHEN table_name IN ('sessions_cc', 'audit_logs_cc')
    THEN '🔧 CC 系统表'
    ELSE '❓ 其他表'
  END AS table_category
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'allocation_snapshots',
    'market_metrics',
    'rebalance_decisions',
    'vault_configs',
    'sessions_cc',
    'audit_logs_cc'
  )
ORDER BY table_category, table_name;

-- =====================================================
-- Part 2: 创建 CC 系统表（如果不存在）
-- =====================================================

-- 2.1 创建 sessions_cc 表
CREATE TABLE IF NOT EXISTS sessions_cc (
  session_id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  entry_channel TEXT NOT NULL,
  raw_query TEXT NOT NULL,
  intent_name TEXT,
  extracted_slots JSONB,
  capability_chain TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE sessions_cc IS 'CC 会话记录表（Phase 8）';

-- 2.2 创建 audit_logs_cc 表（修正列名：executionId）
CREATE TABLE IF NOT EXISTS audit_logs_cc (
  log_id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions_cc(session_id) ON DELETE CASCADE,
  executionId TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  component TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE audit_logs_cc IS 'CC 审计日志表（Phase 8）';

-- =====================================================
-- Part 3: 验证 CC 系统表已创建
-- =====================================================

SELECT 'sessions_cc' AS table_name, COUNT(*) AS row_count FROM sessions_cc
UNION ALL
SELECT 'audit_logs_cc', COUNT(*) FROM audit_logs_cc;

-- =====================================================
-- Part 4: 创建时间索引（Phase 9）
-- =====================================================

-- 4.1 allocation_snapshots 表索引
DROP INDEX IF EXISTS idx_allocation_snapshots_created_at CASCADE;

CREATE INDEX idx_allocation_snapshots_created_at
  ON allocation_snapshots(created_at DESC);

COMMENT ON INDEX idx_allocation_snapshots_created_at IS '时间范围查询索引（Phase 9）';

-- 4.2 market_metrics 表索引
DROP INDEX IF EXISTS idx_market_metrics_created_at CASCADE;

CREATE INDEX idx_market_metrics_created_at
  ON market_metrics(created_at DESC);

COMMENT ON INDEX idx_market_metrics_created_at IS '时间范围查询索引（Phase 9）';

-- 4.3 rebalance_decisions 表索引
DROP INDEX IF EXISTS idx_rebalance_decisions_decision_timestamp CASCADE;

CREATE INDEX idx_rebalance_decisions_decision_timestamp
  ON rebalance_decisions(decision_timestamp DESC);

COMMENT ON INDEX idx_rebalance_decisions_decision_timestamp IS '时间范围查询索引（Phase 9）';

-- =====================================================
-- Part 5: 验证索引创建
-- =====================================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%created_at%'
    OR indexname LIKE '%decision_timestamp%'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- Part 6: 检查业务表数据量
-- =====================================================

SELECT
  'allocation_snapshots' AS table_name,
  COUNT(*) AS row_count,
  MIN(created_at) AS earliest_data,
  MAX(created_at) AS latest_data
FROM allocation_snapshots
UNION ALL
SELECT
  'market_metrics',
  COUNT(*),
  MIN(created_at),
  MAX(created_at)
FROM market_metrics
UNION ALL
SELECT
  'rebalance_decisions',
  COUNT(*),
  MIN(decision_timestamp),
  MAX(decision_timestamp)
FROM rebalance_decisions
UNION ALL
SELECT
  'vault_configs',
  COUNT(*),
  NULL::timestamp,
  NULL::timestamp
FROM vault_configs
ORDER BY table_name;

-- =====================================================
-- Part 7: 性能测试（可选）
-- =====================================================

-- 7.1 测试 allocation_snapshots 查询性能
EXPLAIN ANALYZE
SELECT *
FROM allocation_snapshots
WHERE created_at >= NOW() - INTERVAL '7 days'
LIMIT 100;

-- 7.2 测试 market_metrics 查询性能
EXPLAIN ANALYZE
SELECT *
FROM market_metrics
WHERE created_at >= NOW() - INTERVAL '1 day'
LIMIT 100;

-- 7.3 测试 rebalance_decisions 查询性能
EXPLAIN ANALYZE
SELECT *
FROM rebalance_decisions
WHERE decision_timestamp >= NOW() - INTERVAL '7 days'
LIMIT 100;

-- =====================================================
-- 执行完成
-- =====================================================
-- 预期结果：
-- ✅ sessions_cc 和 audit_logs_cc 表已创建
-- ✅ 3 个时间索引已创建
-- ✅ 业务表数据充足（70万+ allocation，50万+ market）
-- ✅ 查询性能 < 100ms（简单查询）
-- =====================================================
