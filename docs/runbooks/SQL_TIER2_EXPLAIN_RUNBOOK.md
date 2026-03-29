# SQL Tier 2 EXPLAIN Runbook

## Goal
Add EXPLAIN precheck before executing SQL templates, without LLM.

## Supabase RPC (manual)
Run in Supabase SQL Editor:

```sql
-- EXPLAIN RPC (read-only)
create or replace function public.sql_template_explain(
  sql text,
  params text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q text;
  cleaned text;
  plan jsonb;
begin
  if sql is null or length(trim(sql)) = 0 then
    raise exception 'empty_sql';
  end if;

  cleaned := regexp_replace(sql, '^﻿', '', 'g');
  cleaned := ltrim(cleaned);
  cleaned := regexp_replace(cleaned, '^(\s*--.*
)+', '', 'g');
  cleaned := regexp_replace(cleaned, '^\s*/\*.*?\*/\s*', '', 'gs');
  cleaned := ltrim(cleaned);

  if cleaned ~* ';' then
    raise exception 'sql_multi_statement';
  end if;
  if cleaned ~* '\b(insert|update|delete|alter|drop|truncate|create|grant|revoke|vacuum|analyze|copy)\b' then
    raise exception 'sql_contains_write';
  end if;

  q := cleaned;
  if array_length(params, 1) is not null then
    for i in 1..array_length(params, 1) loop
      q := replace(q, '$' || i, quote_literal(params[i]));
    end loop;
  end if;

  execute format('EXPLAIN (FORMAT JSON) %s', q) into plan;
  return plan;
end;
$$;

revoke all on function public.sql_template_explain(text, text[]) from public;
grant execute on function public.sql_template_explain(text, text[]) to service_role;

notify pgrst, 'reload schema';
```

## App Behavior
- Before `sql_template_query`, the app calls `sql_template_explain`
- If `Total Cost > 100000`, request is rejected
- Audit events emitted:
  - `sql_template_explain_requested`
  - `sql_template_explain_rejected`

## Test
1) Run template with normal slots → should pass
2) Run heavy template (large limit) → should reject with explain_cost_exceeded
