# Milestone 1 — Runbook & Changes (2026-02-15)

## Purpose
Quick reference for running and validating SQL Template Engine Tier 1.

## Runtime Requirements
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `WRITE_CONFIRM_TOKEN`

## Supabase (one-time)
Create read-only RPC for template execution:
```sql
create or replace function public.sql_template_query(
  sql text,
  params text[] default '{}'
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
-- see latest runbook in chat history; keep read-only guard
$$;

revoke all on function public.sql_template_query(text, text[]) from public;
grant execute on function public.sql_template_query(text, text[]) to service_role;

notify pgrst, 'reload schema';
```

## Template Locations
- `admin-os/sql-templates/execution_count_by_status.sql`
- `admin-os/sql-templates/execution_count_by_status.json`
- `admin-os/sql-templates/latest_executions.sql`
- `admin-os/sql-templates/latest_executions.json`

## Key Implementation Changes
- `admin-os/lib/sql-templates/*` (loader, renderer, guard, types)
- `server-actions/capabilities/data-fact-query.ts` (template path)
- `server-actions/router/router-main.ts` (audit events for templates)
- `admin-os/app/api/sql-templates/list/route.ts`
- `admin-os/app/ops/page.tsx` (template UI)

## Dev Start
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
NEXT_DISABLE_TURBOPACK=1 NEXT_PUBLIC_READ_ONLY_DEMO=false NEXT_PUBLIC_WRITE_ENABLE=true PORT=3003 npm run dev
```

## Validation Steps
1. Open `/ops`
2. Check "Use SQL Template (Read-only)"
3. Select `latest_executions`
4. `template_slots`:
   ```json
   {"limit": 3}
   ```
5. Create execution → Confirm → Run
6. Verify `/audit` shows:
   - `sql_template_requested`
   - `sql_template_rendered`
   - `sql_template_executed`

## Known Issues / Notes
- Avoid external `server-actions` imports inside `admin-os` routes.
- Use local `admin-os/lib/*` wrappers for Router/capabilities.
