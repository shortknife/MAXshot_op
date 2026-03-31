import { IntentAnalysisResult, callDeepSeek } from './deepseek-client'
import { toCanonicalIntentType } from './intent-taxonomy'
import { resolveCapabilityIds, MAX_MATCHED_CAPABILITIES } from '@/lib/router/capability-catalog'
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance'

export const OFFICIAL_STEP3_INTENT_TYPES = [
  'business_query',
  'general_qna',
  'out_of_scope',
  'content_brief',
  'marketing_gen',
] as const

export type OfficialStep3IntentType = (typeof OFFICIAL_STEP3_INTENT_TYPES)[number]

export type IntentHarnessTrace = {
  analyzer: 'intent-analyzer'
  source: 'supabase' | 'fallback_csv' | 'local_stub'
  prompt_slug: string | null
  prompt_version: string | null
  prompt_hash: string | null
  session_context_present: boolean
  tokens_used: number
}

export type IntentHarnessResult = {
  intent_type: OfficialStep3IntentType
  matched_capability_ids: string[]
  matched_capability_id: string | null
  in_scope: boolean
  need_clarification: boolean
  clarification_question: string
  clarification_options: string[]
  slots: Record<string, unknown>
  confidence: number
  raw_query: string
  trace: IntentHarnessTrace
}

export async function parseIntent(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  const perf = createPerfTrace('intent.parse', buildPerfQueryMeta(rawQuery, { has_session_context: Boolean(sessionContext) }))
  try {
    const result = await perf.measure('call_deepseek', () => callDeepSeek(rawQuery, sessionContext))

    await perf.measure('validate_intent_output', () => Promise.resolve(validateIntentOutput(result.intent)))
    result.intent.extracted_slots = await perf.measure('apply_mvp_complexity_guard', () => Promise.resolve(applyMvpComplexityGuard(rawQuery, result.intent.extracted_slots || {})))
    // Compatibility/audit field only.
    // Downstream runtime decisions should prefer matched capability ids over this canonical label.
    result.intent.extracted_slots = {
      ...(result.intent.extracted_slots || {}),
      intent_type_canonical: toCanonicalIntentType(result.intent.type),
    }

    perf.finish({ intent_type: result.intent.type, prompt_source: result.prompt_meta?.source || 'unknown' })
    return result
  } catch (error) {
    perf.fail(error)
    const degradedCapabilityIds = resolveCapabilityIds(['capability.product_doc_qna'], MAX_MATCHED_CAPABILITIES)
    return {
      intent: {
        type: 'general_qna',
        extracted_slots: {
          in_scope: true,
          degraded: true,
          reason: 'intent_analyzer_failed',
          matched_capability_ids: degradedCapabilityIds,
          matched_capability_id: degradedCapabilityIds[0] || null,
          need_clarification: true,
          clarification_question: '我这轮的语义识别暂时不稳定。请你换一种更具体的说法，或直接说明你要查什么指标/对象。',
          clarification_options: ['例如：查最近7天的平均APY', '例如：看 Base 链上的 Vault 列表', '例如：解释什么是 MAXshot'],
        },
        confidence: 0.3,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: {
        slug: 'intent_analyzer',
        version: '0',
        source: 'local_stub',
      },
    }
  }
}

export function toIntentHarnessResult(result: IntentAnalysisResult, sessionContext?: string): IntentHarnessResult {
  const slots = { ...(result.intent.extracted_slots || {}) }
  const matchedCapabilityIds = Array.isArray(slots.matched_capability_ids)
    ? slots.matched_capability_ids.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 3)
    : typeof slots.matched_capability_id === 'string' && slots.matched_capability_id.trim()
      ? [String(slots.matched_capability_id).trim()]
      : []
  const matchedCapabilityId = matchedCapabilityIds[0] || null
  const inScope = slots.in_scope !== false && (matchedCapabilityIds.length > 0 || result.intent.type !== 'out_of_scope')
  const needClarification = slots.need_clarification === true
  return {
    intent_type: result.intent.type as OfficialStep3IntentType,
    matched_capability_ids: matchedCapabilityIds,
    matched_capability_id: matchedCapabilityId,
    in_scope: inScope,
    need_clarification: needClarification,
    clarification_question: String(slots.clarification_question || ''),
    clarification_options: Array.isArray(slots.clarification_options)
      ? slots.clarification_options.map((value) => String(value)).filter(Boolean).slice(0, 3)
      : [],
    slots,
    confidence: result.intent.confidence,
    raw_query: result.raw_query,
    trace: {
      analyzer: 'intent-analyzer',
      source: result.prompt_meta?.source || 'local_stub',
      prompt_slug: result.prompt_meta?.slug || null,
      prompt_version: result.prompt_meta?.version || null,
      prompt_hash: result.prompt_meta?.hash || null,
      session_context_present: Boolean(sessionContext),
      tokens_used: result.tokens_used ?? 0,
    },
  }
}

