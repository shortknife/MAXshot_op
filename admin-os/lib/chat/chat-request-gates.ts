import { getBusinessFollowUpPolicy } from '@/lib/capabilities/semantic-index'
import { buildBusinessMemoryRefs, resolveBusinessIntentId } from '@/lib/capabilities/semantic-index'
import { buildModelClarificationBusinessResponse, buildOutOfScopeBusinessResponse } from '@/lib/chat/business-response'
import { resolveChatIntentLane } from '@/lib/chat/chat-intent-lane'
import type { PreparedChatRequest } from '@/lib/chat/chat-request-preprocess'
import type { CustomerClarificationPosture } from '@/lib/customers/clarification'

export function resolveMaxClarificationTurns(): number {
  const followUpPolicy = getBusinessFollowUpPolicy() || {}
  return typeof followUpPolicy.max_clarification_turns === 'number' && followUpPolicy.max_clarification_turns > 0
    ? Math.floor(followUpPolicy.max_clarification_turns)
    : 2
}

export function buildEarlyGateResponse(params: {
  prepared: Pick<
    PreparedChatRequest,
    | 'inScope'
    | 'intentType'
    | 'canonicalIntentType'
    | 'matchedCapabilityIds'
    | 'primaryCapabilityId'
    | 'parsed'
    | 'intentQuery'
    | 'previousTurns'
    | 'modelNeedClarification'
    | 'modelClarificationQuestion'
    | 'modelClarificationOptions'
  >
  maxClarificationTurns: number
  clarificationPosture?: CustomerClarificationPosture | null
}): {
  body: unknown
  modelClarificationExhausted: boolean
} | null {
  const { prepared, maxClarificationTurns, clarificationPosture } = params
  const clarificationTurns = prepared.previousTurns + 1
  const modelClarificationExhausted = clarificationTurns >= maxClarificationTurns
  const scope = String(prepared.parsed?.intent?.extracted_slots?.scope || 'unknown')
  const lane = resolveChatIntentLane({
    intentType: prepared.intentType,
    canonicalIntentType: prepared.canonicalIntentType,
    extractedSlots: prepared.parsed?.intent?.extracted_slots,
  })
  const semanticIntentId = resolveBusinessIntentId(prepared.intentQuery, scope)
  const memoryRefsRef =
    prepared.primaryCapabilityId === 'capability.data_fact_query'
      ? buildBusinessMemoryRefs(semanticIntentId)
          .map((ref) => String((ref as { id?: string } | null)?.id || '').trim())
          .filter(Boolean)
      : []

  if (!prepared.inScope || prepared.intentType === 'out_of_scope') {
    return {
      body: buildOutOfScopeBusinessResponse({
        intentType: prepared.intentType,
        canonicalIntentType: prepared.canonicalIntentType,
        primaryCapabilityId: prepared.primaryCapabilityId,
        matchedCapabilityIds: prepared.matchedCapabilityIds,
        promptMeta: prepared.parsed.prompt_meta || null,
        memoryRefsRef,
      }),
      modelClarificationExhausted,
    }
  }

  if (
    lane === 'business' &&
    prepared.primaryCapabilityId !== 'capability.data_fact_query' &&
    prepared.modelNeedClarification &&
    prepared.modelClarificationQuestion &&
    !modelClarificationExhausted
  ) {
    return {
      body: buildModelClarificationBusinessResponse({
        intentType: prepared.intentType,
        canonicalIntentType: prepared.canonicalIntentType,
        primaryCapabilityId: prepared.primaryCapabilityId,
        matchedCapabilityIds: prepared.matchedCapabilityIds,
        promptMeta: prepared.parsed.prompt_meta || null,
        question: prepared.modelClarificationQuestion,
        options: prepared.modelClarificationOptions,
        turns: clarificationTurns,
        maxTurns: maxClarificationTurns,
        memoryRefsRef,
      }),
      modelClarificationExhausted,
    }
  }

  return null
}
