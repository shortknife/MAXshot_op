import {
  buildUserOutcome,
  rewriteDraft,
} from '@/lib/user-chat-core'
import {
  getClarificationSessionId,
} from '@/lib/chat/query-clarification'
import { looksLikeContentBrief } from '@/lib/chat/chat-route-helpers'
import { handleBusinessIntent } from '@/lib/chat/handlers/business-intent-handler'
import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'
import { buildEarlyGateResponse, resolveMaxClarificationTurns } from '@/lib/chat/chat-request-gates'
import { dispatchNonBusinessIntent } from '@/lib/chat/handlers/non-business-intent-dispatcher'
import { ensureCanonicalIntentMeta } from '@/lib/chat/chat-response-normalize'
import { finalizeDelivery } from '@/lib/chat/delivery-critic'

export type ChatAskServiceResult = {
  status: number
  body: unknown
}

export async function runChatAsk(body: Record<string, unknown>): Promise<ChatAskServiceResult> {
  const rawQuery = String(body?.raw_query || '').trim()
  const rewriteAction = String(body?.rewrite_action || '').trim()
  const draft = String(body?.draft || '').trim()
  const sessionId = getClarificationSessionId(body?.session_id)
  const finalize = (payload: Record<string, unknown>) => finalizeDelivery(payload)

  if (rewriteAction) {
    const rewritten = rewriteDraft(draft, rewriteAction)
    return {
      status: 200,
      body: finalize({
        success: true,
        data: buildUserOutcome({
          type: 'marketing',
          summary: '已完成改写。',
          draft: rewritten,
          meta: { rewrite_action: rewriteAction },
        }),
      }),
    }
  }

  if (!rawQuery) {
    return {
      status: 400,
      body: { error: 'Missing raw_query' },
    }
  }

  const prepared = await prepareChatRequest({
    rawQuery,
    sessionId,
    looksLikeContentBrief,
  })
  const {
    effectiveQuery,
    intentQuery,
    previousTurns,
    parsed,
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    modelNeedClarification,
    followUpContextApplied,
  } = prepared
  const maxClarificationTurns = resolveMaxClarificationTurns()
  const gateResponse = buildEarlyGateResponse({
    prepared,
    maxClarificationTurns,
  })
  const modelClarificationExhausted = gateResponse
    ? gateResponse.modelClarificationExhausted
    : previousTurns + 1 >= maxClarificationTurns

  if (gateResponse) {
    return {
      status: 200,
      body: finalize(ensureCanonicalIntentMeta(
        gateResponse.body,
        intentType,
        canonicalIntentType,
        matchedCapabilityIds,
        primaryCapabilityId
      )),
    }
  }

  const businessHandled = await handleBusinessIntent({
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    parsed,
    rawQuery,
    effectiveQuery,
    intentQuery,
    previousTurns,
    sessionId,
    maxClarificationTurns,
    modelNeedClarification,
    modelClarificationExhausted,
    followUpContextApplied,
  })
  if (businessHandled.handled) {
    return {
      status: 200,
      body: finalize(ensureCanonicalIntentMeta(
        businessHandled.body,
        intentType,
        canonicalIntentType,
        matchedCapabilityIds,
        primaryCapabilityId
      )),
    }
  }

  const nonBusinessBody = await dispatchNonBusinessIntent({
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    parsed,
    rawQuery,
  })
  return {
    status: 200,
    body: finalize(ensureCanonicalIntentMeta(
      nonBusinessBody,
      intentType,
      canonicalIntentType,
      matchedCapabilityIds,
      primaryCapabilityId
    )),
  }
}
