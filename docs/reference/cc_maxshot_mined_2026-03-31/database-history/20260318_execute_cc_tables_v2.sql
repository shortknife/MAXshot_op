-- =====================================================
-- CC 新建表 DDL（sessions + audit_logs）- 清理版本
-- =====================================================
-- 生成日期: 2026-03-18
-- 版本: v2.0（修复 timestamp 保留字问题）
-- 执行方式: Supabase SQL Editor 手动执行
-- =====================================================

-- =====================================================
-- Part 1: sessions 表
-- =====================================================

-- 删除已存在的 sessions 表
DROP TABLE IF EXISTS sessions CASCADE;

-- 创建 sessions 表
CREATE TABLE sessions (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session 唯一标识
  session_id TEXT UNIQUE,

  -- 业务字段
  requester_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('raw_query', 'structured', 'timeline')),
  entry_channel TEXT NOT NULL CHECK (entry_channel IN ('telegram', 'admin_os', 'notion', 'system')),

  -- 可选字段
  title TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 审计字段
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 约束
  CONSTRAINT sessions_requester_id_not_null
    CHECK (
      (requester_id IS NOT NULL) OR
      (entry_type IN ('raw_query', 'structured', 'timeline'))
    ),
  CONSTRAINT sessions_entry_channel_not_null
    CHECK (
      (entry_channel IN ('telegram', 'admin_os', 'notion', 'system')) OR
      (entry_type IN ('raw_query', 'structured', 'timeline'))
    )
);

