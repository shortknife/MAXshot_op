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
  learning_ref_count: number
  customer_ref_count: number
  customer_recall_priority_applied?: boolean
  customer_recall_priority?: string | null
  summary: string | null
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
  const learningRefCount = Array.isArray(memoryRefs)
    ? memoryRefs.filter((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'interaction_learning').length
    : 0
  const customerRefCount = Array.isArray(memoryRefs)
    ? memoryRefs.filter((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'customer_profile').length
    : 0
  const hasLearningRefs = learningRefCount > 0 || customerRefCount > 0
  const customerPrioritySource = Array.isArray(memoryRefs)
    ? memoryRefs.find((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'customer_profile') as { recall_priority?: string } | undefined
    : undefined
  const customerRecallPriority = typeof customerPrioritySource?.recall_priority === 'string' ? customerPrioritySource.recall_priority : null
  return {
    source_policy: hasLearningRefs ? 'hybrid_learning' : 'router_context_only',
    ref_ids: refIds,
    memory_ref_count: refIds.length,
    learning_ref_count: learningRefCount,
    customer_ref_count: customerRefCount,
    customer_recall_priority_applied: customerRefCount > 0 && customerRecallPriority !== null,
    customer_recall_priority: customerRecallPriority,
    summary: hasLearningRefs ? `working mind includes ${learningRefCount} interaction-derived refs and ${customerRefCount} customer-profile refs${customerRecallPriority ? ` with ${customerRecallPriority} recall priority` : ''}` : null,
  }
}

export function resolveInputMemoryRuntime(input: CapabilityInputEnvelope): MemoryRuntime {
  const context = isRecord(input.context) ? input.context : {}
  const runtime = isRecord(context.memory_runtime) ? context.memory_runtime : null
  const refIds = Array.isArray(runtime?.ref_ids) ? runtime.ref_ids.map((item) => String(item || '').trim()).filter(Boolean) : null
  const sourcePolicy = typeof runtime?.source_policy === 'string' ? runtime.source_policy : null
  const memoryRefCount = typeof runtime?.memory_ref_count === 'number' ? runtime.memory_ref_count : null
  const learningRefCount = typeof runtime?.learning_ref_count === 'number' ? runtime.learning_ref_count : 0
  const customerRefCount = typeof runtime?.customer_ref_count === 'number' ? runtime.customer_ref_count : 0
  const customerRecallPriorityApplied = runtime?.customer_recall_priority_applied === true
  const customerRecallPriority = typeof runtime?.customer_recall_priority === 'string' ? runtime.customer_recall_priority : null
  const summary = typeof runtime?.summary === 'string' ? runtime.summary : null
  if (refIds && (sourcePolicy === 'router_context_only' || sourcePolicy === 'hybrid_learning') && typeof memoryRefCount === 'number') {
    return {
      source_policy: sourcePolicy,
      ref_ids: refIds,
      memory_ref_count: memoryRefCount,
      learning_ref_count: learningRefCount,
      customer_ref_count: customerRefCount,
      customer_recall_priority_applied: customerRecallPriorityApplied,
      customer_recall_priority: customerRecallPriority,
      summary,
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
