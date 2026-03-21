import { Intent } from './types/capability'
import { getDefaultCapabilityChainForCanonicalIntent, toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { getCapabilityDefinition, resolveCapabilityIds } from '@/lib/router/capability-catalog'

export interface TaskDecompositionResult {
  capability_chain: string[]
  memory_query: {
    types: ('foundation' | 'experience' | 'insight')[]
    context_tags: string[]
  }
}

function includeDataEnabled(slots: Record<string, unknown>): boolean {
  const raw = slots?.include_data
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
  return Boolean(raw)
}

function determineCapabilityChain(intentType: string, slots: Record<string, unknown>): string[] {
  const matchedCapabilityIds = resolveCapabilityIds(
    [
      ...(Array.isArray(slots?.matched_capability_ids) ? (slots.matched_capability_ids as unknown[]) : []),
      slots?.matched_capability_id,
    ],
    3
  )
  if (matchedCapabilityIds.length > 0) {
    const expanded = [...matchedCapabilityIds]
    if (expanded.includes('capability.content_generator') && !expanded.includes('capability.context_assembler')) {
      expanded.unshift('capability.context_assembler')
    }
    return expanded.slice(0, 3)
  }

  const scope = String(slots?.scope || '').trim().toLowerCase()
  const templateId = String(slots?.template_id || '').trim().toLowerCase()
  if (scope) {
    if (['yield', 'vault', 'allocation', 'execution', 'rebalance'].includes(scope)) {
      return ['capability.data_fact_query']
    }
  }
  if (templateId) {
    if (templateId.includes('audit')) return ['capability.data_fact_query']
    if (templateId.includes('execution')) return ['capability.data_fact_query']
    if (templateId.includes('memory')) return ['capability.context_assembler']
  }

  const canonicalIntent = toCanonicalIntentType(intentType)
  if (canonicalIntent === 'marketing_gen') {
    return includeDataEnabled(slots)
      ? ['capability.data_fact_query', 'capability.context_assembler', 'capability.content_generator']
      : ['capability.context_assembler', 'capability.content_generator']
  }
  return getDefaultCapabilityChainForCanonicalIntent(canonicalIntent)
}

function determineMemoryQuery(intentType: string, slots: Record<string, unknown>) {
  const matchedCapabilityIds = resolveCapabilityIds(
    [
      ...(Array.isArray(slots?.matched_capability_ids) ? (slots.matched_capability_ids as unknown[]) : []),
      slots?.matched_capability_id,
    ],
    3
  )
  if (matchedCapabilityIds.length > 0) {
    const contextTags = matchedCapabilityIds.flatMap((capabilityId) => {
      const definition = getCapabilityDefinition(capabilityId)
      const tags = Array.isArray(definition?.tags) ? definition.tags : []
      return [capabilityId, ...tags]
    })
    const slotTags = [slots?.scope, slots?.dimension, slots?.chain, slots?.protocol]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    return {
      types: ['foundation'] as ('foundation' | 'experience' | 'insight')[],
      context_tags: Array.from(new Set([...contextTags.filter(Boolean), ...slotTags])),
    }
  }

  return {
    types: ['foundation'] as ('foundation' | 'experience' | 'insight')[],
    context_tags: [
      `legacy:intent:${intentType}`,
      ...(String(slots?.scope || '').trim() ? [`scope:${String(slots.scope).trim()}`] : []),
      ...(String(slots?.template_id || '').trim() ? [`template:${String(slots.template_id).trim()}`] : []),
      `legacy:canonical:${toCanonicalIntentType(intentType)}`,
    ],
  }
}

export async function decomposeTask(intent: Intent): Promise<TaskDecompositionResult> {
  return {
    capability_chain: determineCapabilityChain(intent.type, intent.extracted_slots),
    memory_query: determineMemoryQuery(intent.type, intent.extracted_slots),
  }
}
