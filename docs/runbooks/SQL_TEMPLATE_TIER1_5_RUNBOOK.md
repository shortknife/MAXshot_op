# SQL Template Tier 1.5 Runbook

## Purpose
Run and validate SQL templates (read-only) with full audit chain.

## Start Dev Server
```bash
cd /Users/alexzheng/Documents/JOB/AI_Project/MAXshot_opencode/admin-os
NEXT_DISABLE_TURBOPACK=1 NEXT_PUBLIC_READ_ONLY_DEMO=false NEXT_PUBLIC_WRITE_ENABLE=true PORT=3003 npm run dev
```

## Create Execution (Template Mode)
1. Open `/ops`
2. Check “Use SQL Template (Read-only)”
3. Select template `latest_executions`
4. Click Example 1 (fills `{"limit": 3}`)
5. Fill `operator_id` and `confirm_token`
6. Confirm checkbox → Create Execution

## Confirm
Open `/confirmations`, confirm the new execution.

## Run
```bash
curl -X POST http://localhost:3003/api/execution/run   -H 'Content-Type: application/json'   -d '{
    "execution_id":"<exec_id>",
    "operator_id":"admin",
    "confirm_token":"test123"
  }'
```

## Audit Verification
Open `/audit?exec_id=<exec_id>` and confirm:
- sql_template_requested
- sql_template_rendered
- sql_template_executed

## Notes
- RPC `sql_template_query` must exist and be read-only.

## Milestone 3 Intent Coverage Tests

Test each intent via /ops (template mode) and run full chain.
- ops_summary → execution_status_breakdown (days=7)
- audit_query → latest_audit_events (limit=20)
- memory_query → memory_recent_insights (limit=10)
- content_brief → content_generator (requires topic)
- product_qna → product_doc_qna (doc_path optional)
