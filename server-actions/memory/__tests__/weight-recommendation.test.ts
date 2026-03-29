import { describe, it, expect } from 'vitest'
import { computeWeightRecommendation } from '../weight-recommendation'
import { AttributionResult } from '../../evolution/attribution'

const constAttr = (overrides: Partial<AttributionResult> = {}): AttributionResult => ({
  capability_impact: {},
  evidence_coverage: 'complete',
  fallback_flags: [],
  confidence: 'high',
  ...overrides,
})

describe('weight recommendation', () => {
  it('reduces weight on low evidence', () => {
    const rec = computeWeightRecommendation({
      current_weight: 0.5,
      confidence: 0.5,
      verification_count: 0,
      attribution: constAttr({ evidence_coverage: 'missing' }),
    })
    expect(rec.recommended_weight).toBe(0.3)
    expect(rec.reason_code).toBe('low_evidence_or_confidence')
  })

  it('reduces weight on fallback', () => {
    const rec = computeWeightRecommendation({
      current_weight: 0.6,
      confidence: 0.7,
      verification_count: 2,
      attribution: constAttr({ fallback_flags: ['x'] }),
    })
    expect(rec.recommended_weight).toBe(0.5)
    expect(rec.reason_code).toBe('fallback_or_failure')
  })

  it('increases weight on high confidence with verification', () => {
    const rec = computeWeightRecommendation({
      current_weight: 0.6,
      confidence: 0.9,
      verification_count: 3,
      attribution: constAttr(),
    })
    expect(rec.recommended_weight).toBe(0.7)
    expect(rec.reason_code).toBe('high_confidence_verified')
  })
})
