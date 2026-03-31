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

function deriveAggregationForSessionFromContract(queryContract: { aggregation?: string | null; scope?: string | null } | null | undefined): string | undefined {
  if (!queryContract || queryContract.scope !== 'yield') return undefined
  const agg = String(queryContract.aggregation || '').trim().toLowerCase()
  return agg || undefined
}

export async function persistBusinessSuccessPostprocess(params: {
  sessionId: string | null
  resolvedScope: string
  queryMode: 'metrics' | 'investigate' | 'lookup'
  filtersApplied: Record<string, unknown>
  metricSemantics?: string | null
  metric?: string | null
  intentQuery: string
  businessRawQuery: string
  mentionedVault?: string | null
  effectiveQuery: string
  summary: string
  outputScope: string | null
  fallbackScope: string
  promptMeta: PromptMeta
  evidence: Array<{ source_type?: string; source_id?: string }>
  queryContract?: {
    aggregation?: string | null
    scope?: string | null
    targets?: { compare_targets?: string[] | null } | null
  } | null
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
      compare_targets: Array.isArray(params.queryContract?.targets?.compare_targets)
        ? params.queryContract?.targets?.compare_targets.map((value) => String(value || '').trim()).filter(Boolean)
        : undefined,
    },
    metric: params.metric || undefined,
    aggregation:
      deriveAggregationForSessionFromContract(params.queryContract) ||
      deriveAggregationForSession(params.resolvedScope, params.businessRawQuery),
  })
}
