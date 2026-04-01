import { describe, expect, it } from 'vitest'
import { evaluateGateDecision } from '@/lib/router/gate-decision'

describe('Step4 GateDecision', () => {
  it('returns continue_chat for incomplete read-only queries', () => {
    const decision = evaluateGateDecision({
      intent_name: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      execution_mode: 'hybrid',
      slots: {},
    })

    expect(decision.gate_result).toBe('continue_chat')
    expect(decision.gate_reason).toBe('missing_required_slots')
    expect(decision.blocking_fields).toContain('scope')
    expect(decision.safe_to_seal).toBe(false)
  })

  it('returns pass for complete read-only queries', () => {
    const decision = evaluateGateDecision({
      intent_name: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      execution_mode: 'hybrid',
      slots: { scope: 'yield' },
    })

    expect(decision.gate_result).toBe('pass')
    expect(decision.require_confirmation).toBe(false)
    expect(decision.gate_reason).toBe('ready_read_only')
    expect(decision.safe_to_seal).toBe(true)
    expect(decision.capability_binding?.capability_id).toBe('capability.data_fact_query')
  })

  it('never passes out_of_scope requests', () => {
    const decision = evaluateGateDecision({
      intent_name: 'out_of_scope',
      execution_mode: 'hybrid',
      slots: { in_scope: false },
    })

    expect(decision.gate_result).toBe('continue_chat')
    expect(decision.gate_reason).toBe('out_of_scope')
    expect(decision.safe_to_seal).toBe(false)
  })

  it('returns require_confirmation for side-effect capabilities', () => {
    const decision = evaluateGateDecision({
      intent_name: 'marketing_gen',
      capability_binding: { capability_id: 'capability.publisher' },
      execution_mode: 'deterministic',
      entry_channel: 'admin_os',
      slots: {},
    })

    expect(decision.gate_result).toBe('require_confirmation')
    expect(decision.require_confirmation).toBe(true)
    expect(decision.gate_reason).toBe('side_effect_confirmation_required')
    expect(decision.safe_to_seal).toBe(false)
    expect(decision.reason_for_pending).toBe('side_effect')
    expect(decision.confirmation_request?.preview.capability_id).toBe('capability.publisher')
  })

  it('returns require_confirmation for kb upload qc side-effect capability', () => {
    const decision = evaluateGateDecision({
      intent_name: 'task_management',
      matched_capability_ids: ['capability.kb_upload_qc'],
      execution_mode: 'deterministic',
      entry_channel: 'admin_os',
      slots: {
        source_type: 'markdown',
        source_ref: 'app/configs/faq-kb/account-access.md',
      },
    })

    expect(decision.gate_result).toBe('require_confirmation')
    expect(decision.require_confirmation).toBe(true)
    expect(decision.gate_reason).toBe('side_effect_confirmation_required')
    expect(decision.confirmation_request?.preview.capability_id).toBe('capability.kb_upload_qc')
  })

  it('continues chat when query contract is incomplete', () => {
    const decision = evaluateGateDecision({
      intent_name: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      execution_mode: 'hybrid',
      slots: { scope: 'yield' },
      query_contract: {
        completeness: {
          ready: false,
          missing_slots: ['time_window', 'metric_agg'],
        },
      },
    })

    expect(decision.gate_result).toBe('continue_chat')
    expect(decision.gate_reason).toBe('missing_query_contract_fields')
    expect(decision.blocking_fields).toEqual(['time_window', 'metric_agg'])
    expect(decision.safe_to_seal).toBe(false)
  })
})
