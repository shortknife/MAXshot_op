import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const executeRouter = vi.fn()
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const update = vi.fn(() => ({ eq }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select, update }))
  const assertWriteEnabled = vi.fn()
  const buildWriteBlockedEvent = vi.fn(() => ({ event_type: 'write_blocked' }))
  const assertExecutionEntryAccess = vi.fn()
  return {
    executeRouter,
    maybeSingle,
    eq,
    update,
    select,
    from,
    assertWriteEnabled,
    buildWriteBlockedEvent,
    assertExecutionEntryAccess,
  }
})

vi.mock('@/lib/router/execute', () => ({
  executeRouter: mocks.executeRouter,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

vi.mock('@/lib/customers/runtime-entry', () => ({
  assertExecutionEntryAccess: mocks.assertExecutionEntryAccess,
}))

vi.mock('@/lib/utils', () => ({
  assertWriteEnabled: mocks.assertWriteEnabled,
  buildWriteBlockedEvent: mocks.buildWriteBlockedEvent,
}))

import { POST } from '@/app/api/execution/run/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/execution/run', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Step6 execution run route', () => {
  beforeEach(() => {
    mocks.executeRouter.mockReset()
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.update.mockClear()
    mocks.select.mockClear()
    mocks.from.mockClear()
    mocks.assertWriteEnabled.mockReset()
    mocks.assertExecutionEntryAccess.mockReset()
  })

  it('returns router output for successful dispatch', async () => {
    mocks.executeRouter.mockResolvedValue({
      success: true,
      final_answer: 'ok',
      routing_decision: {
        primary_capability_id: 'capability.data_fact_query',
        matched_capability_ids: ['capability.data_fact_query'],
        capability_chain: ['capability.data_fact_query'],
        memory_query: { types: ['foundation'], context_tags: ['capability.data_fact_query'] },
        memory_refs_ref: ['capability_registry_v1:capability.data_fact_query'],
        dispatch_ready: true,
      },
    })

    const res = await POST(buildRequest({ execution_id: 'exec-1', operator_id: 'op', confirm_token: 'token' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.routing_decision.primary_capability_id).toBe('capability.data_fact_query')
  })

  it('returns 409 for blocked router decisions', async () => {
    mocks.executeRouter.mockResolvedValue({
      success: false,
      error: 'status_not_confirmed',
      routing_decision: {
        dispatch_ready: false,
        reason: 'status_not_confirmed',
      },
    })

    const res = await POST(buildRequest({ execution_id: 'exec-1', operator_id: 'op', confirm_token: 'token' }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('status_not_confirmed')
    expect(body.routing_decision).toEqual({
      dispatch_ready: false,
      reason: 'status_not_confirmed',
    })
  })

  it('returns 403 when execution entry access is denied', async () => {
    mocks.assertExecutionEntryAccess.mockRejectedValueOnce(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(buildRequest({ execution_id: 'exec-1', operator_id: 'op', confirm_token: 'token' }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
    expect(mocks.executeRouter).not.toHaveBeenCalled()
  })

  it('returns 200 when router ran but capability execution failed', async () => {
    mocks.executeRouter.mockResolvedValue({
      success: false,
      error: 'One or more capabilities failed',
      routing_decision: {
        dispatch_ready: true,
        primary_capability_id: 'capability.content_generator',
      },
      capability_outputs: [],
      final_answer: 'Execution failed',
    })

    const res = await POST(buildRequest({ execution_id: 'exec-1', operator_id: 'op', confirm_token: 'token' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.result.success).toBe(false)
    expect(body.routing_decision).toMatchObject({
      dispatch_ready: true,
      primary_capability_id: 'capability.content_generator',
    })
  })
})
