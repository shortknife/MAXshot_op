import { AuditEvent } from '../types'

export type MemoryTypeValue = 'foundation' | 'experience' | 'insight'

const ALLOWED_MEMORY_TYPES: MemoryTypeValue[] = ['foundation', 'experience', 'insight']

export function isValidMemoryType(value: string): value is MemoryTypeValue {
  return ALLOWED_MEMORY_TYPES.includes(value as MemoryTypeValue)
}

export function buildWritebackEvents(input: {
  execution_id: string
  memory_type: MemoryTypeValue
  operator_id: string
}): AuditEvent[] {
  const base = {
    execution_id: input.execution_id,
    memory_type: input.memory_type,
    operator_id: input.operator_id,
  }
  const now = new Date().toISOString()
  return [
    { timestamp: now, event_type: 'memory_writeback_requested', data: base },
    { timestamp: now, event_type: 'memory_writeback_approved', data: base },
    { timestamp: now, event_type: 'memory_writeback_written', data: base },
  ]
}

export function buildMemoryInsert(input: {
  memory_type: MemoryTypeValue
  content: string
  source_execution_id: string
  context?: Record<string, unknown>
  weight?: number
  confidence?: number | null
}) {
  return {
    type: input.memory_type,
    content: input.content,
    context: input.context || {},
    weight: input.weight ?? 0.5,
    confidence: input.confidence ?? null,
    source_execution_id: input.source_execution_id,
  }
}
