import { renderSqlTemplate } from '@/lib/sql-templates'
import {
  businessRpc,
  businessSelect,
  businessSelectLatestByCreatedAt,
  businessSelectLatestByFreshness,
  findAllocationExecutionIdsByVaultKeyword,
  findExecutionByExecutionIdOrId,
  queryMarketMetricsSince,
  queryMarketMetricsBetween,
} from '@/lib/capabilities/business-data-access'
import { parseBusinessFilters, parseTopN, parseTrendDays } from '@/lib/capabilities/business-query-context'
import {
  parseCompareVaultKeywords,
  parseVaultKeyword,
  parseYieldRankingDimension,
  wantsYieldExtremes,
  wantsYieldRealtime,
  wantsYieldTrend,
} from '@/lib/capabilities/business-query-planner'
import { toApyPercent } from '@/lib/capabilities/business-query-filters'
import {
  summarizeExecutionRows,
  summarizeMetricRows,
  summarizeRebalanceRows,
  summarizeVaultRows,
  formatRebalanceRows,
} from '@/lib/capabilities/business-query-normalizer'
import type { BusinessQueryResult as QueryResult, BusinessScope as Scope } from '@/lib/capabilities/business-query-runtime'

type RetryFn = <T>(fn: () => Promise<T>) => Promise<T>

type ResolverFactoryParams = {
  withRetry: RetryFn
  explainMaxTotalCost: number
}

function extractExplainTotalCost(payload: unknown): number | null {
  if (!payload) return null
  try {
    const arr = Array.isArray(payload) ? payload : [payload]
    const plan = (arr[0] as { Plan?: { ['Total Cost']?: number } })?.Plan
    const total = plan?.['Total Cost']
    return typeof total === 'number' ? total : null
  } catch {
    return null
  }
}

