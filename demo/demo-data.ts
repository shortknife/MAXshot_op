import demoExecutionsRaw from './demo-executions.json'

export type DemoExecution = {
  execution_id: string
  task_id: string
  entry_type: string
  requester_id: string
  intent_name: string
  payload: Record<string, unknown>
  reason_for_pending: string | null
  confirmation_request: Record<string, unknown> | null
  confirmation_result: Record<string, unknown> | null
  status: string
  audit_log: {
    execution_id: string
    created_at: string
    events: Array<{
      timestamp?: string
      event_type?: string
      data?: Record<string, unknown>
    }>
  }
  idempotency_key: string | null
  result: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export const READ_ONLY_DEMO = process.env.NEXT_PUBLIC_READ_ONLY_DEMO === 'true'
export const WRITE_ENABLED = process.env.NEXT_PUBLIC_WRITE_ENABLE === 'true'

export const demoExecutions = demoExecutionsRaw as DemoExecution[]

export const validateDemoExecution = (exec: DemoExecution): string[] => {
  const missing: string[] = []
  if (!exec.execution_id) missing.push('execution_id')
  if (!exec.task_id) missing.push('task_id')
  if (!exec.entry_type) missing.push('entry_type')
  if (!exec.requester_id) missing.push('requester_id')
  if (!exec.intent_name) missing.push('intent_name')
  if (!exec.payload) missing.push('payload')
  if (!exec.audit_log) missing.push('audit_log')
  if (!exec.audit_log?.events) missing.push('audit_log.events')
  if (!exec.created_at) missing.push('created_at')
  if (!exec.updated_at) missing.push('updated_at')
  return missing
}

export const validateDemoDataset = (): string[] => {
  const errors: string[] = []
  demoExecutions.forEach((exec, idx) => {
    const missing = validateDemoExecution(exec)
    if (missing.length > 0) {
      errors.push(`demoExecutions[${idx}] missing: ${missing.join(', ')}`)
    }
  })
  return errors
}

export const getDemoExecutionById = (executionId: string) =>
  demoExecutions.find((exec) => exec.execution_id === executionId)

export const getDemoSnapshotById = (executionId: string) => {
  const exec = getDemoExecutionById(executionId)
  if (!exec) return null
  return {
    execution_id: exec.execution_id,
    payload: exec.payload,
    result: exec.result,
    audit_log: exec.audit_log,
    created_at: exec.created_at,
    updated_at: exec.updated_at,
  }
}

export const getDemoAuditSteps = (executionId: string) => {
  const exec = getDemoExecutionById(executionId)
  return exec?.audit_log?.events || []
}
