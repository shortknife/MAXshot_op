import { AuditEvent, AuditLog } from '../types'
import { supabase } from '../../admin-os/lib/supabase'

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

    const normalizedEvents = this.events.map((event) => ({
      ...event,
      data: {
        execution_id,
        status: (event.data as any)?.status ?? undefined,
        reason: (event.data as any)?.reason ?? undefined,
        ...(event.data || {}),
      },
    }))

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

  getEvents(): AuditEvent[] {
    return [...this.events]
  }

  clear() {
    this.events = []
  }
}
