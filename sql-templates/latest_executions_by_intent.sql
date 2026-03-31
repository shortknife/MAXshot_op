SELECT execution_id, status, intent_name, requester_id, created_at
FROM task_executions_op
WHERE intent_name = {{intent_name}}
ORDER BY created_at DESC
LIMIT {{limit}}
