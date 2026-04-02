import { productDocQnA } from '@/lib/capabilities/product-doc-qna'
import { faqAnswering } from '@/lib/capabilities/faq-answering'
import { faqFallback } from '@/lib/capabilities/faq-fallback'
import { faqQaReview } from '@/lib/capabilities/faq-qa-review'
import { buildQnaSuccessResponse } from '@/lib/chat/non-business-response'
import { enqueueFaqReviewItem } from '@/lib/faq-kb/review-queue'
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
  const qnaSlots: Record<string, unknown> = {
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

  let reviewPayload: Record<string, unknown> | null = null

  if (useFaqCapability && qnaResult?.fallback_required) {
    const fallbackReason = qnaResult.reason || qna.evidence?.fallback_reason || 'faq_generation_failed'
    const fallbackOutput = await faqFallback(
      buildChatEnvelope(intentType, {
        question: qnaSlots.question,
        reason: fallbackReason,
        kb_scope: typeof qna.metadata?.kb_scope === 'string' ? qna.metadata.kb_scope : null,
        citations: Array.isArray(qnaResult.citations) ? qnaResult.citations : [],
      })
    )
    const reviewOutput = await faqQaReview(
      buildChatEnvelope(intentType, {
        question: qnaSlots.question,
        draft_answer: qnaResult.answer || null,
        reason: fallbackReason,
        citations: Array.isArray(qnaResult.citations) ? qnaResult.citations : [],
        confidence: typeof qnaResult.confidence === 'number' ? qnaResult.confidence : null,
        customer_context: typeof qnaSlots.customer_context === 'string' ? qnaSlots.customer_context : null,
        channel: typeof qnaSlots.channel === 'string' ? qnaSlots.channel : null,
        kb_scope: typeof qna.metadata?.kb_scope === 'string' ? qna.metadata.kb_scope : null,
      })
    )
    reviewPayload = ((reviewOutput.result as { review_payload?: Record<string, unknown> } | null)?.review_payload) || null
    if (reviewPayload) {
      const persistedReview = await enqueueFaqReviewItem({
        question: String(reviewPayload.question || qnaSlots.question || ''),
        reason: String(reviewPayload.reason || fallbackReason),
        priority: reviewPayload.priority === 'normal' ? 'normal' : 'high',
        queue_status: 'prepared',
        kb_scope: typeof reviewPayload.kb_scope === 'string' ? reviewPayload.kb_scope : null,
        channel: typeof reviewPayload.channel === 'string' ? reviewPayload.channel : null,
        confidence: typeof reviewPayload.confidence === 'number' ? reviewPayload.confidence : null,
        draft_answer: typeof reviewPayload.draft_answer === 'string' ? reviewPayload.draft_answer : null,
        citations: Array.isArray(reviewPayload.citations) ? (reviewPayload.citations as Array<{ source_id?: string; title?: string; snippet?: string }>) : [],
        customer_context: typeof reviewPayload.customer_context === 'string' ? reviewPayload.customer_context : null,
        source_capability: 'capability.faq_qa_review',
      })
      if (persistedReview) {
        reviewPayload = {
          ...reviewPayload,
          review_id: persistedReview.review_id,
          queue_source: persistedReview.queue_source,
        }
      }
    }
    qnaResult = {
      ...qnaResult,
      fallback_message: (fallbackOutput.result as { fallback_message?: string } | null)?.fallback_message,
      review_required: true,
    }
    finalCapabilityId = reviewOutput.capability_id
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
        review_payload: reviewPayload,
      },
    }),
  }
}
