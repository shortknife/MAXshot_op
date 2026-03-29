import { AuditEvent, AuditLog } from './types'
import { supabase } from '@/lib/supabase'
import { normalizeAuditEvent } from './audit-event'

export class AuditLogger {
  private static instance: AuditLogger
  private events: AuditEvent[] = []

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  log(event_type: string, data: Record<string, unknown>) {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      event_type,
      data,
    }
    this.events.push(event)
  }

  async flush(execution_id: string): Promise<void> {
    if (this.events.length === 0) {
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

    const normalizedEvents = this.events.map((event) =>
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

    await supabase
      .from('task_executions_op')
      .update({ audit_log: auditLog })
      .eq('execution_id', execution_id)

    this.events = []
  }

  clear() {
    this.events = []
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
