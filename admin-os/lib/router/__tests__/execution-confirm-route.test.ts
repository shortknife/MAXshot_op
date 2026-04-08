import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const updateEq = vi.fn(() => ({}) )
  const update = vi.fn(() => ({ eq: updateEq }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select, update }))
  const assertWriteEnabled = vi.fn()
  const assertExecutionEntryAccess = vi.fn()
  return { maybeSingle, eq, updateEq, update, select, from, assertWriteEnabled, assertExecutionEntryAccess }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/utils', () => ({ assertWriteEnabled: mocks.assertWriteEnabled, buildWriteBlockedEvent: vi.fn(() => ({ event_type: 'write_blocked' })) }))
vi.mock('@/lib/router/audit-logging', () => ({ appendAuditEvent: vi.fn() }))
vi.mock('@/lib/customers/runtime-entry', () => ({ assertExecutionEntryAccess: mocks.assertExecutionEntryAccess }))

import { POST } from '@/app/api/execution/confirm/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/execution/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('execution confirm route entry enforcement', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.updateEq.mockClear()
    mocks.update.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    mocks.assertWriteEnabled.mockReset()
    mocks.assertExecutionEntryAccess.mockReset()
  })

  it('returns 403 when execution customer access is denied', async () => {
    mocks.assertExecutionEntryAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(buildRequest({ execution_id: 'exec-1', decision: 'confirm', actor_id: 'ops-auditor', confirm_token: 'ok' }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })
})
