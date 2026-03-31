SELECT count(*)::int AS count
FROM task_executions_op
WHERE status = {{status}}
