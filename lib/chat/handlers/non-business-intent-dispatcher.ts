import { handleOpsIntent } from '@/lib/chat/handlers/ops-intent-handler'
import { handleContentIntent } from '@/lib/chat/handlers/content-intent-handler'
import { handleQnaIntent } from '@/lib/chat/handlers/qna-intent-handler'
import { resolveChatIntentLane } from '@/lib/chat/chat-intent-lane'

type ParsedLike = {
  intent: {
    extracted_slots?: Record<string, unknown>
  }
  prompt_meta?: { slug?: string; version?: string; source?: string; hash?: string } | null
}

export async function dispatchNonBusinessIntent(params: {
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
  parsed: ParsedLike
  rawQuery: string
}): Promise<unknown> {
  const { intentType, canonicalIntentType, matchedCapabilityIds, primaryCapabilityId, parsed, rawQuery } = params
  const lane = resolveChatIntentLane({
    intentType,
    canonicalIntentType,
    extractedSlots: parsed.intent.extracted_slots,
  })

  if (lane === 'ops') {
    const opsHandled = await handleOpsIntent({
      intentType,
      canonicalIntentType,
      matchedCapabilityIds,
      primaryCapabilityId,
      parsed,
    })
    if (opsHandled.handled) return opsHandled.body
  }

  if (lane === 'marketing') {
    const contentHandled = await handleContentIntent({
      intentType,
      canonicalIntentType,
      matchedCapabilityIds,
      primaryCapabilityId,
      parsed,
      rawQuery,
    })
    if (contentHandled.handled) return contentHandled.body
  }

  const qnaHandled = await handleQnaIntent({
    intentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    parsed,
  })
  return qnaHandled.body
}
