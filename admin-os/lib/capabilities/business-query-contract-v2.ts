import type { BusinessFilters } from '@/lib/capabilities/business-query-context'
import type { BusinessScope } from '@/lib/capabilities/business-query-runtime'
import { parseYieldRankingDimension, wantsYieldExtremes, wantsYieldTrend } from '@/lib/capabilities/business-query-planner'

export type QueryContractV2 = {
  version: 'v2'
  scope: BusinessScope
  metric: string | null
  entity: string | null
  aggregation: string | null
  query_mode: 'metrics' | 'investigate' | 'lookup'
  question_shape: string | null
  ranking_dimension: 'chain' | 'protocol' | null
  return_fields: string[]
  time: {
    timezone: string
    time_window_days: number | null
    date_from: string | null
    date_to: string | null
    exact_day: string | null
    calendar_year: number | null
    calendar_month: number | null
    week_of_month: number | null
  }
  targets: {
    chain: string | null
    protocol: string | null
    vault_name: string | null
    market_name: string | null
    compare_targets: string[]
    execution_id: string | null
  }
  completeness: {
    ready: boolean
    missing_slots: string[]
  }
}

function readString(slots: Record<string, unknown>, key: string): string | null {
  const value = String(slots[key] || '').trim()
  return value || null
}

function readNumber(slots: Record<string, unknown>, key: string): number | null {
  const value = Number(slots[key])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null
}

function inferQueryMode(scope: BusinessScope, rawQuery: string, questionShape: string | null): QueryContractV2['query_mode'] {
  if (scope === 'execution') return 'lookup'
  if (/(为什么|原因|why|cause|风险|是否有调仓|action)/i.test(rawQuery)) return 'investigate'
  if (questionShape === 'capability_overview') return 'lookup'
  return 'metrics'
}

function inferQuestionShape(rawQuery: string, slots: Record<string, unknown>, filters: BusinessFilters): string | null {
  const explicit = readString(slots, 'question_shape')
  if (explicit) return explicit
  const text = String(rawQuery || '')
  const lower = text.toLowerCase()
  if (/你能做什么|可以做什么|能力边界|支持哪些业务/.test(text)) return 'capability_overview'
  if (wantsYieldTrend(lower)) return 'trend_window'
  if (parseYieldRankingDimension(lower)) return 'ranking_by_dimension'
  if (wantsYieldExtremes(lower)) {
    if (filters.date_from && filters.date_to && filters.date_from === filters.date_to) return 'top_bottom_in_day'
    if (filters.date_from || filters.date_to) return 'top_1_in_period'
    return 'extreme_window'
  }
  if (/(实时|最新|latest|realtime|real-time)/i.test(text)) return 'current_snapshot'
  if (filters.date_from || filters.date_to || filters.time_window_days) return 'window_summary'
  return null
}


function normalizeYieldContract(params: {
  rawQuery: string
  metric: string | null
  aggregation: string | null
  questionShape: string | null
  filters: BusinessFilters
}): { metric: string | null; aggregation: string | null; questionShape: string | null } {
  const { rawQuery, filters } = params
  let metric = params.metric
  let aggregation = params.aggregation
  let questionShape = params.questionShape
  const hasTime =
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    (Number.isFinite(filters.time_window_days) && Number(filters.time_window_days) > 0)
  const explicitRealtime = /(实时|最新|real-time|realtime)/i.test(rawQuery)
  const trend = wantsYieldTrend(rawQuery)
  const extremes = wantsYieldExtremes(rawQuery)
  const ranking = parseYieldRankingDimension(rawQuery)

  if (!metric) metric = 'apy'

  if (hasTime && !trend && !extremes && !ranking && !explicitRealtime) {
    if (!aggregation || aggregation === 'latest' || aggregation === 'realtime') {
      aggregation = 'avg'
    }
    if (!questionShape || questionShape === 'trend_window' || questionShape === 'current_snapshot') {
      questionShape = 'window_summary'
    }
  }

  if (explicitRealtime) {
    aggregation = aggregation || 'realtime'
    questionShape = 'current_snapshot'
  }

  return { metric, aggregation, questionShape }
}

