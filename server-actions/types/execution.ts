import { Intent } from './capability'

export interface Execution {
  id: string
  execution_id: string
  task_id: string
  status: ExecutionStatus
  payload: ExecutionPayload
  result?: ExecutionResult
  audit_log: AuditLog
  created_at: string
  updated_at: string
}

export enum ExecutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ExecutionPayload {
  raw_query?: string
  intent?: Intent
  slots?: Record<string, unknown>
  user_id?: string
  context?: Record<string, unknown>
}

export interface ExecutionResult {
  capability_outputs: unknown[]
  final_answer: string
  success: boolean
  error?: string
}

export interface AuditLog {
  execution_id: string
  events: AuditEvent[]
  created_at: string
}

export interface AuditEvent {
  timestamp: string
  event_type: string
  data: Record<string, unknown>
}

