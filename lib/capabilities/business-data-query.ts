/**
 * businessDataQuery (orchestrator)
 *
 * Responsibilities kept here:
 * - compose request context (scope/filters/memory refs)
 * - call provider/runtime/pipeline modules
 * - finalize output with contract validation
 */
import { CapabilityInputEnvelope, CapabilityOutput } from '@/lib/router/types/capability'
import {
  validateDataQueryInputContract,
} from '@/lib/capabilities/contracts/data-query-contract'
import {
  assembleBusinessQueryContext,
} from '@/lib/capabilities/business-query-context-assembly'
import {
  extractExecutionId,
  wantsSingleExecution,
} from '@/lib/capabilities/business-query-planner'
import {
  resolveQueryByScope,
} from '@/lib/capabilities/business-query-runtime'
import {
  buildFailureOutput,
  buildFreeformSuccessOutput,
  buildSuccessOutput,
} from '@/lib/capabilities/business-query-output'
import { buildBusinessQueryResolvers } from '@/lib/capabilities/business-query-provider'
import { buildWithRetry } from '@/lib/capabilities/business-query-retry'
import { tryFreeformSql } from '@/lib/capabilities/business-query-freeform'
import { runBusinessQueryPipeline } from '@/lib/capabilities/business-query-pipeline'
import { buildContractFinalizer } from '@/lib/capabilities/business-query-contract'

const EXPLAIN_MAX_TOTAL_COST = Number.parseInt(process.env.SQL_EXPLAIN_MAX_TOTAL_COST || '100000', 10) || 100000
const TRANSIENT_RETRY_ATTEMPTS = Number.parseInt(process.env.BUSINESS_QUERY_RETRY_ATTEMPTS || '2', 10) || 2
const FREEFORM_SQL_ENABLED = String(process.env.BUSINESS_FREEFORM_SQL || '').toLowerCase() === 'true'
const withRetry = buildWithRetry(TRANSIENT_RETRY_ATTEMPTS)

const { resolveVault, resolveExecution, resolveMetrics, resolveRebalance } = buildBusinessQueryResolvers({
  withRetry,
  explainMaxTotalCost: EXPLAIN_MAX_TOTAL_COST,
})

function resolveEmptyResultReason(params: {
  scope: string
  filters: { time_window_days?: number; date_from?: string; date_to?: string }
  querySourceId?: string | null
  slots?: Record<string, unknown>
}): string {
  const { scope, filters, querySourceId, slots } = params
  if (
    scope === 'yield' &&
    (filters.date_from ||
      filters.date_to ||
      filters.time_window_days ||
      String(querySourceId || '').includes('yield_top1_range') ||
      String(slots?.question_shape || '').includes('top_1_in_period'))
  ) {
    return 'no_data_in_selected_range'
  }
  return 'insufficient_business_data'
}

export async function businessDataQuery(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  const {
    slots,
    scope,
    rawQuery,
    filters,
    memoryRefs,
    memoryRuntime,
    semanticDefaults,
    sourcePolicy,
    followUpPolicy,
  } = assembleBusinessQueryContext(input)
  const inputContract = validateDataQueryInputContract({
    input,
    scope,
    rawQuery,
  })
  const finalizeOutput = buildContractFinalizer(inputContract)

  if (scope === 'unknown') {
    if (FREEFORM_SQL_ENABLED) {
      const freeform = await tryFreeformSql({ rawQuery, withRetry, explainMaxTotalCost: EXPLAIN_MAX_TOTAL_COST })
      if (freeform && freeform.rows.length) {
        return finalizeOutput(
          buildFreeformSuccessOutput({
            freeform,
            filters,
            memoryRuntime,
            semanticDefaults,
            sourcePolicy,
            followUpPolicy,
          })
        )
      }
    }
    return finalizeOutput(buildFailureOutput('out_of_business_scope', scope))
  }

  const query = await resolveQueryByScope({
    scope,
    rawQuery,
    slots,
    resolveVault,
    resolveExecution,
    resolveMetrics,
    resolveRebalance,
    extractExecutionId,
  })

  if (!query) {
    return finalizeOutput(buildFailureOutput('source_not_connected', scope))
  }
  if (!query.rows.length) {
    return finalizeOutput(buildFailureOutput(resolveEmptyResultReason({
      scope,
      filters,
      querySourceId: query.source_id,
      slots,
    }), scope))
  }

  const pipeline = runBusinessQueryPipeline({
    query,
    filters,
    rawQuery,
    wantsSingleExecution,
  })

  if (!pipeline) {
    return finalizeOutput(buildFailureOutput(resolveEmptyResultReason({
      scope,
      filters,
      querySourceId: query.source_id,
      slots,
    }), scope))
  }

  const {
    scopedRows,
    summaryWithFilter,
    nonProdExcluded,
    invalidMetricExcluded,
    fallbackUsed,
    metricSemantics,
    qualityAlert,
  } = pipeline

  return finalizeOutput(
    buildSuccessOutput({
      query,
      summaryWithFilter,
      scopedRows,
      filters,
      nonProdExcluded,
      invalidMetricExcluded,
      fallbackUsed,
      metricSemantics,
      qualityAlert,
      memoryRefsCount: memoryRefs.length,
      memoryRuntime,
      semanticDefaults,
      sourcePolicy,
      followUpPolicy,
    })
  )
}
