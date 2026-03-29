-- ========================================
-- MAXshot_opencode Database Schema
-- Version: 1.0
-- Date: 2026-02-05
-- Purpose: Simple DDL for Supabase SQL Editor
-- ========================================

-- Drop existing tables (if any)
DROP TABLE IF EXISTS task_executions_op CASCADE;
DROP TABLE IF EXISTS tasks_op CASCADE;
DROP TABLE IF EXISTS agent_memories_op CASCADE;

-- Create tasks_op table
CREATE TABLE tasks_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('ad_hoc', 'scheduled', 'long_running')),
  schedule_config JSONB,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_executions_op table
CREATE TABLE task_executions_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT UNIQUE NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks_op(task_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  payload JSONB,
  result JSONB,
  audit_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_memories_op table
CREATE TABLE agent_memories_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('foundation', 'experience', 'insight')),
  content TEXT NOT NULL,
  context JSONB,
  weight DECIMAL(3,2) DEFAULT 0.5,
  confidence DECIMAL(3,2),
  source_execution_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tasks_op_task_id ON tasks_op(task_id);
CREATE INDEX idx_tasks_op_status ON tasks_op(status);
CREATE INDEX idx_tasks_op_type ON tasks_op(task_type);
CREATE INDEX idx_task_executions_op_execution_id ON task_executions_op(execution_id);
CREATE INDEX idx_task_executions_op_task_id ON task_executions_op(task_id);
CREATE INDEX idx_task_executions_op_status ON task_executions_op(status);
CREATE INDEX idx_task_executions_op_created_at ON task_executions_op(created_at DESC);
CREATE INDEX idx_agent_memories_op_type ON agent_memories_op(type);
CREATE INDEX idx_agent_memories_op_weight ON agent_memories_op(weight DESC);
CREATE INDEX idx_agent_memories_op_created_at ON agent_memories_op(created_at DESC);

-- Enable RLS
ALTER TABLE tasks_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories_op ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks_op
CREATE POLICY "Authenticated users can view tasks"
ON tasks_op
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage tasks"
ON tasks_op
FOR ALL
TO service_role
USING (true);

-- RLS Policies for task_executions_op
CREATE POLICY "Authenticated users can view executions"
ON task_executions_op
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage executions"
ON task_executions_op
FOR ALL
TO service_role
USING (true);

-- RLS Policies for agent_memories_op
CREATE POLICY "Authenticated users can view memories"
ON agent_memories_op
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage memories"
ON agent_memories_op
FOR ALL
TO service_role
USING (true);

-- Insert initial Foundation Memories
INSERT INTO agent_memories_op (type, content, weight, confidence) VALUES
  ('foundation', 'Router = 确定性调度器，LLM = 不可信建议源', 1.0, 1.0),
  ('foundation', 'Task 与 Execution 强制分离架构', 1.0, 1.0),
  ('foundation', 'Session Context 不跨 Turn 隐式演化', 1.0, 1.0),
  ('foundation', '所有决策必须可审计、可回放', 1.0, 1.0);
