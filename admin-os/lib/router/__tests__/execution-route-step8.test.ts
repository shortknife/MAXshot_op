import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { maybeSingle, eq, select, from }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { GET } from '@/app/api/execution/[id]/route'

describe('Step8 execution read route', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
  })

  it('returns canonical trace read model', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        execution_id: 'exec-1',
        task_id: 'task-1',
        entry_type: 'chat',
        requester_id: 'alex',
        intent_name: 'business_query',
        status: 'completed',
        result: null,
        audit_log: {
          execution_id: 'exec-1',
          events: [
            { event_type: 'router_complete', timestamp: '2026-03-29T00:00:02.000Z', data: { execution_id: 'exec-1' } },
            { event_type: 'entry_created', timestamp: '2026-03-29T00:00:01.000Z', data: {} },
          ],
        },
        created_at: '2026-03-29T00:00:00.000Z',
        updated_at: '2026-03-29T00:00:03.000Z',
      },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/execution/exec-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'exec-1' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.trace.execution_id).toBe('exec-1')
    expect(body.trace.event_count).toBe(2)
    expect(body.audit_steps[0].event_type).toBe('execution_created')
  })
})
