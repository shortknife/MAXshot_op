import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const assertWriteEnabled = vi.fn()
  const appendAuditEvent = vi.fn()
  return { maybeSingle, eq, select, from, assertWriteEnabled, appendAuditEvent }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

vi.mock('@/lib/utils', () => ({
  assertWriteEnabled: mocks.assertWriteEnabled,
  buildWriteBlockedEvent: vi.fn(() => ({ event_type: 'write_blocked', data: {} })),
}))

vi.mock('@/lib/router/audit-logging', () => ({
  appendAuditEvent: mocks.appendAuditEvent,
}))

import { POST } from '@/app/api/execution/replay/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/execution/replay', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Step8 execution replay route', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    mocks.assertWriteEnabled.mockReset()
    mocks.appendAuditEvent.mockReset()
  })

  it('appends replay marker and returns updated audit log', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        execution_id: 'exec-1',
        task_id: 'task-1',
        status: 'completed',
        payload: null,
        result: null,
        audit_log: { execution_id: 'exec-1', events: [] },
        created_at: '2026-03-29T00:00:00.000Z',
        updated_at: '2026-03-29T00:00:00.000Z',
      },
      error: null,
    })
    mocks.appendAuditEvent.mockResolvedValue({
      execution_id: 'exec-1',
      created_at: '2026-03-29T00:00:00.000Z',
      events: [{ event_type: 'execution_replay_requested', data: { execution_id: 'exec-1' } }],
    })

    const res = await POST(buildRequest({ execution_id: 'exec-1', operator_id: 'alex', confirm_token: 'ok' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mocks.appendAuditEvent).toHaveBeenCalledTimes(1)
    expect(body.execution.audit_log.events[0].event_type).toBe('execution_replay_requested')
  })
})
