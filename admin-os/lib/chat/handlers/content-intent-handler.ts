import { contentGenerator } from '@/lib/capabilities/content-generator'
import { inferMarketingTagsFromQuery } from '@/lib/marketing/analytics'
import { extractTopicFromQuery, isMeaningfulTopic } from '@/lib/user-chat-core'
import { buildContentBriefFailureResponse, buildContentBriefSuccessResponse } from '@/lib/chat/non-business-response'
import { buildChatEnvelope, detectQueryLanguage } from '@/lib/chat/chat-route-helpers'
import type { CustomerWorkspacePreset } from '@/lib/customers/workspace'

type ParsedLike = {
  intent: {
    extracted_slots?: Record<string, unknown>
  }
  prompt_meta?: { slug?: string; version?: string; source?: string; hash?: string } | null
}

export async function handleContentIntent(params: {
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
  parsed: ParsedLike
  rawQuery: string
  workspacePreset?: CustomerWorkspacePreset | null
}): Promise<{ handled: false } | { handled: true; body: unknown }> {
  const { intentType, canonicalIntentType, matchedCapabilityIds, primaryCapabilityId, parsed, rawQuery } = params
  if (
    primaryCapabilityId !== 'capability.content_generator' &&
    !matchedCapabilityIds.includes('capability.content_generator') &&
    !matchedCapabilityIds.includes('capability.context_assembler')
  ) {
    return { handled: false }
  }

  const candidateTopic = String(parsed.intent.extracted_slots?.topic || extractTopicFromQuery(rawQuery) || '').trim()
  const topic = isMeaningfulTopic(candidateTopic) ? candidateTopic : ''
  const inferred = inferMarketingTagsFromQuery(rawQuery)
  const slots = {
    topic,
    tone: String(parsed.intent.extracted_slots?.tone || inferred.style || 'professional'),
    platform: String(parsed.intent.extracted_slots?.platform || inferred.channel || 'general'),
    goal: String(parsed.intent.extracted_slots?.goal || 'engagement'),
    language: detectQueryLanguage(rawQuery),
    style: String(inferred.style || 'neutral'),
    channel: String(inferred.channel || 'general'),
    time_window: String(inferred.time_window || 'all_day'),
  }
  const output = await contentGenerator(buildChatEnvelope(intentType, slots))
  if (output.status !== 'success') {
    return {
      handled: true,
      body: buildContentBriefFailureResponse({
        errorCode: String(output.error || output.metadata?.rejected_reason || ''),
        intentType,
        canonicalIntentType,
        primaryCapabilityId,
        matchedCapabilityIds,
      }),
    }
  }

  const result = (output.result || {}) as { copy?: string }
  return {
    handled: true,
    body: buildContentBriefSuccessResponse({
      intentType,
      canonicalIntentType,
      primaryCapabilityId,
      matchedCapabilityIds,
      promptMeta: parsed.prompt_meta || null,
      draft: result.copy || '',
      contentPromptMeta: output.metadata || null,
      tags: {
        topic: String(slots.topic || ''),
        style: String(slots.style || ''),
        channel: String(slots.channel || ''),
        time_window: String(slots.time_window || ''),
      },
    }),
  }
}
