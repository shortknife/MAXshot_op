import { productDocQnA } from '@/lib/capabilities/product-doc-qna'
import { faqAnswering } from '@/lib/capabilities/faq-answering'
import { faqFallback } from '@/lib/capabilities/faq-fallback'
import { buildQnaSuccessResponse } from '@/lib/chat/non-business-response'
import { buildChatEnvelope } from '@/lib/chat/chat-route-helpers'
import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'

type ParsedLike = {
  intent: {
    extracted_slots?: Record<string, unknown>
  }
  prompt_meta?: { slug?: string; version?: string; source?: string; hash?: string } | null
}

export async function handleQnaIntent(params: {
  intentType: string
  matchedCapabilityIds?: string[]
  primaryCapabilityId?: string | null
  parsed: ParsedLike
  rawQuery: string
}): Promise<{ body: unknown }> {
  const { intentType, matchedCapabilityIds, primaryCapabilityId, parsed, rawQuery } = params
  const qnaSlots = {
    ...(parsed.intent.extracted_slots || {}),
    question: String((parsed.intent.extracted_slots || {}).question || rawQuery || '').trim(),
  }
  const useFaqCapability =
    primaryCapabilityId === 'capability.faq_answering' || (matchedCapabilityIds || []).includes('capability.faq_answering')
  const qna = useFaqCapability
    ? await faqAnswering(buildChatEnvelope(intentType, qnaSlots))
    : await productDocQnA(buildChatEnvelope(intentType, qnaSlots))
  let qnaResult = qna.result as {
    citations?: unknown[]
    confidence?: number
    fallback_required?: boolean
    review_required?: boolean
    reason?: string | null
    answer?: string
    fallback_message?: string
  } | null
  let finalCapabilityId = qna.capability_id

  if (useFaqCapability && qnaResult?.fallback_required) {
    const fallbackOutput = await faqFallback(
      buildChatEnvelope(intentType, {
        question: qnaSlots.question,
        reason: qnaResult.reason || qna.evidence?.fallback_reason || 'faq_generation_failed',
        kb_scope: typeof qna.metadata?.kb_scope === 'string' ? qna.metadata.kb_scope : null,
        citations: Array.isArray(qnaResult.citations) ? qnaResult.citations : [],
      })
    )
    qnaResult = {
      ...qnaResult,
      fallback_message: (fallbackOutput.result as { fallback_message?: string } | null)?.fallback_message,
      review_required: true,
    }
    finalCapabilityId = fallbackOutput.capability_id
  }

  const resolvedAnswer = qnaResult?.fallback_message || qnaResult?.answer
  const answer: string = typeof resolvedAnswer === 'string' ? resolvedAnswer : '当前没有可用答案。'

  return {
    body: buildQnaSuccessResponse({
      intentType,
      canonicalIntentType: toCanonicalIntentType(intentType),
      matchedCapabilityIds,
      primaryCapabilityId,
      promptMeta: parsed.prompt_meta || null,
      qnaPromptMeta: qna.metadata || null,
      answer,
      answerMeta: {
        capability_id: finalCapabilityId,
        citations: Array.isArray(qnaResult?.citations) ? qnaResult?.citations : [],
        confidence: typeof qnaResult?.confidence === 'number' ? qnaResult.confidence : null,
        fallback_required: Boolean(qnaResult?.fallback_required),
        review_required: Boolean(qnaResult?.review_required),
        reason: qnaResult?.reason || qna.evidence?.fallback_reason || null,
      },
    }),
  }
}
