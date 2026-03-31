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
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance'

export type ChatAskServiceResult = {
  status: number
  body: unknown
}

export async function runChatAsk(body: Record<string, unknown>): Promise<ChatAskServiceResult> {
  const rawQuery = String(body?.raw_query || '').trim()
  const perf = createPerfTrace('chat.ask.service', buildPerfQueryMeta(rawQuery))
  const rewriteAction = String(body?.rewrite_action || '').trim()
  const draft = String(body?.draft || '').trim()
  const sessionId = getClarificationSessionId(body?.session_id)
  const finalize = (payload: Record<string, unknown>) => finalizeDelivery(payload)
  const normalizeAndFinalize = (payload: unknown) =>
    finalize(
      ensureCanonicalIntentMeta(
        payload,
        intentType,
        canonicalIntentType,
        matchedCapabilityIds,
        primaryCapabilityId
      ) as Record<string, unknown>
    )

  if (rewriteAction) {
    perf.stage('rewrite_action', { rewrite_action: rewriteAction })
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

  const prepared = await perf.measure('prepare_chat_request', () => prepareChatRequest({
    rawQuery,
    sessionId,
    looksLikeContentBrief,
  }))
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
    const gateMeta = (gateResponse.body as { data?: { meta?: { exit_type?: string } } } | null)?.data?.meta
    perf.stage('early_gate_response', { gate_type: String(gateMeta?.exit_type || 'early_gate') })
    return {
      status: 200,
      body: normalizeAndFinalize(gateResponse.body),
    }
  }

  const businessHandled = await perf.measure('handle_business_intent', () => handleBusinessIntent({
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
  }))
  if (businessHandled.handled) {
    perf.finish({ handled: 'business', intent_type: intentType, canonical_intent_type: canonicalIntentType })
    return {
      status: 200,
      body: normalizeAndFinalize(businessHandled.body),
    }
  }

  const nonBusinessBody = await perf.measure('dispatch_non_business_intent', () => dispatchNonBusinessIntent({
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    parsed,
    rawQuery,
  }))
  perf.finish({ handled: 'non_business', intent_type: intentType, canonical_intent_type: canonicalIntentType })
  return {
    status: 200,
    body: normalizeAndFinalize(nonBusinessBody),
  }
}
