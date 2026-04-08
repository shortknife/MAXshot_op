import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const assertCustomerReadAccess = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'task_executions_op') {
      const limit = vi.fn(() => ({ data: [], error: null }))
      const gte = vi.fn(() => ({ limit }))
      const order = vi.fn(() => ({ gte, limit }))
      const select = vi.fn(() => ({ order }))
      return { select }
    }
    if (table === 'data_query_logs') {
      const limit = vi.fn(() => ({ data: [], error: null }))
      const order = vi.fn(() => ({ gte: vi.fn(() => ({ order, limit })), limit }))
      const select = vi.fn(() => ({ gte: vi.fn(() => ({ order, limit })) }))
      return { select }
    }
    return { select: vi.fn() }
  })
  return { from, assertCustomerReadAccess }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/customers/runtime-entry', () => ({ assertCustomerReadAccess: mocks.assertCustomerReadAccess }))
vi.mock('@/lib/router/audit-event', () => ({ normalizeAuditEvent: vi.fn((event) => ({ ...event, event_type_canonical: event.event_type || 'unknown' })) }))

import { GET } from '@/app/api/audit/metrics/route'

describe('audit metrics read route', () => {
  beforeEach(() => {
    mocks.from.mockClear()
    mocks.assertCustomerReadAccess.mockReset()
  })

  it('requires customer/platform read access before loading metrics', async () => {
    const req = new NextRequest('http://localhost/api/audit/metrics?days=7&requester_id=maxshot-ops&operator_id=maxshot-ops&customer_id=maxshot')
    const res = await GET(req)
    const body = await res.json()

    expect(mocks.assertCustomerReadAccess).toHaveBeenCalledWith({ customerId: 'maxshot', requesterId: 'maxshot-ops', operatorId: 'maxshot-ops' })
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('rejects metrics reads outside scope', async () => {
    mocks.assertCustomerReadAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const req = new NextRequest('http://localhost/api/audit/metrics?days=7&requester_id=ops-auditor&operator_id=ops-auditor&customer_id=maxshot')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })
})
