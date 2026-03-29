import { AttributionResult } from '../evolution/attribution'

export type WeightRecommendation = {
  recommended_weight: number
  delta: number
  reason_code: 'high_confidence_verified' | 'fallback_or_failure' | 'low_evidence_or_confidence' | 'no_change'
}

export function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(2))
}

export function computeWeightRecommendation(input: {
  current_weight: number
  confidence?: number | null
  verification_count: number
  attribution: AttributionResult
}): WeightRecommendation {
  const current = clampWeight(input.current_weight)
  const confidence = typeof input.confidence === 'number' ? input.confidence : null
  const verificationCount = Number.isFinite(input.verification_count) ? input.verification_count : 0

  let recommended = current
  let reason: WeightRecommendation['reason_code'] = 'no_change'

  const hasFailure = Object.values(input.attribution.capability_impact).some((v) => v.status === 'failed')
  const hasFallback = input.attribution.fallback_flags.length > 0

  if (input.attribution.evidence_coverage === 'missing' || (confidence !== null && confidence <= 0.4)) {
    recommended = current - 0.2
    reason = 'low_evidence_or_confidence'
  } else if (hasFallback || hasFailure) {
    recommended = current - 0.1
    reason = 'fallback_or_failure'
  } else if (confidence !== null && confidence >= 0.8 && verificationCount >= 3) {
    recommended = current + 0.1
    reason = 'high_confidence_verified'
  }

  recommended = clampWeight(recommended)
  const delta = Number((recommended - current).toFixed(2))

  return { recommended_weight: recommended, delta, reason_code: reason }
}
