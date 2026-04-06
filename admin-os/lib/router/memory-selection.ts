import { MemoryType, WorkingMind } from './types/memory'
import { supabase } from '@/lib/supabase'
import { buildInteractionLearningMemory } from '@/lib/interaction-learning/memory'
import { buildCustomerLongTermMemory, type CustomerLongTermMemoryRef } from '@/lib/customers/memory'

type MemoryRow = {
  id?: string
  type?: string
  content?: Record<string, unknown> | string | null
  weight?: number | null
  confidence?: number | null
  memory_origin?: string
  recall_priority?: 'balanced' | 'customer_first' | 'guided_demo' | 'audit_first'
}

function textBlobFromContent(content: MemoryRow['content']): string {
  return content && typeof content === 'object'
    ? JSON.stringify(content).toLowerCase()
    : String(content || '').toLowerCase()
}

function listFromContent(content: MemoryRow['content'], key: string): string[] {
  if (!content || typeof content !== 'object') return []
  const value = (content as Record<string, unknown>)[key]
  return Array.isArray(value) ? value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean) : []
}

function scoreMemoryRow(row: MemoryRow, contextTags: string[], customerMemory: CustomerLongTermMemoryRef | null): number {
  const textBlob = textBlobFromContent(row.content)
  let score = 0
  for (const tag of contextTags) {
    const t = String(tag || '').trim().toLowerCase()
    if (!t) continue
    if (textBlob.includes(t)) score += 2
  }
  if (typeof row.weight === 'number') score += row.weight
  if (typeof row.confidence === 'number') score += row.confidence

  if (customerMemory) {
    const priority = customerMemory.recall_priority
    const customerPlanes = listFromContent(customerMemory.content, 'preferred_planes')
    const customerCaps = listFromContent(customerMemory.content, 'preferred_capabilities')
    const customerModes = listFromContent(customerMemory.content, 'preferred_query_modes')
    const customerScopes = listFromContent(customerMemory.content, 'preferred_scopes')
    const focusTags = listFromContent(customerMemory.content, 'recall_focus_tags')

    for (const tag of [...customerPlanes, ...customerCaps, ...customerModes, ...customerScopes, ...focusTags]) {
      if (tag && textBlob.includes(tag)) score += 1.35
    }

    if (row.memory_origin === 'customer_profile') {
      score += priority === 'customer_first' ? 4.5 : priority === 'guided_demo' ? 3.2 : priority === 'audit_first' ? 3 : 1.5
    }

    if (priority === 'guided_demo' && textBlob.includes('faq')) score += 1.25
    if (priority === 'audit_first' && (textBlob.includes('review') || textBlob.includes('audit') || textBlob.includes('verification'))) score += 1.25
    if (priority === 'customer_first' && (textBlob.includes('vault') || textBlob.includes('apy') || textBlob.includes('execution'))) score += 1.25
  }

  return score
}

export async function selectMemories(types: MemoryType[], contextTags: string[], customerId?: string | null) {
  const [{ data, error }, learningRefs, customerMemory] = await Promise.all([
    supabase
      .from('agent_memories_op')
      .select('id, type, content, weight, confidence')
      .in('type', types)
      .order('weight', { ascending: false })
      .limit(20),
    buildInteractionLearningMemory({ contextTags, limit: 5 }),
    buildCustomerLongTermMemory(customerId),
  ])

  if (error) {
    console.error('Failed to load memories:', error)
  }

  const rows = Array.isArray(data) ? (data as MemoryRow[]) : []
  const merged = [...rows, ...learningRefs, ...(customerMemory ? [customerMemory] : [])]
  return merged
    .sort((a, b) => scoreMemoryRow(b, contextTags, customerMemory) - scoreMemoryRow(a, contextTags, customerMemory))
    .slice(0, 6)
}

export function createWorkingMind(memories: unknown[]): WorkingMind {
  const refs = Array.isArray(memories) ? memories : []
  const learningRefCount = refs.filter((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'interaction_learning').length
  const customerRefs = refs.filter((item) => item && typeof item === 'object' && (item as { memory_origin?: string }).memory_origin === 'customer_profile')
  const customerRefCount = customerRefs.length
  const primaryCustomerRef = customerRefs[0] && typeof customerRefs[0] === 'object' ? (customerRefs[0] as { recall_priority?: string }) : null
  const customerRecallPriority = typeof primaryCustomerRef?.recall_priority === 'string' ? primaryCustomerRef.recall_priority : null
  const customerRecallPriorityApplied = customerRefCount > 0 && customerRecallPriority !== null
  return {
    memory_refs: refs,
    source_policy: learningRefCount > 0 || customerRefCount > 0 ? 'hybrid_learning' : 'router_context_only',
    memory_ref_count: refs.length,
    learning_ref_count: learningRefCount,
    customer_ref_count: customerRefCount,
    customer_recall_priority_applied: customerRecallPriorityApplied,
    customer_recall_priority: customerRecallPriority,
    summary: learningRefCount > 0 || customerRefCount > 0
      ? `working mind includes ${learningRefCount} interaction-derived refs and ${customerRefCount} customer-profile refs${customerRecallPriorityApplied ? ` with ${customerRecallPriority} recall priority` : ''}`
      : null,
  }
}
