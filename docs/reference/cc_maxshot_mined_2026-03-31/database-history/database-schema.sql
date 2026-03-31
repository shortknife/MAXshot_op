-- ============================================================================
-- MAXshot v5.1 核心数据表 Schema DDL
-- ============================================================================
--
-- 依据：
-- - FSD 03.3 Execution Model (不可变快照)
-- - FSD 06.3 §2.4 Session Context
-- - FSD 09.2 Audit Logs
--
-- ============================================================================

-- 1. Sessions_cc 表 - 会话上下文管理
-- ============================================================================
-- 职责：存储用户会话上下文（Session Context Snapshot）
-- 依据：FSD 06.3 §2.4

CREATE TABLE IF NOT EXISTS sessions_cc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_preferred_language TEXT,
    session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    entry_channel TEXT NOT NULL,
    last_intent TEXT,
    last_slots JSONB,
    last_metric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions_cc(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_channel ON sessions_cc(entry_channel);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions_cc(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions_cc(expires_at);

-- ============================================================================
-- 2. Task Executions_cc 表 - 任务执行记录
-- ============================================================================
-- 职责：存储任务执行历史，支持不可变快照（Immutable Snapshot）
-- 依据：FSD 03.3 不可变快照模型

CREATE TABLE IF NOT EXISTS task_executions_cc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    session_id UUID NOT NULL,
    intent_name TEXT NOT NULL,
    intent_slots JSONB NOT NULL DEFAULT '{}'::jsonb,
    capability_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
    working_mind JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'created',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    exit_type TEXT,
    failure_mode TEXT,
    result JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 约束
ALTER TABLE task_executions_cc ADD CONSTRAINT chk_status
    CHECK (status IN ('created', 'pending', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE task_executions_cc ADD CONSTRAINT chk_exit_type
    CHECK (exit_type IN ('completed', 'failed', 'entry_reject', 'rejected', 'timeout'));

-- 外键
ALTER TABLE task_executions_cc
    ADD CONSTRAINT fk_task_executions_entry_id
    FOREIGN KEY (entry_id) REFERENCES sessions_cc(id) ON DELETE CASCADE;

ALTER TABLE task_executions_cc
    ADD CONSTRAINT fk_task_executions_session_id
    FOREIGN KEY (session_id) REFERENCES sessions_cc(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_task_executions_entry_id ON task_executions_cc(entry_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_session_id ON task_executions_cc(session_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions_cc(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_created_at ON task_executions_cc(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_intent_name ON task_executions_cc(intent_name);
CREATE INDEX IF NOT EXISTS idx_task_executions_exit_type ON task_executions_cc(exit_type);

-- ============================================================================
-- 3. Audit Logs_cc 表 - 审计日志
-- ============================================================================
-- 职责：记录所有系统决策点（Entry Gate、Router、Capability、Execution）
-- 依据：FSD 09.2 Audit Logs

CREATE TABLE IF NOT EXISTS audit_logs_cc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    entry_id UUID,
    execution_id UUID,
    audit_level TEXT NOT NULL, -- 'entry', 'gate', 'router', 'capability', 'execution'
    audit_type TEXT NOT NULL, -- e.g., 'intent_analysis', 'gate_check', 'capability_chain_decision'
    audit_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision TEXT NOT NULL, -- 'pass', 'reject', 'confirm'
    decision_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT,
    requester_id TEXT,
    entry_channel TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 外键
ALTER TABLE audit_logs_cc
    ADD CONSTRAINT fk_audit_logs_session_id
    FOREIGN KEY (session_id) REFERENCES sessions_cc(id) ON DELETE CASCADE;

ALTER TABLE audit_logs_cc
    ADD CONSTRAINT fk_audit_logs_entry_id
    FOREIGN KEY (entry_id) REFERENCES sessions_cc(id) ON DELETE CASCADE;

ALTER TABLE audit_logs_cc
    ADD CONSTRAINT fk_audit_logs_execution_id
    FOREIGN KEY (execution_id) REFERENCES task_executions_cc(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs_cc(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entry_id ON audit_logs_cc(entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_execution_id ON audit_logs_cc(execution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_level ON audit_logs_cc(audit_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_type ON audit_logs_cc(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs_cc(created_at DESC);

-- ============================================================================
-- 插入示例数据（测试用）
-- ============================================================================

-- 插入示例会话（测试用）
INSERT INTO sessions_cc (id, user_id, user_preferred_language, entry_channel, session_data, last_intent, created_at)
VALUES (
    gen_random_uuid(),
    'test_user_001',
    'zh-CN',
    'tg_bot',
    '{"recent_tasks": [], "recent_messages": [], "derived_state": {"last_intent": null, "last_slots": {}, "last_metric": null}}'::jsonb,
    NULL,
    NULL,
    'zh-CN',
    now()
);

-- ============================================================================
-- 版本控制
-- ============================================================================
-- Schema Version: 1.0
-- Created: 2026-03-15
-- Author: Claude Code
-- Last Updated: 2026-03-15
-- ============================================================================
