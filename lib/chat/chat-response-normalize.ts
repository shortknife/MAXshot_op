import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { inferLegacyIntentTypeFromCapabilityIds, mergeMemoryRefIds } from '@/lib/router/capability-catalog'

type ChatBody = {
  success?: boolean
  data?: {
    error?: string | null
    meta?: Record<string, unknown>
  }
}

export function ensureCanonicalIntentMeta(
  body: unknown,
  intentType: string,
  canonicalIntentType: string,
  matchedCapabilityIds: string[] = [],
  primaryCapabilityId: string | null = null
): unknown {
  if (!body || typeof body !== 'object') return body
  const candidate = body as ChatBody
  if (!candidate.data || typeof candidate.data !== 'object') return body
  const meta = candidate.data.meta
  if (!meta || typeof meta !== 'object') return body

  const patchedMeta: Record<string, unknown> = { ...meta }
  if (typeof patchedMeta.intent_type !== 'string' || !patchedMeta.intent_type) {
    patchedMeta.intent_type = intentType
  }
  if (typeof patchedMeta.intent_type_canonical !== 'string' || !patchedMeta.intent_type_canonical) {
    const inferredIntentType = inferLegacyIntentTypeFromCapabilityIds([
      ...matchedCapabilityIds,
      primaryCapabilityId,
    ])
    patchedMeta.intent_type_canonical = toCanonicalIntentType(
      inferredIntentType !== 'out_of_scope' ? inferredIntentType : canonicalIntentType || intentType
    )
  }
  if (typeof patchedMeta.exit_type !== 'string' || !patchedMeta.exit_type) {
    const hasError = typeof candidate.data?.error === 'string' && candidate.data.error.length > 0
    patchedMeta.exit_type = hasError || candidate.success === false ? 'rejected' : 'answered'
  }
  patchedMeta.memory_refs_ref = mergeMemoryRefIds(
    Array.isArray(patchedMeta.memory_refs_ref) ? patchedMeta.memory_refs_ref : [],
    [...matchedCapabilityIds, primaryCapabilityId]
  )

  return {
    ...(body as Record<string, unknown>),
    data: {
      ...(candidate.data as Record<string, unknown>),
      meta: patchedMeta,
    },
  }
}
