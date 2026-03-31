import { parseIntent, toIntentHarnessResult, type IntentHarnessResult } from '@/lib/intent-analyzer/intent-parsing'
import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { normalizeChatIntent } from '@/lib/chat/intent-compat'
import { extractMatchedCapabilityIds } from '@/lib/chat/chat-intent-lane'
import { assembleContextEnvelope } from '@/lib/chat/context-manager/context-assembler'
import { buildConversationContext } from '@/lib/chat/context-manager'
import type { ContextEnvelope, SessionResolution, TurnRelation } from '@/lib/chat/context-manager/types'

type PromptMeta = {
  slug?: string
  version?: string
  source?: string
  hash?: string
} | null

function inferPendingTimeWindowDays(baseQuery: string | null): number | null {
  const text = String(baseQuery || '').trim()
  const recentMatch = text.match(/最近\s*(\d+)\s*天/)
  if (recentMatch?.[1]) return Number(recentMatch[1])
  if (/今天(?:（Asia\/Shanghai）)?/.test(text)) return 1
  return null
}

function mergeInheritedBusinessSlots(params: {
  intentSlots: Record<string, unknown>
  followUpContextApplied: boolean
  activeContext: ContextEnvelope['conversation_context']['active_context']
  pendingClarification: ContextEnvelope['conversation_context']['pending_clarification']
}): Record<string, unknown> {
  const { intentSlots, followUpContextApplied, activeContext, pendingClarification } = params
  const inheritedBusinessScope = activeContext.scope || pendingClarification.scope
  if (!followUpContextApplied && !pendingClarification.exists) return intentSlots
  if (!inheritedBusinessScope) return intentSlots

  const merged = { ...intentSlots }
  const mergedScope = String(merged.scope || '').trim().toLowerCase()
  if (!mergedScope || mergedScope === 'unknown') merged.scope = inheritedBusinessScope
  if (!String(merged.query_mode || '').trim() && activeContext.query_mode) merged.query_mode = activeContext.query_mode
  if (!String(merged.metric || '').trim() && activeContext.metric) merged.metric = activeContext.metric
  if (
    merged.time_window_days == null &&
    typeof activeContext.time_window_days === 'number' &&
    Number.isFinite(activeContext.time_window_days)
  ) {
    merged.time_window_days = activeContext.time_window_days
  }
  if (merged.time_window_days == null && pendingClarification.exists) {
    const pendingTimeWindowDays = inferPendingTimeWindowDays(pendingClarification.original_query)
    if (pendingTimeWindowDays) merged.time_window_days = pendingTimeWindowDays
  }
  if (!String(merged.aggregation || merged.metric_agg || '').trim() && activeContext.aggregation) {
    merged.metric_agg = activeContext.aggregation
  }
  if (!String(merged.exact_day || '').trim() && activeContext.exact_day) merged.exact_day = activeContext.exact_day
  if (!String(merged.date_from || '').trim() && activeContext.date_from) merged.date_from = activeContext.date_from
  if (!String(merged.date_to || '').trim() && activeContext.date_to) merged.date_to = activeContext.date_to
  if (!String(merged.chain || '').trim() && activeContext.chain) merged.chain = activeContext.chain
  if (!String(merged.protocol || '').trim() && activeContext.protocol) merged.protocol = activeContext.protocol
  if (!String(merged.vault_name || '').trim() && activeContext.vault_name) merged.vault_name = activeContext.vault_name
  const currentCompareTargets = Array.isArray(merged.compare_targets)
    ? merged.compare_targets.map((value: unknown) => String(value || '').trim()).filter(Boolean)
    : []
  if (!currentCompareTargets.length && Array.isArray(activeContext.compare_targets) && activeContext.compare_targets.length > 0) {
    merged.compare_targets = [...activeContext.compare_targets]
  }

  const matchedIds = Array.isArray(merged.matched_capability_ids)
    ? merged.matched_capability_ids.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  if (!matchedIds.length && inheritedBusinessScope) {
    merged.matched_capability_ids = ['capability.data_fact_query']
    merged.matched_capability_id = 'capability.data_fact_query'
    merged.in_scope = true
  }
  return merged
}

