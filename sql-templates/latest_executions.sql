SELECT execution_id, status, intent_name, requester_id, created_at, updated_at
FROM task_executions_op
ORDER BY created_at DESC
LIMIT {{limit}}
