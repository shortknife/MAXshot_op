import type { ActiveContextSnapshot, RecallResult } from '@/lib/chat/context-manager/types'

function inferEntity(rawQuery: string): string | null {
  const text = String(rawQuery || '').trim()
  if (!text) return null
  const match = text.match(/(dforce|morpho|aave|euler|maxshot|usdc|usdt0|vault)/i)
  return match?.[0] || null
}

export function runRecallAdapter(params: {
  rawQuery: string
  activeContext: ActiveContextSnapshot
  recentTurnsSummary?: Array<{ role: string; content: string }>
}): RecallResult {
  const entity = inferEntity(params.rawQuery)
  const hits: RecallResult['recall_hits'] = []

  if (Array.isArray(params.recentTurnsSummary)) {
    params.recentTurnsSummary.forEach((turn, idx) => {
      if (idx >= 6) return
      if (entity && !String(turn.content || '').toLowerCase().includes(String(entity).toLowerCase())) return
      hits.push({
        source_type: 'recent_turn',
        source_id: `turn_${idx}`,
        match_reason: entity ? `contains "${entity}"` : 'recent context candidate',
        summary: String(turn.content || '').slice(0, 180),
      })
    })
  }

  if (!hits.length && params.activeContext.scope) {
    hits.push({
      source_type: 'active_context',
      source_id: 'active_context',
      match_reason: 'fallback to current active context',
      summary: `active scope=${params.activeContext.scope}`,
    })
  }

  return {
    recall_hits: hits.slice(0, 5),
    recall_summary: hits.length
      ? `Recovered ${hits.length} historical hints for the callback query.`
      : 'No strong historical hit found; keep current turn as primary signal.',
    recall_confidence: hits.length ? 0.78 : 0.32,
    resolved_reference: entity
      ? {
          entity_type: 'vault_or_market',
          entity_name: entity,
          inferred_scope: params.activeContext.scope,
        }
      : null,
  }
}
