import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select, update }))
  return { maybeSingle, eq, updateEq, update, select, from }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { appendAuditEvent } from '@/lib/router/audit-logging'
import { buildTraceReadModel } from '@/lib/router/audit-read'

describe('Step8 audit trace helpers', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.updateEq.mockReset()
    mocks.update.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
  })

  it('appends canonical audit events in order', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        audit_log: {
          execution_id: 'exec-1',
          created_at: '2026-03-29T00:00:00.000Z',
          events: [{ event_type: 'execution_created', timestamp: '2026-03-29T00:00:00.000Z', data: { execution_id: 'exec-1' } }],
        },
      },
      error: null,
    })
    mocks.updateEq.mockResolvedValue({ error: null })

    const auditLog = await appendAuditEvent('exec-1', {
      event_type: 'router_complete',
      data: { status: 'completed' },
    })

    expect(auditLog.events).toHaveLength(2)
    expect(auditLog.events?.[1]?.event_type).toBe('router_complete')
    expect(auditLog.events?.[1]?.data?.execution_id).toBe('exec-1')
  })

  it('builds a canonical trace read model and normalizes legacy event names', () => {
    const trace = buildTraceReadModel(
      {
        execution_id: 'exec-1',
        events: [
          { event_type: 'router_complete', timestamp: '2026-03-29T00:00:02.000Z', data: { execution_id: 'exec-1' } },
          { event_type: 'entry_created', timestamp: '2026-03-29T00:00:01.000Z', data: {} },
        ],
      },
      'exec-1'
    )

    expect(trace.execution_id).toBe('exec-1')
    expect(trace.event_count).toBe(2)
    expect(trace.events[0]?.event_type).toBe('execution_created')
    expect(trace.events[1]?.event_type).toBe('router_complete')
    expect(trace.events[0]?.data?.execution_id).toBe('exec-1')
  })
})