function inferMissingSlots(params: {
  rawQuery: string
  scope: BusinessScope
  metric: string | null
  aggregation: string | null
  filters: BusinessFilters
  questionShape: string | null
}): string[] {
  const missing: string[] = []
  const { rawQuery, scope, metric, aggregation, filters, questionShape } = params
  const hasTime =
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    (Number.isFinite(filters.time_window_days) && Number(filters.time_window_days) > 0)
  const hasAverage = /(平均|均值|avg|average)/i.test(rawQuery)
  const hasHighLowCombo = /(最高|max)/i.test(rawQuery) && /(最低|min)/i.test(rawQuery)
  const hasPeriodCompare = /比较|对比|vs|versus/i.test(rawQuery)
  const hasCrossMonth =
    /(?:\d{1,2}月).*(?:和|与|到|至|-|~).*(?:\d{1,2}月)/.test(rawQuery) ||
    /(?:2月份和3月份|3月份和2月份)/.test(rawQuery)
  const hasDeltaRanking = /(提高最多|增长最多|变化最大|增幅最大)/.test(rawQuery)

  if (scope === 'yield') {
    if (!metric) missing.push('metric')
    if (!hasTime) missing.push('time_window')
    if (!aggregation && questionShape !== 'current_snapshot') missing.push('metric_agg')
  }
  if (scope === 'vault' && metric === 'tvl' && !hasTime && questionShape === 'trend_window') {
    missing.push('time_window')
  }
  if ((scope === 'yield' || metric === 'apy' || metric === 'tvl') && hasAverage && hasHighLowCombo) {
    missing.push('primary_goal')
  }
  if ((scope === 'vault' || scope === 'yield' || metric === 'tvl' || metric === 'apy') && hasPeriodCompare && hasCrossMonth && hasDeltaRanking) {
    missing.push('primary_goal')
  }
  if (scope === 'execution' && !readString({ execution_id: params.filters as unknown }, 'execution_id')) {
    // no-op: execution lookup may still be satisfied by latest-record semantics
  }
  return Array.from(new Set(missing))
}

export function buildQueryContractV2(params: {
  scope: BusinessScope
  rawQuery: string
  slots: Record<string, unknown>
  filters: BusinessFilters
}): QueryContractV2 {
  const { scope, rawQuery, slots, filters } = params
  let metric = readString(slots, 'metric')
  let aggregation = readString(slots, 'aggregation') || readString(slots, 'metric_agg')
  let questionShape = inferQuestionShape(rawQuery, slots, filters)
  const rankingDimension = parseYieldRankingDimension(rawQuery)
  if (scope === 'yield') {
    const normalizedYield = normalizeYieldContract({
      rawQuery,
      metric,
      aggregation,
      questionShape,
      filters,
    })
    metric = normalizedYield.metric
    aggregation = normalizedYield.aggregation
    questionShape = normalizedYield.questionShape
  }
  const returnFields = Array.isArray(slots.return_fields)
    ? slots.return_fields.map((value) => String(value)).filter(Boolean)
    : []
  const compareTargets = Array.isArray(slots.compare_targets)
    ? slots.compare_targets.map((value) => String(value)).filter(Boolean)
    : []
  const missingSlots = inferMissingSlots({
    rawQuery,
    scope,
    metric,
    aggregation,
    filters,
    questionShape,
  })

  return {
    version: 'v2',
    scope,
    metric,
    entity: readString(slots, 'entity'),
    aggregation,
    query_mode: inferQueryMode(scope, rawQuery, questionShape),
    question_shape: questionShape,
    ranking_dimension: rankingDimension,
    return_fields: returnFields,
    time: {
      timezone: readString(slots, 'timezone') || 'Asia/Shanghai',
      time_window_days: filters.time_window_days ?? null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      exact_day: readString(slots, 'exact_day'),
      calendar_year: readNumber(slots, 'calendar_year'),
      calendar_month: readNumber(slots, 'calendar_month'),
      week_of_month: readNumber(slots, 'week_of_month'),
    },
    targets: {
      chain: filters.chain || readString(slots, 'chain'),
      protocol: filters.protocol || readString(slots, 'protocol'),
      vault_name: readString(slots, 'vault_name'),
      market_name: readString(slots, 'market_name'),
      compare_targets: compareTargets,
      execution_id: readString(slots, 'execution_id'),
    },
    completeness: {
      ready: missingSlots.length === 0,
      missing_slots: missingSlots,
    },
  }
}
