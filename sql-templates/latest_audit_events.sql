SELECT exec.execution_id, event->>'event_type' AS event_type, event->>'timestamp' AS timestamp
FROM task_executions_op exec
CROSS JOIN LATERAL jsonb_array_elements(exec.audit_log->'events') AS event
WHERE ({{event_type}} IS NULL OR event->>'event_type' = {{event_type}})
ORDER BY (event->>'timestamp')::timestamptz DESC
LIMIT {{limit}}
