import { saveBusinessSessionContext } from '@/lib/chat/session-context'
import { hasYieldGranularity } from '@/lib/chat/query-clarification'
import { detectYieldAggregation } from '@/lib/chat/yield-clarification'
import { getYieldDefaultAggregation, resolveBusinessIntentId } from '@/lib/capabilities/semantic-index'
import { logBusinessQuery } from '@/lib/chat/business-query-log'

type PromptMeta = { slug?: string; version?: string; source?: string; hash?: string } | null

function deriveAggregationForSession(resolvedScope: string, businessRawQuery: string): string | undefined {
  if (resolvedScope !== 'yield') return undefined
  const detected = detectYieldAggregation(businessRawQuery)
  if (detected) return detected
  const semanticDefault = String(getYieldDefaultAggregation(resolveBusinessIntentId(businessRawQuery, resolvedScope)) || '').toLowerCase()
  if (semanticDefault === 'avg') return 'avg'
  if (hasYieldGranularity(businessRawQuery)) return 'avg'
  return undefined
}

export async function persistBusinessSuccessPostprocess(params: {
  sessionId: string | null
  resolvedScope: string
  queryMode: 'metrics' | 'investigate' | 'lookup'
  filtersApplied: Record<string, unknown>
  intentQuery: string
  businessRawQuery: string
  mentionedVault?: string | null
  effectiveQuery: string
  summary: string
  outputScope: string | null
  fallbackScope: string
  promptMeta: PromptMeta
  evidence: Array<{ source_type?: string; source_id?: string }>
}) {
  const firstEvidence = params.evidence?.[0]
  await logBusinessQuery({
    userId: 'user_chat',
    rawQuery: params.effectiveQuery,
    scope: String(params.outputScope || params.fallbackScope || 'business_query'),
    summary: params.summary,
    success: true,
    sourceType: firstEvidence?.source_type,
    sourceId: firstEvidence?.source_id,
    promptMeta: params.promptMeta,
  })

  saveBusinessSessionContext({
    sessionId: params.sessionId,
    scope: params.resolvedScope,
    queryMode: params.queryMode,
    filters: {
      ...params.filtersApplied,
      vault_name: params.mentionedVault || undefined,
    },
    aggregation: deriveAggregationForSession(params.resolvedScope, params.businessRawQuery),
  })
}

