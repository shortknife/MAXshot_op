import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const assertExecutionReadAccess = vi.fn()
  return { maybeSingle, eq, select, from, assertExecutionReadAccess }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/customers/runtime-entry', () => ({ assertExecutionReadAccess: mocks.assertExecutionReadAccess }))

import { POST } from '@/app/api/execution/snapshot/route'

describe('execution snapshot read route', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    mocks.assertExecutionReadAccess.mockReset()
  })

  it('returns snapshot when read access passes', async () => {
    mocks.assertExecutionReadAccess.mockResolvedValueOnce({ execution_id: 'exec-1', customer_id: 'maxshot' })
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { execution_id: 'exec-1', payload: { customer_id: 'maxshot' }, result: { ok: true }, audit_log: { events: [] }, created_at: '2026-04-08T00:00:00.000Z', updated_at: '2026-04-08T00:00:00.000Z' },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/execution/snapshot', {
      method: 'POST',
      body: JSON.stringify({ execution_id: 'exec-1', requester_id: 'maxshot-ops', operator_id: 'maxshot-ops' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.execution.execution_id).toBe('exec-1')
  })

  it('rejects snapshot reads outside customer scope', async () => {
    mocks.assertExecutionReadAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const req = new NextRequest('http://localhost/api/execution/snapshot', {
      method: 'POST',
      body: JSON.stringify({ execution_id: 'exec-1', requester_id: 'ops-auditor', operator_id: 'ops-auditor' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })
})
