import { loadInteractionLearningLogRuntime, type InteractionLearningLogRow } from '@/lib/interaction-learning/runtime'

export type InteractionLearningMemoryRef = {
  id: string
  type: 'experience' | 'insight'
  memory_origin: 'interaction_learning'
  weight: number
  confidence: number | null
  content: Record<string, unknown>
}

function normalizeTag(tag: string): string {
  return String(tag || '').trim().toLowerCase()
}

function buildTextBlob(row: InteractionLearningLogRow): string {
  return [
    row.raw_query,
    row.effective_query,
    row.intent_type,
    row.intent_type_canonical,
    row.primary_capability_id,
    row.source_plane,
    row.answer_type,
    row.summary,
    row.query_mode,
    row.scope,
    row.customer_id,
    ...(row.matched_capability_ids || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function scoreInteractionRow(row: InteractionLearningLogRow, contextTags: string[]): number {
  const blob = buildTextBlob(row)
  let score = 0
  for (const rawTag of contextTags) {
    const tag = normalizeTag(rawTag)
    if (!tag) continue
    if (blob.includes(tag)) score += 2
  }
  if (row.success) score += 1
  if (row.fallback_required) score -= 0.5
  if (row.review_required) score -= 0.25
  if (typeof row.confidence === 'number') score += row.confidence
  return score
}

function toExperienceMemory(row: InteractionLearningLogRow): InteractionLearningMemoryRef {
  return {
    id: `ilog:${row.log_id}`,
    type: 'experience',
    memory_origin: 'interaction_learning',
    weight: row.success ? 0.7 : 0.45,
    confidence: row.confidence,
    content: {
      kind: 'interaction_experience',
      log_id: row.log_id,
      created_at: row.created_at,
      customer_id: row.customer_id,
      query: row.raw_query,
      summary: row.summary,
      intent_type: row.intent_type_canonical || row.intent_type,
      primary_capability_id: row.primary_capability_id,
      source_plane: row.source_plane,
      fallback_required: row.fallback_required,
      review_required: row.review_required,
      query_mode: row.query_mode,
      scope: row.scope,
    },
  }
}

function toInsightMemory(capabilityId: string, rows: InteractionLearningLogRow[]): InteractionLearningMemoryRef {
  const total = rows.length
  const fallbackCount = rows.filter((row) => row.fallback_required).length
  const reviewCount = rows.filter((row) => row.review_required).length
  const successCount = rows.filter((row) => row.success).length
  const samples = rows
    .map((row) => row.raw_query)
    .filter(Boolean)
    .slice(0, 3)
  return {
    id: `ilog-insight:${capabilityId}`,
    type: 'insight',
    memory_origin: 'interaction_learning',
    weight: 0.82,
    confidence: 0.76,
    content: {
      kind: 'interaction_capability_summary',
      primary_capability_id: capabilityId,
      sample_queries: samples,
      totals: {
        total,
        success_count: successCount,
        fallback_count: fallbackCount,
        review_count: reviewCount,
      },
      rates: {
        success_rate: total ? Number((successCount / total).toFixed(2)) : 0,
        fallback_rate: total ? Number((fallbackCount / total).toFixed(2)) : 0,
        review_rate: total ? Number((reviewCount / total).toFixed(2)) : 0,
      },
    },
  }
}

export async function buildInteractionLearningMemory(params: {
  contextTags: string[]
  limit?: number
}): Promise<InteractionLearningMemoryRef[]> {
  const runtime = await loadInteractionLearningLogRuntime()
  if (runtime.source === 'empty' || !runtime.items.length) return []

  const ranked = [...runtime.items]
    .map((row) => ({ row, score: scoreInteractionRow(row, params.contextTags) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const topRows = ranked.slice(0, Math.max(3, params.limit || 5)).map((entry) => entry.row)
  if (!topRows.length) return []

  const experienceRefs = topRows.slice(0, 3).map(toExperienceMemory)
  const grouped = new Map<string, InteractionLearningLogRow[]>()
  for (const row of topRows) {
    const capabilityId = row.primary_capability_id || 'unknown'
    const bucket = grouped.get(capabilityId) || []
    bucket.push(row)
    grouped.set(capabilityId, bucket)
  }
  const insightRefs = [...grouped.entries()].slice(0, 2).map(([capabilityId, rows]) => toInsightMemory(capabilityId, rows))
  return [...experienceRefs, ...insightRefs]
}
