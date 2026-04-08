import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const resolveIdentityById = vi.fn()
  const assertOperatorCustomerAccess = vi.fn()
  const assertOperatorPlatformAccess = vi.fn()
  const appendAuditEvent = vi.fn()
  const buildWriteBlockedEvent = vi.fn(() => ({ event_type: 'write_blocked' }))
  return { maybeSingle, eq, select, from, resolveIdentityById, assertOperatorCustomerAccess, assertOperatorPlatformAccess, appendAuditEvent, buildWriteBlockedEvent }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/auth/identity-registry', () => ({ resolveIdentityById: mocks.resolveIdentityById }))
vi.mock('@/lib/customers/access', () => ({ assertOperatorCustomerAccess: mocks.assertOperatorCustomerAccess, assertOperatorPlatformAccess: mocks.assertOperatorPlatformAccess }))
vi.mock('@/lib/router/audit-logging', () => ({ appendAuditEvent: mocks.appendAuditEvent }))
vi.mock('@/lib/utils', () => ({ buildWriteBlockedEvent: mocks.buildWriteBlockedEvent }))

import { assertCustomerReadAccess, assertExecutionEntryAccess, assertExecutionReadAccess, enforceChatEntryIdentityContext, enforceRequesterCustomerContext, resolveExecutionCustomerContext } from '@/lib/customers/runtime-entry'

describe('customer runtime entry helpers', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    mocks.resolveIdentityById.mockReset()
    mocks.assertOperatorCustomerAccess.mockReset()
    mocks.assertOperatorPlatformAccess.mockReset()
    mocks.appendAuditEvent.mockReset()
    mocks.appendAuditEvent.mockResolvedValue(null)
    mocks.buildWriteBlockedEvent.mockClear()
  })

  it('fills missing chat customer_id from requester identity', async () => {
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })

    const entry = await enforceChatEntryIdentityContext({ raw_query: 'hi', requester_id: 'maxshot-ops', customer_id: null, entry_channel: 'web_app' })

    expect(entry.customer_id).toBe('maxshot')
  })



  it('rejects mismatched requester and customer ids', async () => {
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })

    await expect(
      enforceRequesterCustomerContext({ requesterId: 'maxshot-ops', customerId: 'ops-observer' }),
    ).rejects.toThrow('requester_customer_mismatch')
  })

  it('allows read access when requester belongs to the same customer', async () => {
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'maxshot-user', customer_id: 'maxshot', operator_id: null })

    const result = await assertCustomerReadAccess({ customerId: 'maxshot', requesterId: 'maxshot-user' })

    expect(result.customer_id).toBe('maxshot')
  })

  it('rejects read access when requester belongs to another customer', async () => {
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'ops-user', customer_id: 'ops-observer', operator_id: null })

    await expect(assertCustomerReadAccess({ customerId: 'maxshot', requesterId: 'ops-user' })).rejects.toThrow('requester_customer_scope_not_allowed')
  })

  it('derives read access from execution customer context', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { execution_id: 'exec-1', requester_id: 'maxshot-user', payload: { customer_id: 'maxshot' } }, error: null })
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'maxshot-user', customer_id: 'maxshot', operator_id: null })

    const context = await assertExecutionReadAccess({ executionId: 'exec-1', requesterId: 'maxshot-user' })

    expect(context.customer_id).toBe('maxshot')
  })

  it('derives execution customer from requester identity when payload has none', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { execution_id: 'exec-1', requester_id: 'maxshot-ops', payload: {} }, error: null })
    mocks.resolveIdentityById.mockResolvedValueOnce({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })

    const context = await resolveExecutionCustomerContext('exec-1')

    expect(context).toEqual({ execution_id: 'exec-1', requester_id: 'maxshot-ops', customer_id: 'maxshot', source: 'identity.customer_id' })
  })

  it('appends blocked audit evidence when operator customer access fails', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { execution_id: 'exec-1', requester_id: 'maxshot-ops', payload: { customer_id: 'maxshot' } }, error: null })
    mocks.assertOperatorCustomerAccess.mockImplementationOnce(() => { throw new Error('operator_customer_scope_not_allowed') })

    await expect(assertExecutionEntryAccess({ executionId: 'exec-1', operatorId: 'ops-auditor', requestPath: '/api/execution/run' })).rejects.toThrow('operator_customer_scope_not_allowed')
    expect(mocks.appendAuditEvent).toHaveBeenCalledTimes(1)
  })
})
