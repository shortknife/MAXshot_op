import { productDocQnA } from '@/lib/capabilities/product-doc-qna'
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
  const qna = await productDocQnA(buildChatEnvelope(intentType, qnaSlots))
  const resolvedAnswer = (qna.result as { answer?: string })?.answer
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
    }),
  }
}
