# Database Setup Instructions

> **Purpose**: Manual steps to set up Supabase database for MAXshot_opencode
> **DDL Script**: `database-setup.sql`

---

## Quick Start (5 minutes)

### Step 1: Create Supabase Project

1. Visit https://supabase.com/dashboard
2. Click "New Project"
3. Project name: `MAXshot-opencode`
4. Database password: (set your password)
5. Region: Choose nearest (e.g., East Asia)
6. Click "Create new project" and wait ~2 minutes

### Step 2: Execute DDL Script

1. In Supabase Dashboard, go to **SQL Editor** (left menu)
2. Click **New Query**
3. Copy the entire content of `database-setup.sql` (110 lines)
4. Paste into the SQL Editor
5. Click **Run** (bottom right)
6. Wait for "Success" message

### Step 3: Get Database Credentials

1. Go to **Project Settings** (gear icon, left menu)
2. Click **API** (submenu)
3. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **service_role** secret (NOT anon key - scroll down)

### Step 4: Update Environment Variables

Edit `admin-os/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-SECRET-HERE
```

### Step 5: Test Connection

Run from project root:

```bash
cd admin-os
npx tsx lib/supabase-test.ts
```

Expected output:

```
🧪 Starting Supabase tests...

✅ Supabase connection successful
✅ Found 4 Foundation Memories (expected 4)

==================================================
✅ All tests passed!
```

---

## What the DDL Script Creates

### Tables (3)

| Table | Purpose |
|-------|---------|
| `tasks_op` | Task definitions (metadata, schedule, status) |
| `task_executions_op` | Execution records (status, result, audit) |
| `agent_memories_op` | Atomic memories (Foundation/Experience/Insight) |

### Indexes (9)

All tables have indexes on:
- Primary keys
- Foreign keys
- Status fields
- Created timestamps (descending)

### RLS Policies (6)

**authenticated role**:
- SELECT on all 3 tables

**service_role**:
- ALL operations on all 3 tables

### Foundation Memories (4)

1. "Router = 确定性调度器，LLM = 不可信建议源"
2. "Task 与 Execution 强制分离架构"
3. "Session Context 不跨 Turn 隐式演化"
4. "所有决策必须可审计、可回放"

---

## Troubleshooting

### Connection Fails

**Error**: `Missing Supabase environment variables`

**Solution**: Check `admin-os/.env.local` - ensure both URL and KEY are set.

**Error**: `Invalid API key`

**Solution**: Ensure you're using `service_role` key, not `anon` key.

### Test Fails: "Found 0 Foundation Memories"

**Cause**: DDL script didn't complete

**Solution**: Re-run DDL script in SQL Editor

### Table Not Found

**Error**: `relation "tasks_op" does not exist`

**Cause**: DDL script failed or wasn't run

**Solution**: Check SQL Editor output for errors, fix, re-run

---

## Next Steps After Database Setup

Once tests pass, continue with:

**Phase 2**: Router Layer (Next.js Server Actions)
- Task Decomposition
- Memory Ref Selection
- Capability Scheduling
- Audit Logging

See: `DEVELOPMENT_PLAN.md` → Phase 2
