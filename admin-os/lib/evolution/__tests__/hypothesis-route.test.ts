import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const assertWriteEnabled = vi.fn()
  const assertExecutionEntryAccess = vi.fn()
  return { assertWriteEnabled, assertExecutionEntryAccess }
})

vi.mock('@/lib/utils', () => ({ assertWriteEnabled: mocks.assertWriteEnabled }))
vi.mock('@/lib/customers/runtime-entry', () => ({ assertExecutionEntryAccess: mocks.assertExecutionEntryAccess }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { POST } from '@/app/api/evolution/hypothesis/route'

describe('evolution hypothesis route entry enforcement', () => {
  it('returns 403 when execution customer scope is denied', async () => {
    mocks.assertExecutionEntryAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(new Request('http://localhost/api/evolution/hypothesis', {
      method: 'POST',
      body: JSON.stringify({ execution_id: 'exec-1', operator_id: 'ops-auditor', confirm_token: 'ok' }),
      headers: { 'Content-Type': 'application/json' },
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })
})
