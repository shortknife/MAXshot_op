import { AttributionResult } from './attribution'

export type EvolutionRecommendation = {
  candidate_type: 'evolution_recommendation'
  source_execution_id: string
  capability_path: string[]
  attribution: AttributionResult
  recommendation: { action: 'review' | 'monitor' | 'investigate'; reason_code: 'fallback_detected' | 'low_evidence' | 'failed_capability' | 'nominal' }
}

export function buildRecommendation(input: { source_execution_id: string; capability_path: string[]; attribution: AttributionResult }): EvolutionRecommendation {
  let action: EvolutionRecommendation['recommendation']['action'] = 'review'
  let reason_code: EvolutionRecommendation['recommendation']['reason_code'] = 'nominal'

  if (input.attribution.fallback_flags.length > 0) {
    action = 'investigate'
    reason_code = 'fallback_detected'
  } else if (input.attribution.evidence_coverage === 'missing') {
    action = 'investigate'
    reason_code = 'low_evidence'
  } else if (Object.values(input.attribution.capability_impact).some((v) => v.status === 'failed')) {
    action = 'review'
    reason_code = 'failed_capability'
  } else {
    action = 'monitor'
    reason_code = 'nominal'
  }

  return {
    candidate_type: 'evolution_recommendation',
    source_execution_id: input.source_execution_id,
    capability_path: input.capability_path,
    attribution: input.attribution,
    recommendation: { action, reason_code },
  }
}
