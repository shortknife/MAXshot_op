export const MEMORY_TYPES = ['foundation', 'experience', 'insight'] as const

export type MemoryType = (typeof MEMORY_TYPES)[number]

export type MemorySourcePolicy = 'router_context_only' | 'ref_resolved'

export type MemoryRef = {
  type: MemoryType
  id: string
  version?: number
  fields?: string[]
  weight?: number | null
  confidence?: number | null
}

export type ResolvedMemory<TData = Record<string, unknown>> = {
  ref: MemoryRef
  type: MemoryType
  data: TData
  resolved_at: string
  cache_hit: boolean
}

export type MemoryLoadOptions = {
  dateRange?: string
  dateFrom?: string
  dateTo?: string
  channelType?: string
  channelSubtype?: string
  limit?: number
  forceRefresh?: boolean
  contextTags?: string[]
}

export type WorkingMind = {
  memory_refs: unknown[]
  source_policy: MemorySourcePolicy
  memory_ref_count: number
}

export function isMemoryType(value: unknown): value is MemoryType {
  return typeof value === 'string' && (MEMORY_TYPES as readonly string[]).includes(value)
}
