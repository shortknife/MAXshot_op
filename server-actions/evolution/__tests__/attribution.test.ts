import { describe, it, expect } from 'vitest'
import { buildAttribution } from '../attribution'
import { buildRecommendation } from '../candidate'

describe('evolution attribution', () => {
  it('marks failed capability and fallback', () => {
    const attribution = buildAttribution({
      result: { capability_outputs: [{ capability_id: 'cap-1', status: 'failed', evidence: { fallback_reason: 'x' } }] } as any,
      audit_log: { execution_id: 'exec-1', events: [] } as any,
    })
    expect(attribution.fallback_flags.length).toBe(1)
    expect(attribution.capability_impact['cap-1'].status).toBe('failed')
  })

  it('builds structured recommendation', () => {
    const attribution = buildAttribution({
      result: { capability_outputs: [] } as any,
      audit_log: { execution_id: 'exec-1', events: [] } as any,
    })
    const recommendation = buildRecommendation({
      source_execution_id: 'exec-1',
      capability_path: ['cap-1'],
      attribution,
    })
    expect(recommendation.candidate_type).toBe('evolution_recommendation')
    expect(recommendation.recommendation).toHaveProperty('action')
    expect(recommendation.recommendation).toHaveProperty('reason_code')
  })
})
