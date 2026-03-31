import { assembleContextEnvelope } from '@/lib/chat/context-manager/context-assembler'
import { resolveContextPolicy } from '@/lib/chat/context-manager/context-policy'
import { runRecallAdapter } from '@/lib/chat/context-manager/recall-adapter'
import { resolveSession } from '@/lib/chat/context-manager/session-resolver'
import { classifyTurnRelation } from '@/lib/chat/context-manager/turn-relation-classifier'
import type { ActiveContextSnapshot, ContextEnvelope, PendingClarificationSnapshot, TurnRelation } from '@/lib/chat/context-manager/types'
import {
  clearClarificationState,
  getClarificationStateSnapshot,
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
      metric: null,
      chain: null,
      protocol: null,
      vault_name: null,
      compare_targets: [],
      time_window_days: null,
      aggregation: null,
      exact_day: null,
      date_from: null,
      date_to: null,
      updated_at: null,
    }
  }
  return {
    scope: String(ctx.scope || '').trim() || null,
    query_mode: String(ctx.query_mode || '').trim() || null,
    metric: String(ctx.metric || '').trim() || null,
    chain: String(ctx.chain || '').trim() || null,
    protocol: String(ctx.protocol || '').trim() || null,
    vault_name: String(ctx.vault_name || '').trim() || null,
    compare_targets: Array.isArray(ctx.compare_targets) ? ctx.compare_targets.map((value) => String(value || '').trim()).filter(Boolean) : [],
    time_window_days: typeof ctx.time_window_days === 'number' ? ctx.time_window_days : null,
    aggregation: String(ctx.aggregation || '').trim() || null,
    exact_day: String(ctx.exact_day || '').trim() || null,
    date_from: String(ctx.date_from || '').trim() || null,
    date_to: String(ctx.date_to || '').trim() || null,
    updated_at: typeof ctx.updated_at === 'number' ? ctx.updated_at : null,
  }
}

function buildPendingClarificationSnapshot(sessionId: string | null): PendingClarificationSnapshot {
  return getClarificationStateSnapshot(sessionId)
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
  const effectiveQuery = params.rawQuery
  const intentQuery = params.rawQuery
  const recentTurnsSummary = [
    ...(pendingClarification.original_query
      ? [{ role: 'user', content: pendingClarification.original_query }]
      : []),
    ...(
      activeContext.scope
        ? [{
            role: 'assistant',
            content: `active_context: scope=${activeContext.scope}; query_mode=${activeContext.query_mode || 'metrics'}; metric=${activeContext.metric || 'none'}; time_window_days=${activeContext.time_window_days ?? 'none'}; aggregation=${activeContext.aggregation || 'none'}; exact_day=${activeContext.exact_day || 'none'}; date_from=${activeContext.date_from || 'none'}; date_to=${activeContext.date_to || 'none'}; chain=${activeContext.chain || 'none'}; protocol=${activeContext.protocol || 'none'}; vault_name=${activeContext.vault_name || 'none'}; compare_targets=${activeContext.compare_targets.join('|') || 'none'}`,
          }]
        : []
    ),
  ]
  const turnRelation: TurnRelation = await classifyTurnRelation({
    rawQuery: params.rawQuery,
    pendingClarification,
    activeContextSummary: activeContext,
    threadAction: sessionResolution.thread_action,
    recentTurnsSummary,
  })
  const previousTurns =
    pendingClarification.exists
      ? pendingClarification.turns
      : activeContext.scope && !['new_session', 'new_topic_same_window'].includes(turnRelation.type)
        ? 1
        : 0
  const { policy_decision, effective_query_policy } = resolveContextPolicy(turnRelation.type)
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
    recentTurnsSummary,
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
