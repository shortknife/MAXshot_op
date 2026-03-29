import { hasTimeWindow, hasYieldGranularity } from '@/lib/chat/query-clarification'

export type YieldAggregation = 'avg' | 'max' | 'min' | 'realtime'

export function detectYieldAggregation(rawQuery: string): YieldAggregation | null {
  const text = String(rawQuery || '').toLowerCase()
  if (/(最高|peak|\bmax\b)/.test(text)) return 'max'
  if (/(最低|lowest|\bmin\b)/.test(text)) return 'min'
  if (/平均|均值|avg|average/.test(text)) return 'avg'
  if (/实时|最新|real-time|realtime/.test(text)) return 'realtime'
  return null
}

export function isOverallPerformanceQuery(rawQuery: string): boolean {
  return /(整体表现|整体|表现|performance|overall)/i.test(String(rawQuery || ''))
}

export function applyDefaultYieldAssumption(rawQuery: string): string {
  return `${rawQuery}；默认口径：按天均值（最近7天）`
}

type ResolveYieldClarificationParams = {
  intentQuery: string
  previousTurns: number
  vaultOptions: string[]
  extractedSlots?: Record<string, unknown>
}

function hasResolvedTimeWindow(intentQuery: string, extractedSlots?: Record<string, unknown>): boolean {
  if (hasTimeWindow(intentQuery)) return true
  const dateFrom = String(extractedSlots?.date_from || '').trim()
  const dateTo = String(extractedSlots?.date_to || '').trim()
  const timeWindowDays = Number(extractedSlots?.time_window_days)
  const range = extractedSlots?.time_range
  if (dateFrom) return true
  if (dateFrom && dateTo) return true
  if (Number.isFinite(timeWindowDays) && timeWindowDays > 0) return true
  if (range && typeof range === 'object') return true
  return false
}

function hasResolvedAggregation(intentQuery: string, extractedSlots?: Record<string, unknown>): boolean {
  if (hasYieldGranularity(intentQuery) || detectYieldAggregation(intentQuery)) return true
  const agg = String(extractedSlots?.aggregation || extractedSlots?.metric_agg || '').trim().toLowerCase()
  return ['avg', 'max', 'min', 'realtime', 'latest'].includes(agg)
}

export function resolveYieldClarification(params: ResolveYieldClarificationParams): {
  autoAssumeAggFromFollowUp: boolean
  requiredSlots: Array<'vault' | 'time_window' | 'metric_agg'>
  question: string | null
  nextActions: string[]
} {
  const { intentQuery, previousTurns, vaultOptions, extractedSlots } = params
  const missingVault = false
  const implicitTimeByFollowUp =
    previousTurns > 0 && /(只看|比较|对比|\bvs\b|versus)/i.test(intentQuery) && !hasTimeWindow(intentQuery)
  const missingTime = !hasResolvedTimeWindow(intentQuery, extractedSlots) && !implicitTimeByFollowUp
  const resolvedAggregation = hasResolvedAggregation(intentQuery, extractedSlots)
  const autoAssumeAggFromFollowUp = previousTurns > 0 && !missingTime && !resolvedAggregation
  const missingAgg = !autoAssumeAggFromFollowUp && !resolvedAggregation

  if (!missingVault && !missingTime && !missingAgg) {
    return {
      autoAssumeAggFromFollowUp,
      requiredSlots: [],
      question: null,
      nextActions: [],
    }
  }

  const question = missingVault ? '你想看哪个 Vault 的 APY？' : missingTime ? '你希望看哪个时间范围？' : '你希望看哪种 APY 口径？'
  const fallbackVaults = ['Maxshot Omni USDC', 'Maxshot Omni USDT0', '全部 Vault']
  const vaultCandidates = [...vaultOptions, ...fallbackVaults].filter(Boolean).slice(0, 3)
  const nextActions = missingVault
    ? (vaultCandidates.length ? vaultCandidates : ['请提供 vault 名称', '任意 vault', '全部 Vault'])
    : missingTime
      ? ['最近7天', '最近30天', '今天（Asia/Shanghai）']
      : ['平均', '最高', '最低']

  return {
    autoAssumeAggFromFollowUp,
    requiredSlots: [missingVault ? 'vault' : null, missingTime ? 'time_window' : null, missingAgg ? 'metric_agg' : null].filter(
      Boolean
    ) as Array<'vault' | 'time_window' | 'metric_agg'>,
    question,
    nextActions,
  }
}
