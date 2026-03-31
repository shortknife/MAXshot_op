import { normalizeAuditEvent } from '@/lib/router/audit-event'

export type NormalizedAuditEvent = ReturnType<typeof normalizeAuditEvent>

export function extractNormalizedAuditEvents(auditLog: unknown, executionId?: string): NormalizedAuditEvent[] {
  if (!auditLog || typeof auditLog !== 'object') return []
  const events = (auditLog as { events?: unknown }).events
  if (!Array.isArray(events)) return []
  return events
    .filter((e): e is { event_type?: unknown; timestamp?: unknown; data?: unknown } => typeof e === 'object' && e !== null)
    .map((e) =>
      normalizeAuditEvent(
        {
          event_type: String(e.event_type || 'unknown_event'),
          timestamp: typeof e.timestamp === 'string' ? e.timestamp : undefined,
          data: e.data && typeof e.data === 'object' ? (e.data as Record<string, unknown>) : {},
        },
        executionId
      )
    )
}

export function sortAuditEventsByTimestamp<T extends { timestamp?: string }>(events: T[]): T[] {
  return events.slice().sort((a, b) => {
    const ta = Date.parse(a.timestamp || '') || 0
    const tb = Date.parse(b.timestamp || '') || 0
    return ta - tb
  })
}