export type PreparedChatRequest = {
  rawQuery: string
  sessionId: string | null
  effectiveQuery: string
  intentQuery: string
  previousTurns: number
  parsed: {
    intent: { extracted_slots?: Record<string, unknown> }
    prompt_meta?: PromptMeta
  }
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
  intentSlots: Record<string, unknown>
  inScope: boolean
  modelNeedClarification: boolean
  modelClarificationQuestion: string
  modelClarificationOptions: string[]
  followUpContextApplied: boolean
  sessionResolution: SessionResolution
  turnRelation: TurnRelation
  contextEnvelope: ContextEnvelope
  step3: IntentHarnessResult
}

function buildIntentSessionContext(envelope: ContextEnvelope): string {
  return JSON.stringify({
    turn_relation: envelope.turn_relation,
    pending_clarification: envelope.conversation_context.pending_clarification,
    active_context: envelope.conversation_context.active_context,
    recent_turns_summary: envelope.conversation_context.recent_turns_summary,
    registry_context: envelope.registry_context,
    memory_runtime: envelope.memory_runtime,
    policy_decision: envelope.policy_decision,
  })
}

export async function prepareChatRequest(params: {
  rawQuery: string
  sessionId: string | null
  looksLikeContentBrief: (rawQuery: string) => boolean
}): Promise<PreparedChatRequest> {
  const { rawQuery, sessionId, looksLikeContentBrief } = params
  const builtContext = await buildConversationContext({
    rawQuery,
    sessionId,
    matchedCapabilityIds: [],
  })
  const { effectiveQuery, previousTurns, intentQuery, followUpContextApplied, sessionResolution, turnRelation } = builtContext
  const parsed = await parseIntent(intentQuery, buildIntentSessionContext(builtContext.contextEnvelope))
  const normalizedIntent = normalizeChatIntent({
    parsed,
    intentQuery,
    previousTurns,
    looksLikeContentBrief,
  })
  const intentType = normalizedIntent.intentType
  parsed.intent.extracted_slots = mergeInheritedBusinessSlots({
    intentSlots: normalizedIntent.extractedSlots,
    followUpContextApplied,
    activeContext: builtContext.contextEnvelope.conversation_context.active_context,
    pendingClarification: builtContext.contextEnvelope.conversation_context.pending_clarification,
  })
  const intentSlots = (parsed.intent.extracted_slots || {}) as Record<string, unknown>
  const canonicalIntentType = toCanonicalIntentType(intentType)
  const matchedCapabilityIds = extractMatchedCapabilityIds(intentSlots)
  const primaryCapabilityId = matchedCapabilityIds[0] || null
  const inScope = matchedCapabilityIds.length > 0 || intentSlots.in_scope !== false
  const step3: IntentHarnessResult = {
    intent_type: intentType as IntentHarnessResult['intent_type'],
    matched_capability_ids: matchedCapabilityIds,
    matched_capability_id: primaryCapabilityId,
    in_scope: inScope,
    need_clarification: intentSlots.need_clarification === true,
    clarification_question: String(intentSlots.clarification_question || '').trim(),
    clarification_options: Array.isArray(intentSlots.clarification_options)
      ? (intentSlots.clarification_options as unknown[]).map((v) => String(v)).filter(Boolean).slice(0, 3)
      : [],
    slots: intentSlots,
    confidence: Number(parsed.intent?.confidence || 0),
    raw_query: rawQuery,
    trace: toIntentHarnessResult(parsed, buildIntentSessionContext(builtContext.contextEnvelope)).trace,
  }
  const contextEnvelope = assembleContextEnvelope({
    sessionResolution,
    turnRelation,
    effectiveQuery,
    pendingClarification: builtContext.contextEnvelope.conversation_context.pending_clarification,
    activeContext: builtContext.contextEnvelope.conversation_context.active_context,
    policyDecision: builtContext.contextEnvelope.policy_decision,
    effectiveQueryPolicy: builtContext.contextEnvelope.effective_query_policy,
    recall: builtContext.contextEnvelope.recall,
    matchedCapabilityIds,
  })

  return {
    rawQuery,
    sessionId: sessionResolution.session_id,
    effectiveQuery,
    intentQuery,
    previousTurns,
    parsed,
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    intentSlots,
    inScope,
    modelNeedClarification: intentSlots.need_clarification === true,
    modelClarificationQuestion: String(intentSlots.clarification_question || '').trim(),
    modelClarificationOptions: Array.isArray(intentSlots.clarification_options)
      ? (intentSlots.clarification_options as unknown[]).map((v) => String(v)).filter(Boolean).slice(0, 3)
      : [],
    followUpContextApplied,
    sessionResolution,
    turnRelation,
    contextEnvelope,
    step3,
  }
}