function validateIntentOutput(intent: { type: string; extracted_slots: Record<string, unknown>; confidence: number }) {
  if (!intent.type) {
    throw new Error('Intent type is required')
  }

  if (!intent.extracted_slots || typeof intent.extracted_slots !== 'object') {
    throw new Error('extracted_slots must be an object')
  }

  if (typeof intent.confidence !== 'number' || intent.confidence < 0 || intent.confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1')
  }

  const validIntentTypes: string[] = [...OFFICIAL_STEP3_INTENT_TYPES]

  if (!validIntentTypes.includes(intent.type)) {
    throw new Error(`Invalid intent type: ${intent.type}`)
  }
}

export async function parseIntentWithSession(rawQuery: string, sessionId: string): Promise<IntentAnalysisResult> {
  return parseIntent(rawQuery, sessionId)
}

function applyMvpComplexityGuard(rawQuery: string, slots: Record<string, unknown>): Record<string, unknown> {
  const text = String(rawQuery || '').trim()
  if (!text) return slots

  const scope = String(slots.scope || '').trim().toLowerCase()
  const metric = String(slots.metric || '').trim().toLowerCase()
  const hasAverage = /(平均|均值|avg|average)/i.test(text)
  const hasHighLowCombo = /(最高|max)/i.test(text) && /(最低|min)/i.test(text)
  const hasPeriodCompare = /比较|对比|vs|versus/i.test(text)
  const hasCrossMonth =
    /(?:\d{1,2}月).*(?:和|与|到|至|-|~).*(?:\d{1,2}月)/.test(text) ||
    /(?:2月份和3月份|3月份和2月份)/.test(text)
  const hasDeltaRanking = /(提高最多|增长最多|变化最大|增幅最大)/.test(text)

  if ((scope === 'yield' || metric === 'apy' || metric === 'tvl') && hasAverage && hasHighLowCombo) {
    return {
      ...slots,
      need_clarification: true,
      clarification_question: '这个问题同时包含多个统计目标。当前请先指定一个主目标：月均值，还是最高/最低。',
      clarification_options: ['先看月均值', '先看最高和最低', '拆成两个问题'],
      required_slots: ['primary_goal'],
      mvp_guard_reason: 'multi_goal_metric',
    }
  }

  if ((metric === 'tvl' || metric === 'apy' || scope === 'vault' || scope === 'yield') && hasPeriodCompare && hasCrossMonth && hasDeltaRanking) {
    return {
      ...slots,
      need_clarification: true,
      clarification_question: '这个问题同时包含跨时间比较、增量排序和统计口径。当前请先指定一个主目标。',
      clarification_options: ['先看两个月各自最高值', '先看谁提升最多', '先看逐月对比'],
      required_slots: ['primary_goal'],
      mvp_guard_reason: 'cross_period_delta_ranking',
    }
  }

  return slots
}
