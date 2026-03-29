# Supabase 操作指南

> **创建日期**: 2026-02-05  
> **目的**: 手动创建 Supabase 项目并配置数据库（无需 skill）

---

## 🎯 目标

创建 Supabase 新项目（MAXshot-opencode），配置数据库表结构（使用 _op 后缀）。

---

## 📋 步骤 1：创建 Supabase 新项目

### 1.1 登录 Supabase Dashboard

1. 访问：https://supabase.com/dashboard
2. 登录你的账号

### 1.2 创建新项目

1. 点击 "New Project"
2. 项目名称：`MAXshot-opencode`
3. 数据库密码：（自己设置）
4. 区域：选择最近的区域（推荐 East Asia）

---

## 📋 步骤 2：执行 DDL 脚本

### 2.1 打开 SQL Editor

1. 在 Supabase Dashboard 中，左侧菜单选择 "SQL Editor"
2. 创建新查询窗口

### 2.2 执行 database-schema-design.md 中的 DDL

1. 打开 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/database-schema-design.md`
2. 复制完整 DDL 部分（从 `-- ========================================` 到结尾）
3. 粘贴到 SQL Editor 中
4. 点击 "Run" 执行

**注意**：
- ✅ 确认 3 个表创建成功：`tasks_op`, `task_executions_op`, `agent_memories_op`
- ✅ 确认所有索引创建成功
- ✅ 确认 RLS 策略配置成功

---

## 📋 步骤 3：配置 RLS 策略

### 3.1 访问 Authentication > Policies

1. 在 Supabase Dashboard 中
2. 确认以下策略已配置：

#### tasks_op 表

```sql
-- Authenticated users can view tasks
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

#### task_executions_op 表

```sql
-- Authenticated users can view executions
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

#### agent_memories_op 表

```sql
-- Authenticated users can view memories
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

## 📋 步骤 4：初始化 Foundation Memories

### 4.1 执行初始化 SQL

在 SQL Editor 中执行：

```sql
-- Insert initial Foundation Memories
INSERT INTO agent_memories_op (type, content, weight, confidence) VALUES
  ('foundation', 'Router = 确定性调度器，LLM = 不可信建议源', 1.0, 1.0),
  ('foundation', 'Task 与 Execution 强制分离架构', 1.0, 1.0),
  ('foundation', 'Session Context 不跨 Turn 隐式演化', 1.0, 1.0),
  ('foundation', '所有决策必须可审计、可回放', 1.0, 1.0);
```

验证输出：
- ✅ 4 条 Foundation Memories 插入成功

---

## 📋 步骤 5：获取数据库配置信息

### 5.1 获取 Project URL

1. 在 Supabase Dashboard 的 Project Settings 页面
2. 找到 "Project URL"
3. 复制（格式：`https://[project-ref].supabase.co`）

### 5.2 获取 Anon Key

1. 在 Settings > API 页面
2. 找到 "anon public" Key
3. 复制（格式：`eyJhb...` 开头的长字符串）

### 5.3 配置 .env.local

在 `/Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os/.env.local` 中添加：

```env
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[anon-key]"
```

---

## 📋 步骤 6：验证配置

### 6.1 创建测试脚本

在 `admin-os/lib/supabase-test.ts` 中创建：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection
async function testConnection() {
  const { data, error } = await supabase.from('tasks_op').select('*').limit(1)
  if (error) {
    console.error('Connection failed:', error)
    return false
  }
  console.log('✅ Supabase connection successful')
  return true
}

// Test Foundation Memories
async function testFoundationMemories() {
  const { data, error } = await supabase.from('agent_memories_op').select('*').eq('type', 'foundation')
  if (error) {
    console.error('Foundation Memories test failed:', error)
    return false
  }
  console.log(`✅ Found ${data.length} Foundation Memories`)
  return true
}

testConnection()
  .then(() => testFoundationMemories())
  .catch(console.error)
```

运行测试：

```bash
cd admin-os
npm run dev
# 访问 http://localhost:3000/api/test-supabase
```

---

## ✅ 验收清单

- [ ] Supabase 新项目创建成功
- [ ] 3 个表创建成功：tasks_op, task_executions_op, agent_memories_op
- [ ] RLS 策略配置正确
- [ ] Foundation Memories 插入成功（4 条）
- [ ] Project URL 获取
- [ ] Anon Key 获取
- [ ] admin-os/.env.local 配置完成
- [ ] 测试脚本创建并运行成功

---

## 📝 项目配置信息

**执行后填写**：

```
Project URL: _________________
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6Iml... (长字符串)
```

---

## 🔄 下一步

配置完成后：

1. 更新 `admin-os/lib/supabase.ts` 使用新的配置
2. 更新 `DEVELOPMENT_PLAN.md` Phase 1 状态
3. 开始 Phase 2：Router 层开发（Next.js Server Actions）
