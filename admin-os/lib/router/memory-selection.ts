import { MemoryType } from './types/memory'
import { supabase } from '@/lib/supabase'

type MemoryRow = {
  id?: string
  type?: string
  content?: Record<string, unknown> | null
  weight?: number | null
  confidence?: number | null
}

function scoreMemoryRow(row: MemoryRow, contextTags: string[]): number {
  const content = row.content && typeof row.content === 'object' ? row.content : {}
  const textBlob = JSON.stringify(content).toLowerCase()
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
  const { data, error } = await supabase
    .from('agent_memories_op')
    .select('id, type, content, weight, confidence')
    .in('type', types)
    .order('weight', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to load memories:', error)
    return []
  }

  const rows = Array.isArray(data) ? (data as MemoryRow[]) : []
  return rows
    .sort((a, b) => scoreMemoryRow(b, contextTags) - scoreMemoryRow(a, contextTags))
    .slice(0, 5)
}

export function createWorkingMind(memories: unknown[]) {
  return {
    memory_refs: memories,
  }
}
