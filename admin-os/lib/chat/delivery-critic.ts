import { mapErrorToUserMessage } from '@/lib/user-chat-core'

type DeliveryOutcome = 'deliver' | 'clarify' | 'block' | 'retryable_failure'

type CriticDecision = {
  pass: boolean
  outcome: DeliveryOutcome
  reason: string | null
}

type DeliveryEnvelope = {
  execution_id: string | null
  type: string
  summary: string
  error: string | null
  draft?: string | null
  meta: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function expectedDeliveryType(intentType: string): string | null {
  if (intentType === 'business_query') return 'ops'
  if (intentType === 'general_qna') return 'qna'
  if (intentType === 'content_brief' || intentType === 'marketing_gen') return 'marketing'
  if (intentType === 'out_of_scope') return 'failure'
  return null
}

function resolveNextActions(meta: Record<string, unknown>, criticDecision: CriticDecision): string[] {
  if (Array.isArray(meta.next_actions) && meta.next_actions.length > 0) {
    return meta.next_actions
  }
  if (criticDecision.outcome === 'clarify') {
    return ['请给出时间范围', '请指定查询对象', '请说明希望的统计口径']
  }
  if (criticDecision.outcome === 'retryable_failure') {
    return ['稍后重试', '改用更具体的问题', '检查数据源连接']
  }
  return []
}

export function evaluateCriticDecision(body: Record<string, unknown>): CriticDecision {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const deliveryType = String(data.type || '')
  const intentType = String(meta.intent_type || '')
  const exitType = String(meta.exit_type || '')
  const success = body.success === true
  const errorCode = String(data.error || body.error || '').trim()
  const expectedType = expectedDeliveryType(intentType)

  if (success) {
    if (exitType && exitType !== 'answered' && exitType !== 'draft_generated') {
      return { pass: false, outcome: 'block', reason: 'invalid_success_exit_type' }
    }
    if (expectedType && expectedType !== 'failure' && deliveryType && deliveryType !== expectedType) {
      return { pass: false, outcome: 'block', reason: 'intent_delivery_mismatch' }
    }
    return { pass: true, outcome: 'deliver', reason: null }
  }

  if (errorCode === 'missing_required_clarification' || exitType === 'needs_clarification') {
    return { pass: false, outcome: 'clarify', reason: errorCode || 'needs_clarification' }
  }

  if (errorCode === 'out_of_scope' || intentType === 'out_of_scope') {
    return { pass: false, outcome: 'block', reason: errorCode || 'out_of_scope' }
  }

  return { pass: false, outcome: 'retryable_failure', reason: errorCode || 'delivery_failed' }
}

export function buildDeliveryEnvelope(body: Record<string, unknown>, criticDecision: CriticDecision): DeliveryEnvelope {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const intentType = String(meta.intent_type || '')
  const rawType = String(data.type || '')
  const executionId = typeof meta.execution_id === 'string' ? meta.execution_id : null
  const error = typeof data.error === 'string' ? data.error : typeof body.error === 'string' ? body.error : null
  const summary = String(data.summary || (error ? mapErrorToUserMessage(error) : body.error || '')).trim()
  const deliveryType =
    criticDecision.outcome === 'block' || criticDecision.outcome === 'retryable_failure'
      ? 'failure'
      : rawType || expectedDeliveryType(intentType) || 'failure'

  return {
    execution_id: executionId,
    type: deliveryType,
    summary,
    error,
    draft: typeof data.draft === 'string' ? data.draft : data.draft === null ? null : undefined,
    meta: {
      intent_type: intentType || null,
      intent_type_canonical: meta.intent_type_canonical || null,
      exit_type: meta.exit_type || null,
      next_actions: resolveNextActions(meta, criticDecision),
      highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
    },
  }
}

export function finalizeDelivery(body: Record<string, unknown>): Record<string, unknown> {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const criticDecision = evaluateCriticDecision(body)
  const deliveryEnvelope = buildDeliveryEnvelope(body, criticDecision)
  return {
    ...body,
    critic_decision: criticDecision,
    delivery_envelope: deliveryEnvelope,
    data: {
      ...data,
      summary: String(data.summary || deliveryEnvelope.summary || ''),
      error:
        typeof data.error === 'string'
          ? data.error
          : typeof deliveryEnvelope.error === 'string'
            ? deliveryEnvelope.error
            : null,
      draft:
        typeof data.draft === 'string' || data.draft === null
          ? data.draft
          : typeof deliveryEnvelope.draft === 'string' || deliveryEnvelope.draft === null
            ? deliveryEnvelope.draft
            : null,
      meta: {
        ...meta,
        next_actions:
          Array.isArray(meta.next_actions) && meta.next_actions.length > 0
            ? meta.next_actions
            : deliveryEnvelope.meta.next_actions,
        highlights:
          Array.isArray(meta.highlights) && meta.highlights.length > 0
            ? meta.highlights
            : deliveryEnvelope.meta.highlights,
        critic_decision: meta.critic_decision || criticDecision,
        delivery_envelope: deliveryEnvelope,
      },
    },
  }
}
