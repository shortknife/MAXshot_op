import type { ChatAskRuntimeMeta } from '@/lib/chat/chat-ask-service'
import { estimateRuntimeCostUsd, type RuntimeCostEventParams } from '@/lib/runtime-cost/runtime'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function extractRuntimeCostEvent(params: {
  entry: Record<string, unknown>
  resultBody: unknown
  statusCode: number
  runtimeMeta?: ChatAskRuntimeMeta
  durationMs: number
}): RuntimeCostEventParams {
  const result = asRecord(params.resultBody)
  const data = asRecord(result.data)
  const meta = asRecord(data.meta)
  const answerMeta = asRecord(meta.answer_meta)
  const verification = asRecord(meta.verification)
  const tokensUsed = Number(params.runtimeMeta?.step3_tokens_used || 0)
  const estimatedCostUsd = estimateRuntimeCostUsd({
    model_source: params.runtimeMeta?.model_source || null,
    model_prompt_slug: params.runtimeMeta?.model_prompt_slug || null,
    tokens_used: tokensUsed,
  })
  return {
    session_id: params.runtimeMeta?.session_id || null,
    customer_id: params.runtimeMeta?.customer_id || null,
    requester_id: params.runtimeMeta?.requester_id || null,
    entry_channel: params.runtimeMeta?.entry_channel || 'web',
    raw_query: String(params.entry.raw_query || ''),
    intent_type: params.runtimeMeta?.intent_type || null,
    intent_type_canonical: params.runtimeMeta?.intent_type_canonical || null,
    primary_capability_id: params.runtimeMeta?.primary_capability_id || null,
    matched_capability_ids: params.runtimeMeta?.matched_capability_ids || [],
    source_plane: params.runtimeMeta?.source_plane || null,
    answer_type: typeof data.type === 'string' ? data.type : null,
    verification_outcome: params.runtimeMeta?.verification_outcome || (typeof verification.outcome === 'string' ? String(verification.outcome) : null),
    fallback_required: answerMeta.fallback_required === true,
    review_required: answerMeta.review_required === true,
    success: result.success === true,
    status_code: params.statusCode,
    model_source: params.runtimeMeta?.model_source || null,
    model_prompt_slug: params.runtimeMeta?.model_prompt_slug || null,
    tokens_used: tokensUsed,
    estimated_cost_usd: estimatedCostUsd,
    duration_ms: Math.max(0, Math.round(params.durationMs)),
    meta: {
      delivery_type: typeof data.type === 'string' ? data.type : null,
      verification_reason: typeof verification.reason === 'string' ? verification.reason : null,
      prompt_slug: params.runtimeMeta?.model_prompt_slug || null,
    },
  }
}
