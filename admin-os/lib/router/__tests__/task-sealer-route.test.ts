import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const selectTask = vi.fn(async () => ({ data: [{ task_id: 'task-1' }], error: null }))
  const insertTask = vi.fn(() => ({ select: selectTask }))
  const selectExec = vi.fn(async () => ({ data: [{ execution_id: 'exec-1' }], error: null }))
  const insertExec = vi.fn(() => ({ select: selectExec }))
  const from = vi.fn((table: string) => {
    if (table === 'task_executions_op') {
      return {
        select: vi.fn(() => ({ eq })),
        insert: insertExec,
      }
    }
    if (table === 'tasks_op') {
      return { insert: insertTask }
    }
    throw new Error(`unexpected table ${table}`)
  })
  return { maybeSingle, eq, insertTask, selectTask, insertExec, selectExec, from, assertWriteEnabled: vi.fn() }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/lib/utils', () => ({ assertWriteEnabled: mocks.assertWriteEnabled }))

import { POST } from '@/app/api/intent/task/create/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/intent/task/create', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('Step5 task create route', () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.eq.mockClear()
    mocks.insertTask.mockClear()
    mocks.selectTask.mockClear()
    mocks.insertExec.mockClear()
    mocks.selectExec.mockClear()
    mocks.from.mockClear()
    mocks.assertWriteEnabled.mockClear()
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.selectTask.mockResolvedValue({ data: [{ task_id: 'task-1' }], error: null })
    mocks.selectExec.mockResolvedValue({ data: [{ execution_id: 'exec-1' }], error: null })
  })

  it('rejects continue_chat before sealing', async () => {
    const res = await POST(buildRequest({
      intent_name: 'business_query',
      payload: { extracted_slots: { scope: 'yield' } },
      gate: { gate_result: 'continue_chat', blocking_fields: ['time_window'] },
      operator_id: 'op',
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('gate_blocked')
    expect(mocks.insertTask).not.toHaveBeenCalled()
  })

  it('seals read-only pass requests into created status', async () => {
    const res = await POST(buildRequest({
      intent_name: 'business_query',
      payload: { extracted_slots: { scope: 'yield' }, matched_capability_id: 'capability.data_fact_query' },
      gate: { gate_result: 'pass', require_confirmation: false, gate_reason: 'ready_read_only', safe_to_seal: true },
      capability_binding: { capability_id: 'capability.data_fact_query' },
      operator_id: 'op',
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('created')
    expect(body.sealed_execution.primary_capability_id).toBe('capability.data_fact_query')
    expect(body.sealed_execution.gate.gate_result).toBe('pass')
  })

  it('returns prior execution for duplicate idempotency key', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { execution_id: 'exec-existing', task_id: 'task-existing' }, error: null })
    const res = await POST(buildRequest({
      intent_name: 'business_query',
      payload: { extracted_slots: { scope: 'yield' }, matched_capability_id: 'capability.data_fact_query' },
      gate: { gate_result: 'pass' },
      capability_binding: { capability_id: 'capability.data_fact_query' },
      idempotency_key: 'same-key',
      operator_id: 'op',
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.execution_id).toBe('exec-existing')
    expect(mocks.insertTask).not.toHaveBeenCalled()
  })

  it('keeps pending_confirmation when gate already requires confirmation', async () => {
    const res = await POST(buildRequest({
      intent_name: 'marketing_gen',
      payload: { extracted_slots: { topic: 'launch' } },
      gate: { gate_result: 'require_confirmation', require_confirmation: true, reason_for_pending: 'side_effect' },
      operator_id: 'op',
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('pending_confirmation')
    expect(body.sealed_execution.gate.require_confirmation).toBe(true)
  })

  it('infers primary capability from intent name when capability ids are omitted', async () => {
    const res = await POST(buildRequest({
      intent_name: 'content_brief',
      payload: { extracted_slots: {} },
      gate: { gate_result: 'require_confirmation', require_confirmation: true },
      operator_id: 'op',
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sealed_execution.primary_capability_id).toBe('capability.content_generator')
    expect(body.sealed_execution.matched_capability_ids).toContain('capability.content_generator')
  })
})
