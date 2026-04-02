import { CapabilityInputEnvelope } from '@/lib/router/types/capability'
import { createHash } from 'crypto'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stableKey(value: unknown): string {
  if (isRecord(value) && typeof value.id === 'string' && value.id.trim()) return `id:${value.id}`
  try {
    return `json:${JSON.stringify(value)}`
  } catch {
    return `str:${String(value)}`
  }
}

export type MemoryRuntime = {
  source_policy: 'router_context_only' | 'hybrid_learning'
  ref_ids: string[]
  memory_ref_count: number
}

export function toMemoryRefIds(memoryRefs: unknown[]): string[] {
  if (!Array.isArray(memoryRefs)) return []
  return memoryRefs.slice(0, 20).map((item) => {
    if (isRecord(item) && typeof item.id === 'string' && item.id.trim()) return item.id
    try {
      const payload = JSON.stringify(item)
      return `hash:${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`
    } catch {
      return `hash:${createHash('sha256').update(String(item)).digest('hex').slice(0, 16)}`
    }
  })
}

export function buildMemoryRuntime(memoryRefs: unknown[]): MemoryRuntime {
  const refIds = toMemoryRefIds(memoryRefs)
  const hasLearningRefs = Array.isArray(memoryRefs) && memoryRefs.some((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'interaction_learning')
  return {
    source_policy: hasLearningRefs ? 'hybrid_learning' : 'router_context_only',
    ref_ids: refIds,
    memory_ref_count: refIds.length,
  }
}

export function resolveInputMemoryRuntime(input: CapabilityInputEnvelope): MemoryRuntime {
  const context = isRecord(input.context) ? input.context : {}
  const runtime = isRecord(context.memory_runtime) ? context.memory_runtime : null
  const refIds = Array.isArray(runtime?.ref_ids) ? runtime.ref_ids.map((item) => String(item || '').trim()).filter(Boolean) : null
  const sourcePolicy = typeof runtime?.source_policy === 'string' ? runtime.source_policy : null
  const memoryRefCount = typeof runtime?.memory_ref_count === 'number' ? runtime.memory_ref_count : null
  if (refIds && (sourcePolicy === 'router_context_only' || sourcePolicy === 'hybrid_learning') && typeof memoryRefCount === 'number') {
    return {
      source_policy: sourcePolicy,
      ref_ids: refIds,
      memory_ref_count: memoryRefCount,
    }
  }
  return buildMemoryRuntime(resolveInputMemoryRefs(input))
}

export function resolveInputMemoryRefs(input: CapabilityInputEnvelope): unknown[] {
  const topLevel = Array.isArray(input.memory_refs) ? input.memory_refs : []
  const context = isRecord(input.context) ? input.context : {}
  const contextRefs = Array.isArray(context.memory_refs) ? context.memory_refs : []
  const combined = [...topLevel, ...contextRefs]
  const seen = new Set<string>()
  const deduped: unknown[] = []
  for (const item of combined) {
    const key = stableKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }
  return deduped
}
