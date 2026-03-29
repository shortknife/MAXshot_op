export enum ExecutionStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  CONFIRMED = 'confirmed',
  EXECUTING = 'executing',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type Execution = {
  execution_id: string
  task_id: string
  status: ExecutionStatus | string
  payload?: {
    intent?: { type: string; extracted_slots: Record<string, unknown> }
    slots?: Record<string, unknown>
    context?: Record<string, unknown>
  }
  result?: unknown
  created_at?: string
  updated_at?: string
}
