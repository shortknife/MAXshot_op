SELECT status, count(*)::int AS count
FROM task_executions_op
WHERE created_at >= NOW() - ({{days}} || ' days')::interval
GROUP BY status
ORDER BY count DESC