export function buildBusinessQueryResolvers({ withRetry, explainMaxTotalCost }: ResolverFactoryParams) {
  async function tryRpc(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; data: unknown; error?: string }> {
    try {
      const { data, error } = await withRetry(() => businessRpc(name, args))
      if (error) return { ok: false, data: null, error: error.message }
      return { ok: true, data }
    } catch (e) {
      return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async function tryTemplateQuery(
    templateId: string,
    slots: Record<string, unknown>
  ): Promise<{ ok: boolean; rows: Record<string, unknown>[]; error?: string }> {
    try {
      const rendered = renderSqlTemplate(templateId, slots)
      const sqlParams = rendered.params.map((p) => (p === undefined ? null : p))
      const { data: explainData, error: explainError } = await withRetry(() =>
        businessRpc('sql_template_explain_op', {
          sql: rendered.sql,
          params: sqlParams,
        })
      )
      if (explainError) return { ok: false, rows: [], error: explainError.message || 'sql_template_explain_failed' }
      const explainCost = extractExplainTotalCost(explainData)
      if (explainCost !== null && explainCost > explainMaxTotalCost) {
        return { ok: false, rows: [], error: 'explain_cost_exceeded' }
      }
      const { data, error } = await withRetry(() =>
        businessRpc('sql_template_query', {
          sql: rendered.sql,
          params: sqlParams,
        })
      )
      if (error) return { ok: false, rows: [], error: error.message || 'sql_template_query_failed' }
      return { ok: true, rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [] }
    } catch (e) {
      return { ok: false, rows: [], error: e instanceof Error ? e.message : String(e) }
    }
  }

  async function tryTableLatest(table: string, limit = 10): Promise<{ ok: boolean; rows: Record<string, unknown>[]; error?: string }> {
    try {
      const ordered = await withRetry(() => businessSelectLatestByCreatedAt(table, limit))
      if (!ordered.error) {
        return { ok: true, rows: (ordered.data || []) as Record<string, unknown>[] }
      }
      const plain = await withRetry(() => businessSelect(table, limit))
      if (plain.error) return { ok: false, rows: [], error: plain.error.message }
      return { ok: true, rows: (plain.data || []) as Record<string, unknown>[] }
    } catch (e) {
      return { ok: false, rows: [], error: e instanceof Error ? e.message : String(e) }
    }
  }

  async function tryExecutionLatest(limit = 10): Promise<{ ok: boolean; rows: Record<string, unknown>[]; error?: string }> {
    try {
      const ordered = await withRetry(() => businessSelectLatestByFreshness('executions', limit))
      if (!ordered.error) {
        return { ok: true, rows: (ordered.data || []) as Record<string, unknown>[] }
      }
      const legacy = await withRetry(() => businessSelectLatestByCreatedAt('executions', limit))
      if (!legacy.error) {
        return { ok: true, rows: (legacy.data || []) as Record<string, unknown>[] }
      }
      const plain = await withRetry(() => businessSelect('executions', limit))
      if (plain.error) return { ok: false, rows: [], error: plain.error.message }
      return { ok: true, rows: (plain.data || []) as Record<string, unknown>[] }
    } catch (e) {
      return { ok: false, rows: [], error: e instanceof Error ? e.message : String(e) }
    }
  }

  async function tryExecutionById(executionId: string): Promise<{ ok: boolean; rows: Record<string, unknown>[]; error?: string }> {
    try {
      const result = await withRetry(() => findExecutionByExecutionIdOrId(executionId))
      if (result.error) return { ok: false, rows: [], error: result.error.message }
      return { ok: true, rows: (result.data || []) as Record<string, unknown>[] }
    } catch (e) {
      return { ok: false, rows: [], error: e instanceof Error ? e.message : String(e) }
    }
  }

  async function resolveYieldWindowAggregate(rawQuery: string, params: {
    days?: number
    dateFrom?: string
    dateTo?: string
    aggregation?: string | null
  }): Promise<Record<string, unknown>[] | null> {
    try {
      const { days, dateFrom, dateTo, aggregation } = params
      const compareTargets = parseCompareVaultKeywords(rawQuery)
      const targetKeywords = compareTargets.length >= 2 ? compareTargets : (() => {
        const single = parseVaultKeyword(rawQuery)
        return single ? [single] : []
      })()
      const executionIdsByKeyword = new Map<string, string[]>()

      for (const keyword of targetKeywords) {
        const { data: allocationRows, error: allocationError } = await withRetry(() =>
          findAllocationExecutionIdsByVaultKeyword(keyword)
        )
        if (allocationError) return null
        executionIdsByKeyword.set(
          keyword,
          Array.from(
            new Set(
              (allocationRows || [])
                .map((row) => String((row as { execution_id?: string }).execution_id || '').trim())
                .filter(Boolean)
            )
          )
        )
      }

      const fromIso = dateFrom ? `${dateFrom}T00:00:00+08:00` : null
      const toIso = dateTo ? `${dateTo}T23:59:59+08:00` : null
      const { data, error } = fromIso && toIso
        ? await withRetry(() => queryMarketMetricsBetween(fromIso, toIso))
        : await withRetry(() => queryMarketMetricsSince(new Date(Date.now() - (days || 7) * 24 * 60 * 60 * 1000).toISOString()))
      if (error || !Array.isArray(data)) return null

      const narrowedRows = !targetKeywords.length
        ? (data as Record<string, unknown>[])
        : (data as Record<string, unknown>[]).flatMap((row) => {
            const haystack = [row.market_name, row.market, row.protocol, row.chain]
              .map((value) => String(value || '').toLowerCase())
            const executionId = String(row.execution_id || '').trim()
            const matchedKeyword = targetKeywords.find((keyword) => {
              const executionIds = executionIdsByKeyword.get(keyword) || []
              const executionMatch = executionIds.length ? executionIds.includes(executionId) : false
              const textMatch = haystack.some((value) => value.includes(keyword.toLowerCase()))
              return textMatch || (!textMatch && executionMatch && targetKeywords.length === 1)
            })
            return matchedKeyword ? [{ ...row, __compare_target: matchedKeyword }] : []
          })

      if (targetKeywords.length && !narrowedRows.length) return []

      const grouped = new Map<
        string,
        {
          chain: string | null
          protocol: string | null
          market_name: string | null
          sumApy: number
          count: number
          maxApy: number
          minApy: number
          latestTvl: number
          latestCreatedAt: string | null
          maxApyAt: string | null
        }
      >()

      for (const row of narrowedRows) {
        const record = row as Record<string, unknown>
        const chain = String(record.chain || '').trim() || null
        const protocol = String(record.protocol || '').trim() || null
        const marketName = String(record.market_name || '').trim() || 'Unknown Market'
        const apy = toApyPercent(record.net_apy ?? record.base_apy ?? NaN)
        if (!Number.isFinite(apy)) continue
        const compareTarget = String(record.__compare_target || '').trim() || null
        const key =
          compareTargets.length >= 2
            ? `compare__${compareTarget || marketName}`
            : `${chain || ''}__${protocol || ''}__${marketName}`
        const createdAt = String(record.created_at || '').trim() || null
        const tvl = Number(record.tvl ?? 0)
        const existing = grouped.get(key)
        if (!existing) {
          grouped.set(key, {
            chain: compareTargets.length >= 2 ? null : chain,
            protocol: compareTargets.length >= 2 ? null : protocol,
            market_name: compareTargets.length >= 2 ? compareTarget || marketName : marketName,
            sumApy: apy,
            count: 1,
            maxApy: apy,
            minApy: apy,
            latestTvl: Number.isFinite(tvl) ? tvl : 0,
            latestCreatedAt: createdAt,
            maxApyAt: createdAt,
          })
          continue
        }
        existing.sumApy += apy
        existing.count += 1
        if (apy > existing.maxApy) {
          existing.maxApy = apy
          existing.maxApyAt = createdAt
        }
        existing.minApy = Math.min(existing.minApy, apy)
        if (createdAt && (!existing.latestCreatedAt || createdAt > existing.latestCreatedAt)) {
          existing.latestCreatedAt = createdAt
          existing.latestTvl = Number.isFinite(tvl) ? tvl : existing.latestTvl
        }
      }

      const groupedRows = [...grouped.values()]
        .map((item) => ({
          chain: item.chain,
          protocol: item.protocol,
          market_name: item.market_name,
          avg_apy_pct: Number((item.sumApy / item.count).toFixed(4)),
          max_apy_pct: Number(item.maxApy.toFixed(4)),
          min_apy_pct: Number(item.minApy.toFixed(4)),
          tvl: Number(item.latestTvl.toFixed(4)),
          created_at: item.latestCreatedAt,
          sample_count: item.count,
          max_apy_at: item.maxApyAt,
        }))
      if (aggregation === 'max' && groupedRows.length > 0 && compareTargets.length < 2) {
        const top = [...groupedRows].sort((a, b) => Number(b.max_apy_pct || 0) - Number(a.max_apy_pct || 0))[0]
        return [{
          chain: top.chain,
          protocol: top.protocol,
          market_name: top.market_name,
          top_apy_pct: top.max_apy_pct,
          tvl_total: top.tvl,
          sample_count: top.sample_count,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          max_apy_at: top.max_apy_at || null,
          created_at: top.max_apy_at || null,
        }]
      }
      return groupedRows.sort((a, b) => Number(b.avg_apy_pct || 0) - Number(a.avg_apy_pct || 0))
    } catch {
      return null
    }
  }

  async function resolveVault(scope: Scope): Promise<QueryResult | null> {
    const vaultDim = await tryTableLatest('dim_vaults', 200)
    if (vaultDim.ok && vaultDim.rows.length) {
      return {
        scope,
        rows: vaultDim.rows,
        summary: summarizeVaultRows(vaultDim.rows),
        source_type: 'table',
        source_id: 'dim_vaults',
      }
    }

    const rpc = await tryRpc('get_vaults_overview_v1', { limit_count: 20 })
    if (rpc.ok && Array.isArray(rpc.data)) {
      const rows = rpc.data as Record<string, unknown>[]
      return {
        scope,
        rows,
        summary: summarizeVaultRows(rows),
        source_type: 'rpc',
        source_id: 'get_vaults_overview_v1',
      }
    }

    const table = await tryTableLatest('allocation_snapshots', 20)
    if (table.ok) {
      return {
        scope,
        rows: table.rows,
        summary: summarizeVaultRows(table.rows),
        source_type: 'table',
        source_id: 'allocation_snapshots',
      }
    }

    return null
  }

  async function resolveRebalance(scope: Scope): Promise<QueryResult | null> {
    const table = await tryTableLatest('rebalance_decisions', 20)
    if (table.ok) {
      return {
        scope,
        rows: table.rows,
        summary: summarizeRebalanceRows(formatRebalanceRows(table.rows)),
        source_type: 'table',
        source_id: 'rebalance_decisions',
      }
    }
    return null
  }

  async function resolveExecution(scope: Scope, executionId: string | null): Promise<QueryResult | null> {
    if (executionId) {
      const rpc = await tryRpc('get_execution_details_v1', { target_execution_id: executionId, execution_id: executionId })
      if (rpc.ok && rpc.data) {
        const rows = Array.isArray(rpc.data) ? (rpc.data as Record<string, unknown>[]) : [rpc.data as Record<string, unknown>]
        return {
          scope,
          rows,
          summary: summarizeExecutionRows(rows),
          source_type: 'rpc',
          source_id: 'get_execution_details_v1',
        }
      }

      const byId = await tryExecutionById(executionId)
      if (byId.ok && byId.rows.length) {
        return {
          scope,
          rows: byId.rows,
          summary: summarizeExecutionRows(byId.rows),
          source_type: 'table',
          source_id: 'executions',
        }
      }
    }

    const table = await tryExecutionLatest(10)
    if (table.ok) {
      const rows = executionId
        ? table.rows.filter((r) => String(r.execution_id || r.id || '') === executionId)
        : table.rows.filter((r) => String(r.execution_id || r.id || '').trim())
      return {
        scope,
        rows,
        summary: summarizeExecutionRows(rows),
        source_type: 'table',
        source_id: 'executions',
      }
    }

    return null
  }

  async function resolveMetrics(scope: Scope, rawQuery: string, slots: Record<string, unknown>): Promise<QueryResult | null> {
    const rankingDimension = parseYieldRankingDimension(rawQuery)
    if (rankingDimension) {
      const rankingSlots = {
        days: parseTrendDays(rawQuery),
        dimension: rankingDimension,
        limit: parseTopN(rawQuery, 20),
      }
      const template = await tryTemplateQuery('business_yield_dimension_ranking', rankingSlots)
      if (template.ok && template.rows.length) {
        return {
          scope,
          rows: template.rows,
          summary: summarizeMetricRows(template.rows),
          source_type: 'template',
          source_id: 'business_yield_dimension_ranking',
        }
      }
    }
    if (wantsYieldExtremes(rawQuery)) {
      const extremeSlots = {
        days: parseTrendDays(rawQuery),
        timezone: 'Asia/Shanghai',
        vault_keyword: parseVaultKeyword(rawQuery),
      }
      const template = await tryTemplateQuery('business_yield_extremes_with_reason', extremeSlots)
      if (template.ok && template.rows.length) {
        return {
          scope,
          rows: template.rows,
          summary: summarizeMetricRows(template.rows),
          source_type: 'template',
          source_id: 'business_yield_extremes_with_reason',
        }
      }
    }
    if (wantsYieldTrend(rawQuery)) {
      const trendSlots = {
        days: parseTrendDays(rawQuery),
        timezone: 'Asia/Shanghai',
        vault_keyword: parseVaultKeyword(rawQuery),
      }
      const template = await tryTemplateQuery('business_yield_daily_trend', trendSlots)
      if (template.ok && template.rows.length) {
        return {
          scope,
          rows: template.rows,
          summary: summarizeMetricRows(template.rows),
          source_type: 'template',
          source_id: 'business_yield_daily_trend',
        }
      }
    }
    const filters = parseBusinessFilters(rawQuery)
    const slotAggregation = String(slots.aggregation || slots.metric_agg || '').trim().toLowerCase()
    const slotDateFrom = String(slots.date_from || '').trim() || undefined
    const slotDateTo = String(slots.date_to || '').trim() || undefined
    const preferWindowAverage =
      (Boolean(filters.time_window_days) || (Boolean(slotDateFrom) && Boolean(slotDateTo))) &&
      !wantsYieldTrend(rawQuery) &&
      !wantsYieldExtremes(rawQuery) &&
      !wantsYieldRealtime(rawQuery)
    if (preferWindowAverage) {
      const averagedRows = await resolveYieldWindowAggregate(rawQuery, {
        days: filters.time_window_days || 7,
        dateFrom: slotDateFrom || filters.date_from,
        dateTo: slotDateTo || filters.date_to,
        aggregation: slotAggregation,
      })
      if (averagedRows && averagedRows.length) {
        return {
          scope,
          rows: averagedRows,
          summary: summarizeMetricRows(averagedRows),
          source_type: 'table',
          source_id: slotAggregation === 'max' ? 'business_yield_top1_range' : 'business_yield_window_average',
        }
      }
    }
    const rpc = await tryRpc('get_metrics_summary_v1', {})
    if (rpc.ok && rpc.data) {
      const rows = Array.isArray(rpc.data) ? (rpc.data as Record<string, unknown>[]) : [rpc.data as Record<string, unknown>]
      return {
        scope,
        rows,
        summary: summarizeMetricRows(rows),
        source_type: 'rpc',
        source_id: 'get_metrics_summary_v1',
      }
    }

    const table = await tryTableLatest('market_metrics', 20)
    if (table.ok) {
      return {
        scope,
        rows: table.rows,
        summary: summarizeMetricRows(table.rows),
        source_type: 'table',
        source_id: 'market_metrics',
      }
    }

    const allocation = await tryTableLatest('allocation_snapshots', 20)
    if (allocation.ok) {
      const rows = allocation.rows.filter((r) => {
        const allocated = Number(r.total_allocated || 0)
        return allocated > 0
      })
      return {
        scope,
        rows,
        summary: summarizeMetricRows(rows),
        source_type: 'table',
        source_id: 'allocation_snapshots',
      }
    }

    return null
  }

  return {
    resolveVault,
    resolveExecution,
    resolveMetrics,
    resolveRebalance,
  }
}
