SELECT id, content, weight, created_at
FROM agent_memories_op
WHERE type = 'insight'
ORDER BY created_at DESC
LIMIT {{limit}}
