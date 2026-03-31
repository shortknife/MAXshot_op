import { buildBusinessNextActionsByMode, buildBusinessNextActionsFromContract, buildEvidenceChain, inferMetricSemanticsFromContract, inferQueryMode } from '@/lib/chat/query-strategy'
import type { QueryContractLike } from '@/lib/chat/query-strategy'
import { buildUserOutcome, mapErrorToUserMessage } from '@/lib/user-chat-core'
import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { inferLegacyIntentTypeFromCapabilityIds } from '@/lib/router/capability-catalog'

type PromptMeta = { slug?: string; version?: string; source?: string; hash?: string } | null | undefined

function resolveCanonicalIntent(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
}) {
  if (params.canonicalIntentType) return params.canonicalIntentType
  const inferredIntent = inferLegacyIntentTypeFromCapabilityIds([
    ...(params.matchedCapabilityIds || []),
    params.primaryCapabilityId,
  ])
  return toCanonicalIntentType(inferredIntent !== 'out_of_scope' ? inferredIntent : params.intentType)
}

export function buildOutOfScopeBusinessResponse(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  memoryRefsRef?: string[]
}) {
  return {
    success: false,
    data: buildUserOutcome({
      type: 'ops',
      summary: '我目前仅支持 MAXshot 业务查询与运营任务。你可以继续问 Vault、Execution、Marketing 或产品定义相关问题。',
      rows: [],
      draft: null,
      error: 'out_of_scope',
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'rejected',
        intent_prompt: params.promptMeta || null,
        data_plane: 'business',
        memory_refs_ref: params.memoryRefsRef || [],
        next_actions: ['当前 vault APY 怎么样？', 'MAXshot 有哪些 vault 可以用？', '给我最近一笔 execution 详情'],
        audit_events: [
          {
            event_type: 'business_answer_rejected',
            reason: 'out_of_scope',
            data_plane: 'business',
          },
        ],
      },
    }),
  }
}

export function buildModelClarificationBusinessResponse(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  question: string
  options: string[]
  requiredSlots?: string[]
  turns: number
  maxTurns: number
  memoryRefsRef?: string[]
}) {
  return {
    success: false,
    data: buildUserOutcome({
      type: 'ops',
      summary: params.question,
      rows: [],
      draft: null,
      error: 'missing_required_clarification',
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'needs_clarification',
        intent_prompt: params.promptMeta || null,
        data_plane: 'business',
        memory_refs_ref: params.memoryRefsRef || [],
        timezone: 'Asia/Shanghai',
        required_slots: Array.isArray(params.requiredSlots) ? params.requiredSlots : [],
        clarification_complete: false,
        next_actions: params.options.length > 0 ? params.options : ['请给出时间范围', '请指定查询对象', '请说明希望的统计口径'],
        clarification: {
          turns: params.turns,
          max_turns: params.maxTurns,
          exhausted: false,
        },
        audit_events: [
          {
            event_type: 'business_clarification_requested',
            reason: 'model_requested_clarification',
          },
        ],
      },
    }),
  }
}

export function buildBusinessFailureResponse(params: {
  reason: string
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  followUpContextApplied: boolean
  intentQuery: string
  scope: string
  clarificationAutoAssumed: boolean
  outputNextActions?: string[]
  memoryRefsRef?: string[]
  queryContract?: QueryContractLike | null
  criticDecision?: unknown
}) {
  const queryMode = inferQueryMode(params.intentQuery, params.scope)
  const resolvedQueryMode =
    (params.queryContract as { query_mode?: 'metrics' | 'investigate' | 'lookup' } | null | undefined)?.query_mode ||
    queryMode
  const defaultActions =
    params.reason === 'no_data_in_selected_range'
      ? ['换一个时间范围重试', '改查最近7天或最近30天', '指定 chain / protocol / vault 缩小范围']
      : buildBusinessNextActionsFromContract(params.queryContract, false) ||
        buildBusinessNextActionsByMode(params.scope, resolvedQueryMode, false)
  return {
    success: false,
    data: buildUserOutcome({
      type: 'ops',
      summary: mapErrorToUserMessage(params.reason),
      rows: [],
      draft: null,
      error: params.reason,
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'rejected',
        intent_prompt: params.promptMeta || null,
        data_plane: 'business',
        memory_refs_ref: params.memoryRefsRef || [],
        follow_up_context_applied: params.followUpContextApplied,
        query_mode: resolvedQueryMode,
        metric_semantics: inferMetricSemanticsFromContract(params.queryContract, params.scope),
        timezone: 'Asia/Shanghai',
        clarification_auto_assumed: params.clarificationAutoAssumed,
        query_contract: params.queryContract || null,
        critic_decision: params.criticDecision || null,
        evidence_chain: buildEvidenceChain(params.scope, resolvedQueryMode, params.intentQuery),
        next_actions: params.outputNextActions || defaultActions,
        audit_events: [
          {
            event_type: 'business_answer_rejected',
            reason: params.reason,
            data_plane: 'business',
          },
        ],
      },
    }),
  }
}
