export type AuditEvent = {
  timestamp?: string
  event_type?: string
  event_type_canonical?: string
  data?: Record<string, unknown>
}
export type AuditLog = { execution_id?: string; events?: AuditEvent[]; created_at?: string }
