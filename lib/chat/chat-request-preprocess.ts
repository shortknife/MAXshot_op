import { parseIntent } from '@/lib/intent-analyzer/intent-parsing'
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
  const parsed = await parseIntent(intentQuery)
  const normalizedIntent = normalizeChatIntent({
    parsed,
    intentQuery,
    previousTurns,
    looksLikeContentBrief,
  })
  const intentType = normalizedIntent.intentType
  parsed.intent.extracted_slots = normalizedIntent.extractedSlots
  const intentSlots = (parsed.intent.extracted_slots || {}) as Record<string, unknown>
  const canonicalIntentType = toCanonicalIntentType(intentType)
  const matchedCapabilityIds = extractMatchedCapabilityIds(intentSlots)
  const primaryCapabilityId = matchedCapabilityIds[0] || null
  const inScope = matchedCapabilityIds.length > 0 || intentSlots.in_scope !== false
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
  }
}
