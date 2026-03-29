import type { CapabilityInputEnvelope } from '@/lib/router/types/capability'
import { parseBusinessFilters, extractFollowUpPolicyDefaults, extractSemanticDefaults, extractSourcePolicyDefaults } from '@/lib/capabilities/business-query-context'
import { buildQueryContractV2, type QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'
import { resolveInputMemoryRefs, resolveInputMemoryRuntime, type MemoryRuntime } from '@/lib/capabilities/memory-refs'
import { toBusinessScope } from '@/lib/capabilities/business-query-scope'

export type BusinessQueryExecutionContext = {
  slots: Record<string, unknown>
  scope: ReturnType<typeof toBusinessScope>
  rawQuery: string
  filters: ReturnType<typeof parseBusinessFilters>
  memoryRefs: unknown[]
  memoryRuntime: MemoryRuntime
  semanticDefaults: Record<string, unknown>
  sourcePolicy: Record<string, unknown>
  followUpPolicy: Record<string, unknown>
  queryContract: QueryContractV2
}

export function assembleBusinessQueryContext(input: CapabilityInputEnvelope): BusinessQueryExecutionContext {
  const slots = (input.slots || {}) as Record<string, unknown>
  const scope = toBusinessScope(slots.scope)
  const rawQuery = String((input.context as Record<string, unknown> | undefined)?.raw_query || '')
  const filters = parseBusinessFilters(rawQuery, slots)
  const memoryRefs = resolveInputMemoryRefs(input)
  const memoryRuntime = resolveInputMemoryRuntime(input)
  const queryContract = buildQueryContractV2({
    scope,
    rawQuery,
    slots,
    filters,
  })

  return {
    slots,
    scope,
    rawQuery,
    filters,
    memoryRefs,
    memoryRuntime,
    semanticDefaults: extractSemanticDefaults(memoryRefs),
    sourcePolicy: extractSourcePolicyDefaults(memoryRefs),
    followUpPolicy: extractFollowUpPolicyDefaults(memoryRefs),
    queryContract,
  }
}
