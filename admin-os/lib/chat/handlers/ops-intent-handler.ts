import { dataFactQuery } from '@/lib/capabilities/data-fact-query'
import { normalizeIntentForUserExecution } from '@/lib/user-chat-core'
import { buildOpsQueryFailureResponse, buildOpsQuerySuccessResponse } from '@/lib/chat/non-business-response'
import { buildChatEnvelope } from '@/lib/chat/chat-route-helpers'

type ParsedLike = {
  intent: {
    extracted_slots?: Record<string, unknown>
  }
  prompt_meta?: { slug?: string; version?: string; source?: string; hash?: string } | null
}

export async function handleOpsIntent(params: {
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
  parsed: ParsedLike
}): Promise<{ handled: false } | { handled: true; body: unknown }> {
  const { intentType, canonicalIntentType, matchedCapabilityIds, primaryCapabilityId, parsed } = params
  const hasMatchedCapability = matchedCapabilityIds.length > 0
  const isLegacyOpsFallback = !hasMatchedCapability && canonicalIntentType === 'ops_query'
  if (!isLegacyOpsFallback) {
    return { handled: false }
  }

  const normalized = normalizeIntentForUserExecution(intentType, parsed.intent.extracted_slots || {})
  const output = await dataFactQuery(buildChatEnvelope(intentType, normalized.slots))
  if (output.status !== 'success') {
    return {
      handled: true,
      body: buildOpsQueryFailureResponse({
        errorCode: String(output.error || output.metadata?.rejected_reason || ''),
        intentType,
        canonicalIntentType,
        primaryCapabilityId,
        matchedCapabilityIds,
      }),
    }
  }

  const result = (output.result || {}) as { rows?: unknown[]; template_id?: string }
  return {
    handled: true,
    body: buildOpsQuerySuccessResponse({
      intentType,
      canonicalIntentType,
      primaryCapabilityId,
      matchedCapabilityIds,
      promptMeta: parsed.prompt_meta || null,
      rows: result.rows || [],
      templateId: result.template_id || String(normalized.template || ''),
    }),
  }
}
