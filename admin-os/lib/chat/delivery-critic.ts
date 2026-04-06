import { mapErrorToUserMessage } from '@/lib/user-chat-core'
import type { CustomerDeliveryPosture } from '@/lib/customers/delivery'

type DeliveryOutcome = 'deliver' | 'clarify' | 'block' | 'retryable_failure'

type CriticDecision = {
  pass: boolean
  outcome: DeliveryOutcome
  reason: string | null
}

export type DeliveryEnvelope = {
  execution_id: string | null
  type: string
  summary: string
  error: string | null
  draft?: string | null
  meta: Record<string, unknown>
}

type DeliveryFinalizeOptions = {
  deliveryPosture?: CustomerDeliveryPosture | null
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

function trimSummary(summary: string, maxLen: number): string {
  if (summary.length <= maxLen) return summary
  return `${summary.slice(0, maxLen - 1).trimEnd()}...`
}

function buildDeliveryPostureMeta(deliveryPosture: CustomerDeliveryPosture | null | undefined): Record<string, unknown> | null {
  if (!deliveryPosture) return null
  return {
    customer_id: deliveryPosture.customer_id,
    delivery_version: deliveryPosture.delivery_version,
    summary_style: deliveryPosture.summary_style,
    next_action_style: deliveryPosture.next_action_style,
    review_copy_style: deliveryPosture.review_copy_style,
    citation_density: deliveryPosture.citation_density,
    file_path: deliveryPosture.file_path,
  }
}

function applyDeliverySummaryStyle(
  summary: string,
  criticDecision: CriticDecision,
  deliveryPosture: CustomerDeliveryPosture | null | undefined,
): string {
  const value = String(summary || '').trim()
  if (!value || !deliveryPosture) return value

  switch (deliveryPosture.summary_style) {
    case 'compact':
      return trimSummary(value, 96)
    case 'observer':
      return criticDecision.outcome === 'deliver'
        ? trimSummary(value, 110)
        : `Observer note: ${trimSummary(value, 110)}`
    case 'explainer':
      if (criticDecision.outcome === 'clarify') {
        return `${value} Add one more detail so the next answer can be grounded more precisely.`
      }
      return value
    default:
      return value
  }
}

function postureDefaultNextActions(
  criticDecision: CriticDecision,
  deliveryPosture: CustomerDeliveryPosture | null | undefined,
): string[] {
  if (!deliveryPosture) return []

  if (criticDecision.outcome === 'clarify') {
    return deliveryPosture.next_action_style === 'guided'
      ? ['补充一个更具体的上下文', '继续追问这个工作流', '切换到当前 customer workspace']
      : deliveryPosture.next_action_style === 'audit'
        ? ['补充一个更具体的查询范围', '查看 Audit', '查看 Interaction Log']
        : ['补充一个更具体的业务条件', '继续追问一个业务指标', '检查当前 customer 资源范围']
  }

  if (criticDecision.outcome === 'retryable_failure') {
    return deliveryPosture.next_action_style === 'guided'
      ? ['稍后重试', '打开 Customers workspace', '查看 Prompts']
      : deliveryPosture.next_action_style === 'audit'
        ? ['稍后重试', '打开 Audit', '查看 Costs']
        : ['稍后重试', '查看 KB Management', '查看 FAQ Review']
  }

  if (criticDecision.outcome === 'block') {
    return deliveryPosture.next_action_style === 'audit'
      ? ['查看 Audit', '检查 capability 边界', '查看 Interaction Log']
      : deliveryPosture.default_next_actions
  }

  return deliveryPosture.default_next_actions
}

function resolveNextActions(
  meta: Record<string, unknown>,
  criticDecision: CriticDecision,
  deliveryPosture?: CustomerDeliveryPosture | null,
): string[] {
  if (Array.isArray(meta.next_actions) && meta.next_actions.length > 0) {
    return meta.next_actions as string[]
  }

  const postureActions = postureDefaultNextActions(criticDecision, deliveryPosture)
  if (postureActions.length > 0) return postureActions

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

export function buildDeliveryEnvelope(
  body: Record<string, unknown>,
  criticDecision: CriticDecision,
  options: DeliveryFinalizeOptions = {},
): DeliveryEnvelope {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const intentType = String(meta.intent_type || '')
  const rawType = String(data.type || '')
  const executionId = typeof meta.execution_id === 'string' ? meta.execution_id : null
  const error = typeof data.error === 'string' ? data.error : typeof body.error === 'string' ? body.error : null
  const summary = applyDeliverySummaryStyle(
    String(data.summary || (error ? mapErrorToUserMessage(error) : body.error || '')).trim(),
    criticDecision,
    options.deliveryPosture,
  )
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
      next_actions: resolveNextActions(meta, criticDecision, options.deliveryPosture),
      highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
      delivery_posture: buildDeliveryPostureMeta(options.deliveryPosture),
    },
  }
}

export function finalizeDelivery(body: Record<string, unknown>, options: DeliveryFinalizeOptions = {}): Record<string, unknown> {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const criticDecision = evaluateCriticDecision(body)
  const deliveryEnvelope = buildDeliveryEnvelope(body, criticDecision, options)

  return {
    ...body,
    critic_decision: criticDecision,
    delivery_envelope: deliveryEnvelope,
    data: {
      ...data,
      summary: String(deliveryEnvelope.summary || data.summary || ''),
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
        delivery_posture: buildDeliveryPostureMeta(options.deliveryPosture),
      },
    },
  }
}
