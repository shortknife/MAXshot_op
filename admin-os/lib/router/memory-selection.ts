import { MemoryType, WorkingMind } from './types/memory'
import { supabase } from '@/lib/supabase'
import { buildInteractionLearningMemory } from '@/lib/interaction-learning/memory'

type MemoryRow = {
  id?: string
  type?: string
  content?: Record<string, unknown> | string | null
  weight?: number | null
  confidence?: number | null
  memory_origin?: string
}

function scoreMemoryRow(row: MemoryRow, contextTags: string[]): number {
  const textBlob =
    row.content && typeof row.content === 'object'
      ? JSON.stringify(row.content).toLowerCase()
      : String(row.content || '').toLowerCase()
  let score = 0
  for (const tag of contextTags) {
    const t = String(tag || '').trim().toLowerCase()
    if (!t) continue
    if (textBlob.includes(t)) score += 2
  }
  if (typeof row.weight === 'number') score += row.weight
  if (typeof row.confidence === 'number') score += row.confidence
  return score
}

export async function selectMemories(types: MemoryType[], contextTags: string[]) {
  const [{ data, error }, learningRefs] = await Promise.all([
    supabase
      .from('agent_memories_op')
      .select('id, type, content, weight, confidence')
      .in('type', types)
      .order('weight', { ascending: false })
      .limit(20),
    buildInteractionLearningMemory({ contextTags, limit: 5 }),
  ])

  if (error) {
    console.error('Failed to load memories:', error)
  }

  const rows = Array.isArray(data) ? (data as MemoryRow[]) : []
  const merged = [...rows, ...learningRefs]
  return merged
    .sort((a, b) => scoreMemoryRow(b, contextTags) - scoreMemoryRow(a, contextTags))
    .slice(0, 6)
}

export function createWorkingMind(memories: unknown[]): WorkingMind {
  const refs = Array.isArray(memories) ? memories : []
  const learningRefCount = refs.filter((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'interaction_learning').length
  return {
    memory_refs: refs,
    source_policy: learningRefCount > 0 ? 'hybrid_learning' : 'router_context_only',
    memory_ref_count: refs.length,
    learning_ref_count: learningRefCount,
    summary: learningRefCount > 0 ? `working mind includes ${learningRefCount} interaction-derived learning memories` : null,
  }
}
