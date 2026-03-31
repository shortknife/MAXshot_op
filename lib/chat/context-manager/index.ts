import { assembleContextEnvelope } from '@/lib/chat/context-manager/context-assembler'
import { resolveContextPolicy } from '@/lib/chat/context-manager/context-policy'
import { runRecallAdapter } from '@/lib/chat/context-manager/recall-adapter'
import { resolveSession } from '@/lib/chat/context-manager/session-resolver'
import { classifyTurnRelation } from '@/lib/chat/context-manager/turn-relation-classifier'
import type { ActiveContextSnapshot, ContextEnvelope, PendingClarificationSnapshot, TurnRelation } from '@/lib/chat/context-manager/types'
import {
  clearClarificationState,
  getClarificationStateSnapshot,
  hasTimeWindow,
  hasYieldGranularity,
} from '@/lib/chat/query-clarification'
import { getBusinessSessionContextSnapshot } from '@/lib/chat/session-context'

export type BuiltConversationContext = {
  sessionId: string | null
  effectiveQuery: string
  intentQuery: string
  previousTurns: number
  followUpContextApplied: boolean
  sessionResolution: ReturnType<typeof resolveSession>
  turnRelation: TurnRelation
  contextEnvelope: ContextEnvelope
}

function buildActiveContextSnapshot(sessionId: string | null): ActiveContextSnapshot {
  const ctx = getBusinessSessionContextSnapshot(sessionId)
  if (!ctx) {
    return {
      scope: null,
      query_mode: null,
      chain: null,
      protocol: null,
      vault_name: null,
      time_window_days: null,
      aggregation: null,
      updated_at: null,
    }
  }
  return {
    scope: String(ctx.scope || '').trim() || null,
    query_mode: String(ctx.query_mode || '').trim() || null,
    chain: String(ctx.chain || '').trim() || null,
    protocol: String(ctx.protocol || '').trim() || null,
    vault_name: String(ctx.vault_name || '').trim() || null,
    time_window_days: typeof ctx.time_window_days === 'number' ? ctx.time_window_days : null,
    aggregation: String(ctx.aggregation || '').trim() || null,
    updated_at: typeof ctx.updated_at === 'number' ? ctx.updated_at : null,
  }
}

function buildPendingClarificationSnapshot(sessionId: string | null): PendingClarificationSnapshot {
  return getClarificationStateSnapshot(sessionId)
}

function buildLegacyContinuationIntentQuery(params: {
  intentQuery: string
  turnRelation: TurnRelation
  activeContext: ActiveContextSnapshot
}): string {
  let query = params.intentQuery
  if (!['continuation', 'correction'].includes(params.turnRelation.type)) return query
  const lower = query.toLowerCase()
  if (params.activeContext.scope !== 'yield') return query
  const hasYieldMetricWord = /(apy|收益|yield)/i.test(query)
  const hasConstraintWord = /(看|只看|比较|对比|and|vs|versus|筛选|过滤|maxshot|dforce|arbitrum|ethereum|base|optimism|plasma|solana|morpho|aave|euler|unitus)/i.test(
    query
  )
  if (!hasYieldMetricWord && !hasConstraintWord) return query
  if (!hasYieldMetricWord) {
    query = `${query} APY`
  }
  if (!hasTimeWindow(lower) && typeof params.activeContext.time_window_days === 'number') {
    query = `${query} 最近${params.activeContext.time_window_days}天`
  }
  if (!hasYieldGranularity(lower) && !/(最高|最低|max|min|平均|均值|实时|当前|最新|avg|average|latest|realtime)/i.test(query)) {
    const agg = String(params.activeContext.aggregation || '').toLowerCase()
    if (agg === 'max') query = `${query} 最高 APY`
    else if (agg === 'min') query = `${query} 最低 APY`
    else if (agg === 'realtime' || agg === 'latest') query = `${query} 实时 APY`
    else query = `${query} 平均 APY`
  }
  return query
}

export async function buildConversationContext(params: {
  rawQuery: string
  sessionId: string | null
  matchedCapabilityIds?: string[]
}): Promise<BuiltConversationContext> {
  const sessionResolution = resolveSession({
    rawQuery: params.rawQuery,
    sessionId: params.sessionId,
  })

  if (sessionResolution.thread_action === 'reset') {
    clearClarificationState(sessionResolution.session_id)
  }

  const pendingClarification = buildPendingClarificationSnapshot(sessionResolution.session_id)
  const activeContext = buildActiveContextSnapshot(sessionResolution.session_id)
  const previousTurns = pendingClarification.turns
  const effectiveQuery = params.rawQuery
  let intentQuery = params.rawQuery
  const recentTurnsSummary = [
    ...(pendingClarification.original_query
      ? [{ role: 'user', content: pendingClarification.original_query }]
      : []),
  ]
  const turnRelation: TurnRelation = await classifyTurnRelation({
    rawQuery: params.rawQuery,
    pendingClarification,
    activeContextSummary: activeContext,
    threadAction: sessionResolution.thread_action,
    recentTurnsSummary,
  })
  const { policy_decision, effective_query_policy } = resolveContextPolicy(turnRelation.type)
  const canUseLegacyClarificationFallback =
    pendingClarification.exists &&
    Boolean(pendingClarification.original_query) &&
    ['clarification_reply', 'correction'].includes(turnRelation.type)
  if (canUseLegacyClarificationFallback) {
    intentQuery = `${pendingClarification.original_query}；补充条件：${params.rawQuery}`
  }
  intentQuery = buildLegacyContinuationIntentQuery({
    intentQuery,
    turnRelation,
    activeContext,
  })
  if (policy_decision.clear_pending_clarification) {
    clearClarificationState(sessionResolution.session_id)
  }
  const followUpContextApplied =
    policy_decision.inherit_context &&
    turnRelation.type !== 'new_session' &&
    turnRelation.type !== 'new_topic_same_window'
  const recall =
    policy_decision.trigger_recall
      ? runRecallAdapter({
          rawQuery: params.rawQuery,
          activeContext,
          recentTurnsSummary,
        })
      : null
  const contextEnvelope = assembleContextEnvelope({
    sessionResolution,
    turnRelation,
    effectiveQuery,
    pendingClarification,
    activeContext,
    policyDecision: policy_decision,
    effectiveQueryPolicy: effective_query_policy,
    recall,
    matchedCapabilityIds: params.matchedCapabilityIds || [],
  })

  return {
    sessionId: sessionResolution.session_id,
    effectiveQuery,
    intentQuery,
    previousTurns,
    followUpContextApplied,
    sessionResolution,
    turnRelation,
    contextEnvelope,
  }
}
