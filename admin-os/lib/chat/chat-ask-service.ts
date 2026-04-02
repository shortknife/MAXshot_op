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
import { applyRuntimeVerification } from '@/lib/chat/runtime-verification'
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance'

export type ChatAskRuntimeMeta = {
  session_id: string | null
  customer_id: string | null
  requester_id: string | null
  entry_channel: string | null
  intent_type: string | null
  intent_type_canonical: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  source_plane: string | null
  step3_tokens_used: number
  model_source: string | null
  model_prompt_slug: string | null
  verification_outcome?: string | null
}

export type ChatAskServiceResult = {
  status: number
  body: unknown
  runtimeMeta?: ChatAskRuntimeMeta
}

export async function runChatAsk(body: Record<string, unknown>): Promise<ChatAskServiceResult> {
  const rawQuery = String(body?.raw_query || '').trim()
  const perf = createPerfTrace('chat.ask.service', buildPerfQueryMeta(rawQuery))
  const rewriteAction = String(body?.rewrite_action || '').trim()
  const draft = String(body?.draft || '').trim()
  const sessionId = getClarificationSessionId(body?.session_id)
  const finalize = (payload: Record<string, unknown>) => finalizeDelivery(applyRuntimeVerification(payload))

  if (rewriteAction) {
    perf.stage('rewrite_action', { rewrite_action: rewriteAction })
    const rewritten = rewriteDraft(draft, rewriteAction)
    const finalized = finalize({
      success: true,
      data: buildUserOutcome({
        type: 'marketing',
        summary: '已完成改写。',
        draft: rewritten,
        meta: { rewrite_action: rewriteAction },
      }),
    })
    return {
      status: 200,
      body: finalized,
      runtimeMeta: {
        session_id: sessionId,
        customer_id: null,
        requester_id: null,
        entry_channel: 'web',
        intent_type: 'marketing_gen',
        intent_type_canonical: 'marketing_gen',
        primary_capability_id: null,
        matched_capability_ids: [],
        source_plane: 'marketing',
        step3_tokens_used: 0,
        model_source: null,
        model_prompt_slug: null,
        verification_outcome: typeof (finalized as { verification_decision?: { outcome?: string } }).verification_decision?.outcome === 'string'
          ? (finalized as { verification_decision?: { outcome?: string } }).verification_decision?.outcome || null
          : null,
      },
    }
  }

  if (!rawQuery) {
    return {
      status: 400,
      body: { error: 'Missing raw_query' },
      runtimeMeta: {
        session_id: sessionId,
        customer_id: null,
        requester_id: null,
        entry_channel: 'web',
        intent_type: null,
        intent_type_canonical: null,
        primary_capability_id: null,
        matched_capability_ids: [],
        source_plane: null,
        step3_tokens_used: 0,
        model_source: null,
        model_prompt_slug: null,
        verification_outcome: null,
      },
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

  const buildRuntimeMeta = (payload: Record<string, unknown>): ChatAskRuntimeMeta => {
    const data = payload.data && typeof payload.data === 'object' ? (payload.data as Record<string, unknown>) : {}
    const meta = data.meta && typeof data.meta === 'object' ? (data.meta as Record<string, unknown>) : {}
    const answerMeta = meta.answer_meta && typeof meta.answer_meta === 'object' ? (meta.answer_meta as Record<string, unknown>) : {}
    const verificationDecision = payload.verification_decision && typeof payload.verification_decision === 'object'
      ? (payload.verification_decision as Record<string, unknown>)
      : {}
    const resolvedPlane =
      typeof meta.data_plane === 'string'
        ? meta.data_plane
        : typeof answerMeta.capability_id === 'string' && String(answerMeta.capability_id).startsWith('capability.faq_')
          ? 'faq_kb'
          : payload.success === true && data.type === 'qna'
            ? 'product_docs'
            : typeof data.type === 'string'
              ? String(data.type)
              : null
    return {
      session_id: sessionId,
      customer_id: typeof parsed.intent.extracted_slots?.customer_id === 'string' ? String(parsed.intent.extracted_slots.customer_id) : null,
      requester_id: typeof parsed.intent.extracted_slots?.requester_id === 'string' ? String(parsed.intent.extracted_slots.requester_id) : null,
      entry_channel: typeof parsed.intent.extracted_slots?.channel === 'string' ? String(parsed.intent.extracted_slots.channel) : 'web',
      intent_type: intentType,
      intent_type_canonical: canonicalIntentType,
      primary_capability_id: primaryCapabilityId,
      matched_capability_ids: matchedCapabilityIds,
      source_plane: resolvedPlane,
      step3_tokens_used: Number(prepared.step3?.trace?.tokens_used || 0),
      model_source: typeof prepared.step3?.trace?.source === 'string' ? prepared.step3.trace.source : null,
      model_prompt_slug: typeof prepared.step3?.trace?.prompt_slug === 'string' ? prepared.step3.trace.prompt_slug : null,
      verification_outcome: typeof verificationDecision.outcome === 'string' ? String(verificationDecision.outcome) : null,
    }
  }

  const normalizeAndFinalize = (payload: unknown) =>
    perf.measure('verify_and_finalize', () =>
      finalize(
        ensureCanonicalIntentMeta(
          payload,
          intentType,
          canonicalIntentType,
          matchedCapabilityIds,
          primaryCapabilityId
        ) as Record<string, unknown>
      )
    )

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
    const finalized = await normalizeAndFinalize(gateResponse.body)
    return {
      status: 200,
      body: finalized,
      runtimeMeta: buildRuntimeMeta(finalized as Record<string, unknown>),
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
    const finalized = await normalizeAndFinalize(businessHandled.body)
    return {
      status: 200,
      body: finalized,
      runtimeMeta: buildRuntimeMeta(finalized as Record<string, unknown>),
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
  const finalized = await normalizeAndFinalize(nonBusinessBody)
  return {
    status: 200,
    body: finalized,
    runtimeMeta: buildRuntimeMeta(finalized as Record<string, unknown>),
  }
}
