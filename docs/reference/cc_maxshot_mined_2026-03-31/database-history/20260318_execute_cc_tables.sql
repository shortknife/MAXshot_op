-- =====================================================
-- CC 新建表 DDL（sessions + audit_logs）- 最终修复版
-- =====================================================
-- 生成日期: 2026-03-18
-- 版本: v4.0（从原始 DDL 重新提取，修复 timestamp → created_at）
-- 执行方式: Supabase SQL Editor 手动执行
-- =====================================================

-- =====================================================
-- Part 1: sessions 表
-- =====================================================

-- 删除已存在的 sessions 表
DROP TABLE IF EXISTS sessions CASCADE;

-- 创建 sessions 表
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE,
  requester_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('raw_query', 'structured', 'timeline')),
  entry_channel TEXT NOT NULL CHECK (entry_channel IN ('telegram', 'admin_os', 'notion', 'system')),
  title TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- 创建 audit_logs 表（timestamp 改为 created_at，避免保留字冲突）
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  reason TEXT,
  failure_mode TEXT,
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
