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
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'
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
    chain?: string | null
    protocol?: string | null
    compareTargets?: string[]
    targetKeyword?: string | null
  }): Promise<Record<string, unknown>[] | null> {
    try {
      const { days, dateFrom, dateTo, aggregation } = params
      const chainFilter = String(params.chain || '').trim().toLowerCase()
      const protocolFilter = String(params.protocol || '').trim().toLowerCase()
      const compareTargets = Array.isArray(params.compareTargets) ? params.compareTargets.filter(Boolean) : parseCompareVaultKeywords(rawQuery)
      const targetKeywords = compareTargets.length >= 2 ? compareTargets : (() => {
        const single = params.targetKeyword || parseVaultKeyword(rawQuery)
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
      const filteredByScope = (data as Record<string, unknown>[]).filter((row) => {
        const chain = String(row.chain || '').trim().toLowerCase()
        const protocol = String(row.protocol || '').trim().toLowerCase()
        if (chainFilter && !chain.includes(chainFilter)) return false
        if (protocolFilter && !protocol.includes(protocolFilter)) return false
        return true
      })

      const narrowedRows = !targetKeywords.length
        ? filteredByScope
        : filteredByScope.flatMap((row) => {
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

  async function queryMetricsForRange(params: {
    days?: number
    dateFrom?: string
    dateTo?: string
  }): Promise<Record<string, unknown>[] | null> {
    try {
      const { days, dateFrom, dateTo } = params
      const fromIso = dateFrom ? `${dateFrom}T00:00:00+08:00` : null
      const toIso = dateTo ? `${dateTo}T23:59:59+08:00` : null
      const { data, error } = fromIso && toIso
        ? await withRetry(() => queryMarketMetricsBetween(fromIso, toIso))
        : await withRetry(() =>
            queryMarketMetricsSince(new Date(Date.now() - (days || 7) * 24 * 60 * 60 * 1000).toISOString())
          )
      if (error || !Array.isArray(data)) return null
      return data as Record<string, unknown>[]
    } catch {
      return null
    }
  }

  async function resolveTvlWindowAggregate(rawQuery: string, params: {
    days?: number
    dateFrom?: string
    dateTo?: string
    chain?: string
    protocol?: string
  }): Promise<Record<string, unknown>[] | null> {
    const rows = await queryMetricsForRange(params)
    if (!rows?.length) return null
    const chainFilter = String(params.chain || '').trim().toLowerCase()
    const protocolFilter = String(params.protocol || '').trim().toLowerCase()
    const filtered = rows.filter((row) => {
      const chain = String(row.chain || '').trim().toLowerCase()
      const protocol = String(row.protocol || '').trim().toLowerCase()
      if (chainFilter && !chain.includes(chainFilter)) return false
      if (protocolFilter && !protocol.includes(protocolFilter)) return false
      return true
    })
    if (!filtered.length) return []

    const grouped = new Map<string, { day_local: string; total_tvl: number; sample_count: number }>()
    for (const row of filtered) {
      const createdAt = String(row.created_at || '').trim()
      const dayLocal = createdAt ? createdAt.slice(0, 10) : ''
      const tvl = Number(row.tvl ?? NaN)
      if (!dayLocal || !Number.isFinite(tvl)) continue
      const current = grouped.get(dayLocal) || { day_local: dayLocal, total_tvl: 0, sample_count: 0 }
      current.total_tvl += tvl
      current.sample_count += 1
      grouped.set(dayLocal, current)
    }
    const daily = [...grouped.values()]
      .sort((a, b) => String(b.day_local).localeCompare(String(a.day_local)))
      .map((item) => ({
        day_local: item.day_local,
        avg_daily_tvl: Number(item.total_tvl.toFixed(4)),
        sample_count: item.sample_count,
      }))
    return daily
  }

  async function resolveYieldTopBottomInDay(params: {
    dateFrom: string
    dateTo: string
    chain?: string
    protocol?: string
  }): Promise<Record<string, unknown>[] | null> {
    const rows = await queryMetricsForRange(params)
    if (!rows?.length) return null
    const chainFilter = String(params.chain || '').trim().toLowerCase()
    const protocolFilter = String(params.protocol || '').trim().toLowerCase()
    const filtered = rows.filter((row) => {
      const chain = String(row.chain || '').trim().toLowerCase()
      const protocol = String(row.protocol || '').trim().toLowerCase()
      if (chainFilter && !chain.includes(chainFilter)) return false
      if (protocolFilter && !protocol.includes(protocolFilter)) return false
      return true
    })
    if (!filtered.length) return []

    const grouped = new Map<
      string,
      {
        chain: string | null
        protocol: string | null
        market_name: string | null
        max_apy_pct: number
        min_apy_pct: number
        latest_tvl: number
        latest_created_at: string | null
      }
    >()
    for (const row of filtered) {
      const marketName = String(row.market_name || row.market || '').trim() || 'Unknown Market'
      const apy = toApyPercent(row.net_apy ?? row.base_apy ?? NaN)
      if (!Number.isFinite(apy)) continue
      const createdAt = String(row.created_at || '').trim() || null
      const tvl = Number(row.tvl ?? 0)
      const current = grouped.get(marketName) || {
        chain: String(row.chain || '').trim() || null,
        protocol: String(row.protocol || '').trim() || null,
        market_name: marketName,
        max_apy_pct: apy,
        min_apy_pct: apy,
        latest_tvl: Number.isFinite(tvl) ? tvl : 0,
        latest_created_at: createdAt,
      }
      current.max_apy_pct = Math.max(current.max_apy_pct, apy)
      current.min_apy_pct = Math.min(current.min_apy_pct, apy)
      if (createdAt && (!current.latest_created_at || createdAt > current.latest_created_at)) {
        current.latest_created_at = createdAt
        current.latest_tvl = Number.isFinite(tvl) ? tvl : current.latest_tvl
      }
      grouped.set(marketName, current)
    }
    const candidates = [...grouped.values()]
    if (!candidates.length) return []
    const top = [...candidates].sort((a, b) => b.max_apy_pct - a.max_apy_pct)[0]
    const bottom = [...candidates].sort((a, b) => a.min_apy_pct - b.min_apy_pct)[0]
    return [
      {
        rank_type: 'highest',
        chain: top.chain,
        protocol: top.protocol,
        market_name: top.market_name,
        apy_pct: Number(top.max_apy_pct.toFixed(4)),
        tvl: Number(top.latest_tvl.toFixed(4)),
        created_at: top.latest_created_at,
        date_from: params.dateFrom,
        date_to: params.dateTo,
      },
      {
        rank_type: 'lowest',
        chain: bottom.chain,
        protocol: bottom.protocol,
        market_name: bottom.market_name,
        apy_pct: Number(bottom.min_apy_pct.toFixed(4)),
        tvl: Number(bottom.latest_tvl.toFixed(4)),
        created_at: bottom.latest_created_at,
        date_from: params.dateFrom,
        date_to: params.dateTo,
      },
    ]
  }

  async function resolveVault(scope: Scope, queryContract: QueryContractV2): Promise<QueryResult | null> {
    const vaultDim = await tryTableLatest('dim_vaults', 200)
    if (vaultDim.ok && vaultDim.rows.length) {
      const chainFilter = String(queryContract.targets.chain || '').trim().toLowerCase()
      const protocolFilter = String(queryContract.targets.protocol || '').trim().toLowerCase()
      const filteredRows = vaultDim.rows.filter((row) => {
        const chain = String((row.chain_name || row.chain || '')).trim().toLowerCase()
        const protocol = String((row.protocol_name || row.protocol || '')).trim().toLowerCase()
        if (chainFilter && !chain.includes(chainFilter)) return false
        if (protocolFilter && !protocol.includes(protocolFilter)) return false
        return true
      })
      return {
        scope,
        rows: filteredRows,
        summary: summarizeVaultRows(filteredRows),
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

  async function resolveMetrics(
    scope: Scope,
    rawQuery: string,
    slots: Record<string, unknown>,
    queryContract: QueryContractV2
  ): Promise<QueryResult | null> {
    const slotMetric = String(queryContract.metric || slots.metric || '').trim().toLowerCase()
    const slotQuestionShape = String(queryContract.question_shape || slots.question_shape || '').trim().toLowerCase()
    const slotAggregation = String(queryContract.aggregation || slots.aggregation || slots.metric_agg || '').trim().toLowerCase()
    const parsedFilters = parseBusinessFilters(rawQuery, slots)
    const filters = {
      ...parsedFilters,
      chain: queryContract.targets.chain || parsedFilters.chain,
      protocol: queryContract.targets.protocol || parsedFilters.protocol,
      time_window_days: queryContract.time.time_window_days ?? parsedFilters.time_window_days,
      date_from: queryContract.time.date_from || parsedFilters.date_from,
      date_to: queryContract.time.date_to || parsedFilters.date_to,
    }
    const compareTargets = queryContract.targets.compare_targets
    const targetKeyword = queryContract.targets.market_name || queryContract.targets.vault_name

    if (slotMetric === 'tvl' && (filters.date_from || filters.date_to || filters.time_window_days)) {
      const tvlRows = await resolveTvlWindowAggregate(rawQuery, {
        days: filters.time_window_days || 7,
        dateFrom: filters.date_from,
        dateTo: filters.date_to,
        chain: filters.chain,
        protocol: filters.protocol,
      })
      if (tvlRows && tvlRows.length) {
        return {
          scope,
          rows: tvlRows,
          summary: summarizeMetricRows(tvlRows),
          source_type: 'table',
          source_id: 'business_tvl_window_average',
        }
      }
    }

    if (
      (slotQuestionShape === 'top_bottom_in_day' || (slotAggregation === 'compare' && filters.date_from === filters.date_to)) &&
      filters.date_from
    ) {
      const topBottomRows = await resolveYieldTopBottomInDay({
        dateFrom: filters.date_from,
        dateTo: filters.date_to || filters.date_from,
        chain: filters.chain,
        protocol: filters.protocol,
      })
      if (topBottomRows && topBottomRows.length) {
        return {
          scope,
          rows: topBottomRows,
          summary: summarizeMetricRows(topBottomRows),
          source_type: 'table',
          source_id: 'business_yield_top_bottom_day',
        }
      }
    }

    const rankingDimension = queryContract.ranking_dimension || parseYieldRankingDimension(rawQuery)
    if (rankingDimension) {
      const rankingSlots = {
        days: filters.time_window_days || parseTrendDays(rawQuery),
        dimension: rankingDimension,
        limit: parseTopN(rawQuery, 20),
        chain: filters.chain || null,
        protocol: filters.protocol || null,
        vault_keyword: targetKeyword || null,
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
    const wantsExtremesByContract = ['extreme_window', 'top_bottom_in_day', 'top_1_in_period'].includes(slotQuestionShape)
    if (wantsExtremesByContract || wantsYieldExtremes(rawQuery)) {
      const extremeSlots = {
        days: filters.time_window_days || parseTrendDays(rawQuery),
        timezone: 'Asia/Shanghai',
        chain: filters.chain || null,
        protocol: filters.protocol || null,
        vault_keyword: targetKeyword || parseVaultKeyword(rawQuery),
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
    const wantsTrendByContract = slotQuestionShape === 'trend_window'
    if (wantsTrendByContract || wantsYieldTrend(rawQuery)) {
      const trendSlots = {
        days: filters.time_window_days || parseTrendDays(rawQuery),
        timezone: 'Asia/Shanghai',
        chain: filters.chain || null,
        protocol: filters.protocol || null,
        vault_keyword: targetKeyword || parseVaultKeyword(rawQuery),
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
    const slotDateFrom = String(slots.date_from || '').trim() || undefined
    const slotDateTo = String(slots.date_to || '').trim() || undefined
    const preferWindowAverage =
      (Boolean(filters.time_window_days) || (Boolean(slotDateFrom) && Boolean(slotDateTo))) &&
      !(wantsTrendByContract || wantsYieldTrend(rawQuery)) &&
      !(wantsExtremesByContract || wantsYieldExtremes(rawQuery)) &&
      !(slotQuestionShape === 'current_snapshot' || wantsYieldRealtime(rawQuery))
    if (preferWindowAverage) {
      const averagedRows = await resolveYieldWindowAggregate(rawQuery, {
        days: filters.time_window_days || 7,
        dateFrom: queryContract.time.date_from || slotDateFrom || filters.date_from,
        dateTo: queryContract.time.date_to || slotDateTo || filters.date_to,
        aggregation: slotAggregation,
        chain: filters.chain || null,
        protocol: filters.protocol || null,
        compareTargets,
        targetKeyword,
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