-- sessions 表索引
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_requester_id ON sessions(requester_id);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_type_created ON sessions(entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_channel_created ON sessions(entry_channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_context ON sessions USING GIN (context);
CREATE INDEX IF NOT EXISTS idx_sessions_metadata ON sessions USING GIN (metadata);

-- =====================================================
-- Part 2: audit_logs 表
-- =====================================================

-- 删除已存在的 audit_logs 表
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 创建 audit_logs 表
CREATE TABLE audit_logs (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 核心字段
  execution_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,

  -- 可选字段
  reason TEXT,
  failure_mode TEXT,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 约束
  CONSTRAINT audit_logs_execution_id_not_null
    CHECK (execution_id IS NOT NULL),
  CONSTRAINT audit_logs_decision_valid
    CHECK (decision IN ('confirm', 'reject', 'expire', 'complete', 'gate_pass', 'gate_reject', 'sealer_pass', 'capability_success', 'capability_failed', 'entry_reject', 'soul_reject', 'continue_chat', 'pending_request', 'confirmation_request', 'confirmation_result', 'evolution_recommend'))
);

-- audit_logs 表索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_id ON audit_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_created_at ON audit_logs(execution_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision ON audit_logs(decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_actor ON audit_logs(execution_id, actor);

-- =====================================================
-- 表注释
-- =====================================================

-- sessions 表注释
COMMENT ON TABLE sessions IS '会话 Session 表，记录同一用户、同一通道、一定时间窗口内的请求序列（CC 新建）';
COMMENT ON COLUMN sessions.id IS '主键，UUID 类型';
COMMENT ON COLUMN sessions.session_id IS 'Session 唯一标识，格式：{entry_channel}_{requester_id}_{YYYY-MM-DD}，未传则由后端生成';
COMMENT ON COLUMN sessions.requester_id IS '用户标识，关联业务数据或审计记录';
COMMENT ON COLUMN sessions.entry_type IS '入口类型：raw_query=自然语言查询、structured=结构化请求、timeline=时间线任务';
COMMENT ON COLUMN sessions.entry_channel IS '入口通道：telegram=Bot、admin_os=管理后台、notion=Notion、system=系统';
COMMENT ON COLUMN sessions.title IS '会话标题（可选）';
COMMENT ON COLUMN sessions.context IS '会话上下文（JSON 格式）';
COMMENT ON COLUMN sessions.metadata IS '会话元数据（JSON 格式）';
COMMENT ON COLUMN sessions.created_at IS '会话创建时间';
COMMENT ON COLUMN sessions.updated_at IS '会话更新时间';
COMMENT ON INDEX idx_sessions_session_id IS '主查询索引，支持通过 session_id 快速查询完整 session 历史';
COMMENT ON INDEX idx_sessions_requester_id IS '用户查询索引，支持查询某用户的所有 session';
COMMENT ON INDEX idx_sessions_entry_type_created IS '类型时间查询索引，支持查询特定类型在特定时间范围的 session';
COMMENT ON INDEX idx_sessions_entry_channel_created IS '通道时间查询索引，支持查询特定通道在特定时间范围的 session';
COMMENT ON INDEX idx_sessions_created IS '时间范围查询索引，支持按时间范围查询所有 session';
COMMENT ON INDEX idx_sessions_context IS 'JSON 查询索引，支持 context 字段的 JSON 查询';
COMMENT ON INDEX idx_sessions_metadata IS '元数据查询索引，支持 metadata 字段的 JSON 查询';

-- audit_logs 表注释
COMMENT ON TABLE audit_logs IS '审计日志表，记录所有决策、拒绝、确认操作（CC 新建）';
COMMENT ON COLUMN audit_logs.id IS '主键，UUID 类型';
COMMENT ON COLUMN audit_logs.execution_id IS '关联的执行 ID，贯穿整个 Execution 生命周期';
COMMENT ON COLUMN audit_logs.decision IS '决策类型：confirm=确认、reject=拒绝、expire=过期、complete=完成、gate_pass=网关通过、gate_reject=网关拒绝、sealer_pass=封印通过、capability_success=能力执行成功、capability_failed=能力执行失败、entry_reject=入口拒绝、soul_reject=灵魂拒绝、continue_chat=继续对话、pending_request=待确认请求、confirmation_request=确认请求、confirmation_result=确认结果、evolution_recommend=进化建议';
COMMENT ON COLUMN audit_logs.created_at IS '决策时间';
COMMENT ON COLUMN audit_logs.actor IS '决策者：admin=user、system=系统';
COMMENT ON COLUMN audit_logs.reason IS '决策原因（可选）';
COMMENT ON COLUMN audit_logs.failure_mode IS '失败模式（可选）';
COMMENT ON COLUMN audit_logs.recommendations IS '进化建议（仅在采纳时）';
COMMENT ON COLUMN audit_logs.metadata IS '扩展数据（JSON 格式）';
COMMENT ON INDEX idx_audit_logs_execution_id IS '主查询索引，支持通过 execution_id 快速查询完整审计链';
COMMENT ON INDEX idx_audit_logs_execution_created_at IS '时间决策查询索引，支持按时间和决策查询 execution 相关审计';
COMMENT ON INDEX idx_audit_logs_decision IS '决策类型索引，支持统计特定决策类型的数量';
COMMENT ON INDEX idx_audit_logs_actor IS '决策者索引，支持查询特定用户的审计记录';
COMMENT ON INDEX idx_audit_logs_created_at IS '时间范围查询索引，支持按时间范围查询所有审计记录';
COMMENT ON INDEX idx_audit_logs_execution_actor IS '用户决策查询索引，支持查询某用户的所有决策记录';

-- =====================================================
-- 验证查询
-- =====================================================

-- 验证表是否创建成功
SELECT
  'sessions' AS table_name,
  COUNT(*) AS row_count
FROM sessions
UNION ALL
SELECT
  'audit_logs' AS table_name,
  COUNT(*) AS row_count
FROM audit_logs;

-- =====================================================
-- 回滚脚本（如需删除表）
-- =====================================================
/*
-- 删除索引
DROP INDEX IF EXISTS idx_sessions_session_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_requester_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_entry_type_created CASCADE;
DROP INDEX IF EXISTS idx_sessions_entry_channel_created CASCADE;
DROP INDEX IF EXISTS idx_sessions_created CASCADE;
DROP INDEX IF EXISTS idx_sessions_context CASCADE;
DROP INDEX IF EXISTS idx_sessions_metadata CASCADE;

DROP INDEX IF EXISTS idx_audit_logs_execution_id CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_execution_created_at CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_decision CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_actor CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_created_at CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_execution_actor CASCADE;

-- 删除表
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
*/
