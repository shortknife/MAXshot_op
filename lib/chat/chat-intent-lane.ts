export type ChatIntentLane = 'business' | 'ops' | 'marketing' | 'qna'

export function extractMatchedCapabilityIds(extractedSlots?: Record<string, unknown>): string[] {
  const raw = extractedSlots?.matched_capability_ids
  const list = Array.isArray(raw) ? raw : extractedSlots?.matched_capability_id ? [extractedSlots.matched_capability_id] : []
  return list.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 3)
}

export function hasMatchedCapability(
  extractedSlots: Record<string, unknown> | undefined,
  capabilityId: string
): boolean {
  return extractMatchedCapabilityIds(extractedSlots).includes(capabilityId)
}

type ResolveChatIntentLaneParams = {
  intentType: string
  canonicalIntentType: string
  extractedSlots?: Record<string, unknown>
}

export function resolveChatIntentLane(params: ResolveChatIntentLaneParams): ChatIntentLane {
  const { intentType, canonicalIntentType, extractedSlots } = params
  const scope = String(extractedSlots?.scope || '').trim()
  const matchedCapabilityIds = extractMatchedCapabilityIds(extractedSlots)

  if (matchedCapabilityIds.includes('capability.data_fact_query')) return 'business'
  if (
    matchedCapabilityIds.includes('capability.content_generator') ||
    matchedCapabilityIds.includes('capability.context_assembler')
  ) {
    return 'marketing'
  }
  if (matchedCapabilityIds.includes('capability.product_doc_qna')) return 'qna'

  if (intentType === 'business_query') return 'business'
  if (['content_brief', 'marketing_gen'].includes(intentType)) return 'marketing'
  if (['documentation', 'general_qna', 'product_qna'].includes(intentType)) return 'qna'
  if (['ops_query', 'ops_summary', 'audit_query', 'memory_query'].includes(intentType)) return scope ? 'business' : 'ops'
  if (canonicalIntentType === 'marketing_gen') return 'marketing'
  if (canonicalIntentType === 'documentation') return 'qna'
  if (canonicalIntentType === 'ops_query') return scope ? 'business' : 'ops'
  return 'qna'
}

export function shouldHandleAsBusiness(params: ResolveChatIntentLaneParams): boolean {
  return resolveChatIntentLane(params) === 'business'
}
