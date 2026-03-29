import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/entry/gate/check/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3003/api/entry/gate/check', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Step4 gate route', () => {
  it('returns continue_chat for incomplete read-only queries', async () => {
    const res = await POST(
      buildRequest({
        intent_name: 'business_query',
        matched_capability_ids: ['capability.data_fact_query'],
        execution_mode: 'hybrid',
        slots: {},
      })
    )
    const data = await res.json()

    expect(data.gate_result).toBe('continue_chat')
    expect(data.gate_reason).toBe('missing_required_slots')
    expect(data.safe_to_seal).toBe(false)
    expect(data.blocking_fields).toContain('scope')
  })

  it('returns pass for complete read-only queries', async () => {
    const res = await POST(
      buildRequest({
        intent_name: 'business_query',
        matched_capability_ids: ['capability.data_fact_query'],
        execution_mode: 'hybrid',
        slots: { scope: 'yield' },
      })
    )
    const data = await res.json()

    expect(data.gate_result).toBe('pass')
    expect(data.gate_reason).toBe('ready_read_only')
    expect(data.require_confirmation).toBe(false)
    expect(data.safe_to_seal).toBe(true)
  })

  it('returns require_confirmation for side-effect capabilities', async () => {
    const res = await POST(
      buildRequest({
        intent_name: 'marketing_gen',
        capability_binding: { capability_id: 'capability.publisher' },
        execution_mode: 'deterministic',
        slots: {},
      })
    )
    const data = await res.json()

    expect(data.gate_result).toBe('require_confirmation')
    expect(data.gate_reason).toBe('side_effect_confirmation_required')
    expect(data.require_confirmation).toBe(true)
    expect(data.safe_to_seal).toBe(false)
  })
})
