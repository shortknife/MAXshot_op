export type AuditEventInput = {
  timestamp?: string
  event_type: string
  data?: Record<string, unknown>
  event_type_canonical?: string
}

export function toCanonicalEventType(eventType: string): string {
  const map: Record<string, string> = {
    entry_created: 'execution.created',
    execution_confirmed: 'confirmation.result',
    execution_rejected: 'confirmation.result',
    execution_expired: 'execution.status_changed',
    execution_retry_created: 'execution.status_changed',
    execution_replay_requested: 'execution.status_changed',
    hypothesis_generated: 'execution.status_changed',
    marketing_feedback_recorded: 'exec.capability_audit',
    marketing_attribution_generated: 'exec.capability_audit',
    write_blocked: 'safety.policy_event',
  }
  return map[eventType] || eventType
}

function inferStepStatus(data: Record<string, unknown>): string | undefined {
  const explicit = data.step_status
  if (typeof explicit === 'string' && explicit.trim()) return explicit
  const status = data.status
  if (typeof status === 'string' && status.trim()) {
    if (status === 'in_progress') return 'executing'
    return status
  }
  return undefined
}

export function normalizeAuditEvent(
  event: AuditEventInput & { [key: string]: unknown },
  fallbackExecutionId?: string
) {
  const eventType = String(event.event_type || 'unknown_event')
  const data: Record<string, unknown> = {
    execution_id: fallbackExecutionId || null,
    ...(event.data || {}),
  }
  const stepStatus = inferStepStatus(data)
  if (stepStatus) {
    data.step_status = stepStatus
  }
  return {
    ...event,
    event_type: eventType,
    timestamp: event.timestamp || new Date().toISOString(),
    event_type_canonical: event.event_type_canonical || toCanonicalEventType(eventType),
    data,
  }
}

export function buildAuditEvent(executionId: string, input: AuditEventInput) {
  return normalizeAuditEvent(input, executionId)
}
