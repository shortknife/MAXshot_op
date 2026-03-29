# DB Schema Snapshot (Supabase)

## tasks_op
Columns:
- id (uuid)
- task_id (text, NOT NULL)
- task_type (text, CHECK: ad_hoc | scheduled | long_running)
- schedule_config (jsonb)
- status (text, CHECK: active | paused | completed | failed)
- created_at (timestamptz)
- updated_at (timestamptz)

Constraints:
- tasks_op_task_type_check: CHECK (task_type IN ['ad_hoc','scheduled','long_running'])
- tasks_op_status_check: CHECK (status IN ['active','paused','completed','failed'])
- task_id NOT NULL

## task_executions_op
(Refer to original DDL in database-setup.sql; kept unchanged. Ensure execution_id, task_id, status, audit_log, payload, confirmation fields exist.)

## agent_memories_op
(Refer to original DDL; append-only. No update/delete.)
