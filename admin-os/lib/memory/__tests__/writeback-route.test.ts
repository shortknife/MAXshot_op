import { describe, expect, it, vi } from 'vitest'

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
vi.mock('@/lib/customers/runtime-entry', () => ({ assertExecutionEntryAccess: mocks.assertExecutionEntryAccess }))

import { POST } from '@/app/api/memory/writeback/route'

describe('memory writeback route entry enforcement', () => {
  it('returns 403 when source execution customer scope is denied', async () => {
    mocks.assertExecutionEntryAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(new Request('http://localhost/api/memory/writeback', {
      method: 'POST',
      body: JSON.stringify({
        source_execution_id: 'exec-1',
        memory_type: 'insight',
        candidate: { summary: 'x' },
        approved_by: 'ops-auditor',
        confirm_token: 'ok',
        approved: true,
      }),
      headers: { 'Content-Type': 'application/json' },
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })
})
