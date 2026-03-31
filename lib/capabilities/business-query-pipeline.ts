import type { BusinessQueryResult as QueryResult } from '@/lib/capabilities/business-query-runtime'
import type { BusinessFilters } from '@/lib/capabilities/business-query-context'
import { applyBusinessFilters, applyYieldQualityFilter, summarizeFilterSuffix } from '@/lib/capabilities/business-query-filters'
import {
  buildYieldQualityAlert,
  deriveMetricSemantics,
  formatExecutionRows,
  formatRebalanceRows,
  formatVaultRows,
  formatYieldRows,
  summarizeExecutionRows,
  summarizeMetricRows,
  summarizeRebalanceRows,
  summarizeVaultRows,
} from '@/lib/capabilities/business-query-normalizer'

export type QueryPipelineResult = {
  scopedRows: Record<string, unknown>[]
  summaryWithFilter: string
  nonProdExcluded: number
  invalidMetricExcluded: number
  fallbackUsed: boolean
  metricSemantics: string
  qualityAlert: ReturnType<typeof buildYieldQualityAlert> | null
}

export function runBusinessQueryPipeline(params: {
  query: QueryResult
  filters: BusinessFilters
  rawQuery: string
  wantsSingleExecution: (rawQuery: string) => boolean
}): QueryPipelineResult | null {
  const { query, filters, rawQuery, wantsSingleExecution } = params

  const formattedRows =
    query.scope === 'yield'
      ? formatYieldRows(query.rows)
      : query.scope === 'rebalance'
        ? formatRebalanceRows(query.rows)
        : query.scope === 'execution'
          ? formatExecutionRows(query.rows)
          : formatVaultRows(query.rows)

  const qualityApplied = query.scope === 'yield' ? applyYieldQualityFilter(formattedRows) : { rows: formattedRows, excluded: 0 }
  let { rows: filteredRows, nonProdExcluded } = applyBusinessFilters(qualityApplied.rows, filters)

  let fallbackUsed = false
  if (!filteredRows.length && nonProdExcluded > 0 && (query.scope === 'vault' || query.scope === 'allocation')) {
    filteredRows = qualityApplied.rows
    fallbackUsed = true
  }

  const scopedRows = query.scope === 'execution' && wantsSingleExecution(rawQuery) ? filteredRows.slice(0, 1) : filteredRows
  if (!scopedRows.length) return null

  const summaryCore =
    query.scope === 'yield'
      ? summarizeMetricRows(scopedRows)
      : query.scope === 'rebalance'
        ? summarizeRebalanceRows(scopedRows)
        : query.scope === 'execution'
          ? summarizeExecutionRows(scopedRows)
          : summarizeVaultRows(scopedRows)

  const summaryWithFilter =
    summaryCore +
    summarizeFilterSuffix(filters, nonProdExcluded, qualityApplied.excluded) +
    (fallbackUsed ? '（仅有 testnet/staging 数据，已临时展示全部记录）' : '')

  return {
    scopedRows,
    summaryWithFilter,
    nonProdExcluded,
    invalidMetricExcluded: qualityApplied.excluded,
    fallbackUsed,
    metricSemantics: deriveMetricSemantics(query.scope, query.source_id),
    qualityAlert: query.scope === 'yield' ? buildYieldQualityAlert(scopedRows) : null,
  }
}
