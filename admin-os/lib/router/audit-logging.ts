import { AuditEvent, AuditLog } from './types'
import { supabase } from '@/lib/supabase'
import { normalizeAuditEvent } from './audit-event'

export class AuditLogger {
  private static instance: AuditLogger
  private eventsByExecution = new Map<string, AuditEvent[]>()

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  log(event_type: string, data: Record<string, unknown>) {
    const executionId = String(data?.execution_id || '').trim()
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      event_type,
      data,
    }
    if (!executionId) {
      return
    }
    const current = this.eventsByExecution.get(executionId) || []
    current.push(event)
    this.eventsByExecution.set(executionId, current)
  }

  async flush(execution_id: string): Promise<void> {
    const pendingEvents = this.eventsByExecution.get(execution_id) || []
    if (pendingEvents.length === 0) {
      return
    }

    const { data: existing, error } = await supabase
      .from('task_executions_op')
      .select('audit_log')
      .eq('execution_id', execution_id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load audit_log: ${error.message}`)
    }

    const existingLog = (existing?.audit_log as AuditLog | undefined) || {
      execution_id,
      events: [],
      created_at: new Date().toISOString(),
    }

    const normalizedEvents = pendingEvents.map((event) =>
      normalizeAuditEvent(
        {
          ...event,
          event_type: String(event.event_type || 'unknown_event'),
          data: {
            status: (event.data as any)?.status ?? undefined,
            reason: (event.data as any)?.reason ?? undefined,
            ...(event.data || {}),
          },
        },
        execution_id
      )
    )

    const auditLog: AuditLog = {
      execution_id,
      events: [...(existingLog.events || []), ...normalizedEvents],
      created_at: existingLog.created_at || new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: auditLog })
      .eq('execution_id', execution_id)

    if (updateError) {
      throw new Error(`Failed to update audit_log: ${updateError.message}`)
    }

    this.eventsByExecution.delete(execution_id)
  }

  clear(execution_id?: string) {
    if (execution_id) {
      this.eventsByExecution.delete(execution_id)
      return
    }
    this.eventsByExecution.clear()
  }
}

export async function appendAuditEvents(execution_id: string, events: Array<{ timestamp?: string; event_type: string; data?: Record<string, unknown>; event_type_canonical?: string }>): Promise<AuditLog> {
  const { data: existing, error } = await supabase
    .from('task_executions_op')
    .select('audit_log')
    .eq('execution_id', execution_id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load audit_log: ${error.message}`)
  }

  const existingLog = (existing?.audit_log as AuditLog | undefined) || {
    execution_id,
    events: [],
    created_at: new Date().toISOString(),
  }

  const normalizedEvents = events.map((event) => normalizeAuditEvent(event, execution_id))

  const auditLog: AuditLog = {
    execution_id,
    events: [...(existingLog.events || []), ...normalizedEvents],
    created_at: existingLog.created_at || new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from('task_executions_op')
    .update({ audit_log: auditLog })
    .eq('execution_id', execution_id)

  if (updateError) {
    throw new Error(`Failed to update audit_log: ${updateError.message}`)
  }

  return auditLog
}

export async function appendAuditEvent(execution_id: string, event: { timestamp?: string; event_type: string; data?: Record<string, unknown>; event_type_canonical?: string }): Promise<AuditLog> {
  return appendAuditEvents(execution_id, [event])
}
