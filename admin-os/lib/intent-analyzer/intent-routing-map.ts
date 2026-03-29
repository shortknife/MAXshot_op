// Legacy compatibility layer only.
// Runtime routing should prefer matched capability ids from the registry-first path.
// This file remains for:
// 1) meta.intent_type_canonical compatibility
// 2) old execution payload compatibility
// 3) smoke/audit contract stability
export type CanonicalIntentType =
  | 'ops_query'
  | 'documentation'
  | 'marketing_gen'
  | 'small_talk'
  | 'out_of_scope'
  | 'unknown'
  | 'mixed'

export type IntentRouting = {
  canonicalIntentType: CanonicalIntentType
  defaultCapabilityChain: string[]
}

const DEFAULT_UNKNOWN_CAPABILITY_CHAIN = ['capability.product_doc_qna'] as const

export const RAW_INTENT_TO_CANONICAL_INTENT_MAP: Readonly<Record<string, CanonicalIntentType>> = Object.freeze({
  ops: 'ops_query',
  ops_query: 'ops_query',
  ops_summary: 'ops_query',
  audit: 'ops_query',
  audit_query: 'ops_query',
  memory: 'ops_query',
  memory_query: 'ops_query',
  business: 'ops_query',
  business_query: 'ops_query',
  metric: 'ops_query',
  metric_query: 'ops_query',

  documentation: 'documentation',
  general_qna: 'documentation',
  product_qna: 'documentation',

  marketing: 'marketing_gen',
  marketing_gen: 'marketing_gen',
  content: 'marketing_gen',
  content_generation: 'marketing_gen',
  content_brief: 'marketing_gen',

  small_talk: 'small_talk',
  smalltalk: 'small_talk',

  mixed: 'mixed',

  out_of_scope: 'out_of_scope',
  unsupported: 'out_of_scope',

  unknown: 'unknown',
  task_management: 'unknown',
} as const)

export const CANONICAL_INTENT_TO_DEFAULT_CAPABILITY_CHAIN_MAP: Readonly<
  Record<CanonicalIntentType, readonly string[]>
> = Object.freeze({
  ops_query: ['capability.data_fact_query'],
  documentation: ['capability.product_doc_qna'],
  marketing_gen: ['capability.context_assembler', 'capability.content_generator'],
  small_talk: ['capability.product_doc_qna'],
  out_of_scope: ['capability.product_doc_qna'],
  unknown: ['capability.product_doc_qna'],
  mixed: ['capability.data_fact_query', 'capability.context_assembler', 'capability.content_generator'],
} as const)

export const INTENT_ROUTING_MAP: Readonly<{
  rawToCanonical: Readonly<Record<string, CanonicalIntentType>>
  canonicalToDefaultCapabilityChain: Readonly<Record<CanonicalIntentType, readonly string[]>>
}> = Object.freeze({
  rawToCanonical: RAW_INTENT_TO_CANONICAL_INTENT_MAP,
  canonicalToDefaultCapabilityChain: CANONICAL_INTENT_TO_DEFAULT_CAPABILITY_CHAIN_MAP,
})

export function normalizeIntentType(intentType: string): string {
  return String(intentType || '').trim().toLowerCase()
}

export function getCanonicalIntentType(intentType: string): CanonicalIntentType {
  const normalized = normalizeIntentType(intentType)
  return RAW_INTENT_TO_CANONICAL_INTENT_MAP[normalized] || 'unknown'
}

export function toCanonicalIntentType(intentType: string): CanonicalIntentType {
  return getCanonicalIntentType(intentType)
}

export function getDefaultCapabilityChainForCanonicalIntent(intentType: string): string[] {
  const canonicalIntentType = getCanonicalIntentType(intentType)
  const capabilityChain = CANONICAL_INTENT_TO_DEFAULT_CAPABILITY_CHAIN_MAP[canonicalIntentType] || DEFAULT_UNKNOWN_CAPABILITY_CHAIN
  return [...capabilityChain]
}

export function getIntentRouting(intentType: string): IntentRouting {
  const canonicalIntentType = getCanonicalIntentType(intentType)
  return {
    canonicalIntentType,
    defaultCapabilityChain: getDefaultCapabilityChainForCanonicalIntent(canonicalIntentType),
  }
}

export function isOpsQueryIntent(intentType: string): boolean {
  return getCanonicalIntentType(intentType) === 'ops_query'
}
