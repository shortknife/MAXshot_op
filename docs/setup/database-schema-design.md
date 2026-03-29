# 数据库表设计 v1.0（MAXshot opencode）

> **创建日期**: 2026-02-05
> **状态**: 📖 初稿
> **表命名约定**: 所有表使用 `_op` 后缀区分本地/云端数据库

---

## 📊 核心表设计

### 1. tasks_op 表（任务表）

**用途**: 存储任务定义（元数据、Schedule、Config）

```sql
CREATE TABLE tasks_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT UNIQUE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('ad_hoc', 'scheduled', 'long_running')),
  schedule_config JSONB,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**索引**:
```sql
CREATE INDEX idx_tasks_op_task_id ON tasks_op(task_id);
CREATE INDEX idx_tasks_op_status ON tasks_op(status);
CREATE INDEX idx_tasks_op_type ON tasks_op(task_type);
```

---

### 2. task_executions_op 表（执行表）

**用途**: 存储执行记录（状态、结果、审计）

```sql
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
```

**索引**:
```sql
CREATE INDEX idx_task_executions_op_execution_id ON task_executions_op(execution_id);
CREATE INDEX idx_task_executions_op_task_id ON task_executions_op(task_id);
CREATE INDEX idx_task_executions_op_status ON task_executions_op(status);
CREATE INDEX idx_task_executions_op_created_at ON task_executions_op(created_at DESC);
```

---

### 3. agent_memories_op 表（记忆表）

**用途**: 存储原子化记忆（Foundation/Experience/Insight）

```sql
CREATE TABLE agent_memories_op (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('foundation', 'experience', 'insight')),
  content TEXT NOT NULL,
  context JSONB,  -- 适用场景标签
  weight DECIMAL(3,2) DEFAULT 0.5,  -- 动态权重
  confidence DECIMAL(3,2),
  source_execution_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**索引**:
```sql
CREATE INDEX idx_agent_memories_op_type ON agent_memories_op(type);
CREATE INDEX idx_agent_memories_op_weight ON agent_memories_op(weight DESC);
CREATE INDEX idx_agent_memories_op_created_at ON agent_memories_op(created_at DESC);
```

---

## 🔒 RLS 策略（基础）

### tasks_op

```sql
-- Authenticated users can view all tasks
CREATE POLICY "Authenticated users can view tasks"
ON tasks_op
FOR SELECT
TO authenticated
USING (true);

-- Service role can insert/update tasks
CREATE POLICY "Service role can manage tasks"
ON tasks_op
FOR ALL
TO service_role
USING (true);
```

### task_executions_op

```sql
-- Authenticated users can view all executions
CREATE POLICY "Authenticated users can view executions"
ON task_executions_op
FOR SELECT
TO authenticated
USING (true);

-- Service role can insert/update executions
CREATE POLICY "Service role can manage executions"
ON task_executions_op
FOR ALL
TO service_role
USING (true);
```

### agent_memories_op

```sql
-- Authenticated users can view all memories
CREATE POLICY "Authenticated users can view memories"
ON agent_memories_op
FOR SELECT
TO authenticated
USING (true);

-- Service role can insert/update memories
CREATE POLICY "Service role can manage memories"
ON agent_memories_op
FOR ALL
TO service_role
USING (true);
```

---

## 📝 DDL 完整脚本（一次性执行）

```sql
-- ========================================
-- MAXshot_opencode Database Schema
-- Version: 1.0
-- Date: 2026-02-05
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

-- ========================================
-- Schema Creation Complete
-- ========================================
```

---

## ✅ 验证清单

- [ ] tasks_op 表创建成功
- [ ] task_executions_op 表创建成功
- [ ] agent_memories_op 表创建成功
- [ ] 所有索引创建成功
- [ ] RLS 策略配置成功
- [ ] 初始 Foundation Memories 插入成功

---

## 📋 下一步

1. 创建 Supabase 新项目
2. 在 SQL Editor 中执行上述 DDL 脚本
3. 验证表结构
4. 配置 RLS 角色（service_role）
5. 获取数据库 URL 和 Anon Key
6. 更新 admin-os/lib/supabase.ts 配置
