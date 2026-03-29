SELECT execution_id, intent_name, requester_id, created_at
FROM task_executions_op
WHERE status = 'pending_confirmation'
ORDER BY created_at DESC
LIMIT {{limit}} OFFSET {{offset}}
