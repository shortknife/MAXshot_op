import { describe, expect, it } from 'vitest'
import { assertSealable, buildSealedExecutionEnvelope, deriveInitialSealedStatus, normalizeSealerGate } from '@/lib/router/sealed-execution'

describe('Step5 sealed execution helpers', () => {
  it('blocks continue_chat from sealing', () => {
    const gate = normalizeSealerGate({ gate_result: 'continue_chat', blocking_fields: ['time_window'] }, false)
    const result = assertSealable({ gate, intentName: 'business_query', inScope: true })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('gate_blocked')
      expect(result.blocking_fields).toContain('time_window')
    }
  })

  it('forces pending confirmation for side-effect risk even if caller says pass', () => {
    const gate = normalizeSealerGate({ gate_result: 'pass', require_confirmation: false }, false)
    expect(deriveInitialSealedStatus({ gate, capabilityRiskClass: 'side_effect' })).toBe('pending_confirmation')
  })

  it('builds a stable sealed execution envelope', () => {
    const gate = normalizeSealerGate({ gate_result: 'pass' }, false)
    const sealed = buildSealedExecutionEnvelope({
      taskId: 'task-1',
      executionId: 'exec-1',
      intentName: 'business_query',
      entryType: 'raw_query',
      entryChannel: 'admin_os',
      requesterId: 'admin',
      rawQuery: '最近7天 APY',
      primaryCapabilityId: 'capability.data_fact_query',
      matchedCapabilityIds: ['capability.data_fact_query'],
      slots: { scope: 'yield' },
      gate,
      capabilityRiskClass: 'read_only',
    })
    expect(sealed.status).toBe('created')
    expect(sealed.sealed_execution.gate.gate_result).toBe('pass')
    expect(sealed.sealed_execution.primary_capability_id).toBe('capability.data_fact_query')
  })
})
