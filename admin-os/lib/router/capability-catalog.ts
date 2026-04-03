import capabilityRegistrySource from '@/app/configs/capability-registry/capability_registry_v1.json'

export type CapabilityRiskClass = 'read_only' | 'side_effect'
export type CapabilityLifecycle = 'active' | 'inactive'
export type CapabilityExecutionMode = 'read' | 'review' | 'mutation'

export type CapabilityDefinition = {
  capability_id: string
  name: string
  description: string
  aliases: string[]
  lifecycle: CapabilityLifecycle
  risk_class: CapabilityRiskClass
  tags?: string[]
  examples?: string[]
  prompt_slot_schema?: Record<string, unknown>
  runtime_slot_schema?: Record<string, unknown>
  clarification_policy?: Record<string, unknown>
  execution_mode?: CapabilityExecutionMode
  mutation_scope?: string | null
  concurrency_safe?: boolean
  requires_confirmation?: boolean
  requires_verification?: boolean
}

type CapabilityRegistrySource = {
  registry_id?: string
  version: string
  updated_at: string
  capabilities: CapabilityDefinition[]
}

const REGISTRY = capabilityRegistrySource as CapabilityRegistrySource

export const MAX_MATCHED_CAPABILITIES = 3

function normalizeCapabilityId(input: string): string {
  return String(input || '').trim()
}

export function listCapabilityDefinitions(): CapabilityDefinition[] {
  return [...REGISTRY.capabilities]
}

export function listActiveCapabilityDefinitions(): CapabilityDefinition[] {
  return listCapabilityDefinitions().filter((item) => item.lifecycle === 'active')
}

export function getCapabilityDefinition(inputCapabilityId: string): CapabilityDefinition | null {
  const normalized = normalizeCapabilityId(inputCapabilityId)
  if (!normalized) return null
  for (const item of REGISTRY.capabilities) {
    if (item.capability_id === normalized) return item
    if (Array.isArray(item.aliases) && item.aliases.includes(normalized)) return item
  }
  return null
}

export function getCapabilityExecutionPolicy(inputCapabilityId: string) {
  const definition = getCapabilityDefinition(inputCapabilityId)
  if (!definition) return null
  return {
    capability_id: definition.capability_id,
    risk_class: definition.risk_class,
    execution_mode: definition.execution_mode || (definition.risk_class === 'side_effect' ? 'mutation' : 'read'),
    mutation_scope: definition.mutation_scope || null,
    concurrency_safe: definition.concurrency_safe !== false,
    requires_confirmation: definition.requires_confirmation === true || definition.risk_class === 'side_effect',
    requires_verification: definition.requires_verification !== false,
  }
}

export function resolveCapabilityIds(inputs: unknown[], limit = MAX_MATCHED_CAPABILITIES): string[] {
  if (!Array.isArray(inputs)) return []
  const resolved: string[] = []
  for (const raw of inputs) {
    const found = getCapabilityDefinition(String(raw || ''))
    if (!found || found.lifecycle !== 'active') continue
    if (!resolved.includes(found.capability_id)) {
      resolved.push(found.capability_id)
    }
    if (resolved.length >= limit) break
  }
  return resolved
}

export function getPrimaryCapabilityId(inputs: unknown[]): string | null {
  const resolved = resolveCapabilityIds(inputs, 1)
  return resolved[0] || null
}

export function normalizeCapabilityCandidates(inputs: unknown[]): string[] {
  if (!Array.isArray(inputs)) return []
  return inputs
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

export function getPrimaryCapabilityDefinition(inputs: unknown[]): CapabilityDefinition | null {
  const primary = getPrimaryCapabilityId(inputs)
  return primary ? getCapabilityDefinition(primary) : null
}

export function describeActiveCapabilitiesForPrompt(): string {
  const lines = listActiveCapabilityDefinitions().map((item) => {
    const aliasText = item.aliases.length ? `aliases=${item.aliases.join('/')}` : 'aliases='
    const tagsText = Array.isArray(item.tags) && item.tags.length ? `tags=${item.tags.join('/')}` : 'tags='
    const examplesText = Array.isArray(item.examples) && item.examples.length
      ? item.examples.map((example) => `- ${example}`).join('; ')
      : '-'
    const slotText = item.prompt_slot_schema && Object.keys(item.prompt_slot_schema).length > 0
      ? Object.entries(item.prompt_slot_schema)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(', ')
      : 'none'
    return [
      `capability_id=${item.capability_id}`,
      `name=${item.name}`,
      `description=${item.description}`,
      aliasText,
      tagsText,
      `slots=${slotText}`,
      `examples=${examplesText}`,
    ].join(' | ')
  })
  return lines.join('\n')
}

export function inferLegacyIntentTypeFromCapabilityIds(capabilityIds: unknown[]): string {
  const primary = getPrimaryCapabilityId(capabilityIds)
  if (!primary) return 'out_of_scope'
  if (primary === 'capability.data_fact_query') return 'business_query'
  if (primary === 'capability.product_doc_qna') return 'general_qna'
  if (primary === 'capability.faq_answering') return 'general_qna'
  if (primary === 'capability.faq_fallback') return 'general_qna'
  if (primary === 'capability.faq_qa_review') return 'general_qna'
  if (primary === 'capability.content_generator') return 'content_brief'
  if (primary === 'capability.context_assembler') return 'marketing_gen'
  if (primary === 'capability.publisher') return 'task_management'
  return 'out_of_scope'
}

export function inferPrimaryCapabilityIdFromIntentName(intentName: unknown): string | null {
  const normalized = String(intentName || '').trim()
  if (!normalized) return null
  if (normalized === 'business_query') return 'capability.data_fact_query'
  if (normalized === 'faq_qna' || normalized === 'customer_faq') return 'capability.faq_answering'
  if (normalized === 'general_qna' || normalized === 'documentation' || normalized === 'product_qna') {
    return 'capability.product_doc_qna'
  }
  if (normalized === 'content_brief') return 'capability.content_generator'
  if (normalized === 'marketing_gen') return 'capability.context_assembler'
  return null
}

export function inferScopeFromCapabilityIds(capabilityIds: unknown[]): string | null {
  const primary = getPrimaryCapabilityId(capabilityIds)
  if (primary === 'capability.data_fact_query') return 'unknown'
  return null
}

export function getCapabilityRegistryMeta() {
  return {
    registry_id: REGISTRY.registry_id || 'capability_registry_v1',
    version: REGISTRY.version,
    updated_at: REGISTRY.updated_at,
    active_count: listActiveCapabilityDefinitions().length,
  }
}

export function buildCapabilityRegistryRefIds(capabilityIds: unknown[]): string[] {
  const meta = getCapabilityRegistryMeta()
  const resolved = resolveCapabilityIds(Array.isArray(capabilityIds) ? capabilityIds : [], MAX_MATCHED_CAPABILITIES)
  return [
    meta.registry_id,
    ...resolved.map((capabilityId) => `${meta.registry_id}:${capabilityId}`),
  ]
}

export function mergeMemoryRefIds(baseRefs: unknown[], capabilityIds: unknown[]): string[] {
  const merged = [
    ...(Array.isArray(baseRefs) ? baseRefs : []).map((item) => String(item || '').trim()).filter(Boolean),
    ...buildCapabilityRegistryRefIds(capabilityIds),
  ]
  return [...new Set(merged)]
}
