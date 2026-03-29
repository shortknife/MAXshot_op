import { MemoryRef } from '../types/capability'
import { MemoryType } from '../types/memory'
import { supabase } from '../../admin-os/lib/supabase'

export async function selectMemories(
  types: MemoryType[],
  contextTags: string[]
): Promise<MemoryRef[]> {
  const query = supabase
    .from('agent_memories_op')
    .select('*')
    .in('type', types)

  if (contextTags.length > 0) {
    query.contains('context', { tags: contextTags })
  }

  query.order('weight', { ascending: false }).limit(20)

  const { data, error } = await query

  if (error) {
    throw new Error(`Memory selection failed: ${error.message}`)
  }

  const mapped = data.map((m: unknown) => ({
    id: (m as { id: string }).id,
    type: (m as { type: MemoryType }).type,
    content: (m as { content: string }).content,
    context: (m as { context: Record<string, unknown> }).context || {},
    weight: (m as { weight: number }).weight,
    confidence: (m as { confidence?: number }).confidence,
  }))

  return filterMemories(mapped)
}

export function createWorkingMind(memoryRefs: MemoryRef[]): {
  memory_refs: MemoryRef[]
  timestamp: string
} {
  return {
    memory_refs: filterMemories(memoryRefs),
    timestamp: new Date().toISOString(),
  }
}

function filterMemories(memoryRefs: MemoryRef[]): MemoryRef[] {
  return memoryRefs
    .filter(m => m && m.id && m.content && ['foundation', 'experience', 'insight'].includes(m.type))
    .sort((a, b) => {
      const weightDiff = (b.weight || 0) - (a.weight || 0)
      if (weightDiff !== 0) return weightDiff
      const confDiff = (b.confidence || 0) - (a.confidence || 0)
      if (confDiff !== 0) return confDiff
      return a.id.localeCompare(b.id)
    })
    .slice(0, 20)
}
