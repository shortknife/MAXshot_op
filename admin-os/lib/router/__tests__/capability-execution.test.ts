import { describe, expect, it } from 'vitest'
import { buildCapabilityFailureOutput, normalizeCapabilityExecutionResult } from '@/lib/router/capability-execution'

describe('Step7 capability execution normalization', () => {
  it('normalizes alias outputs to canonical capability ids', () => {
    const normalized = normalizeCapabilityExecutionResult('data_fact_query', {
      capability_id: 'data_fact_query',
      capability_version: '1.0',
      status: 'success',
      result: { rows: [] },
      evidence: { sources: [], doc_quotes: null },
      audit: {
        capability_id: 'data_fact_query',
        capability_version: '1.0',
        status: 'success',
        used_skills: [],
      },
      used_skills: [],
    })

    expect(normalized.capability_id).toBe('capability.data_fact_query')
    expect(normalized.audit.capability_id).toBe('capability.data_fact_query')
  })

  it('builds explicit failure outputs for missing capabilities', () => {
    const output = buildCapabilityFailureOutput({
      requested_capability_id: 'capability.unknown',
      reason: 'capability_not_found',
    })

    expect(output.status).toBe('failed')
    expect(output.error).toBe('capability_not_found')
    expect(output.metadata?.rejected_reason).toBe('capability_not_found')
  })
})

