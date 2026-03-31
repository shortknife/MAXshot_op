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
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance'

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
  const perf = createPerfTrace(
    'business.data_query',
    buildPerfQueryMeta(String(input?.context?.raw_query || ''), {
      execution_id: input.execution_id,
      capability_id: input.capability_id,
    })
  )

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
    queryContract,
  } = await perf.measure('assemble_business_query_context', () => Promise.resolve(assembleBusinessQueryContext(input)))
  const inputContract = await perf.measure(
    'validate_input_contract',
    () => Promise.resolve(validateDataQueryInputContract({ input, scope, rawQuery }))
  )
  const finalizeOutput = buildContractFinalizer(inputContract)

  if (scope === 'unknown') {
    if (FREEFORM_SQL_ENABLED) {
      const freeform = await perf.measure(
        'try_freeform_sql',
        () => tryFreeformSql({ rawQuery, withRetry, explainMaxTotalCost: EXPLAIN_MAX_TOTAL_COST })
      )
      if (freeform && freeform.rows.length) {
        const output = finalizeOutput(
          buildFreeformSuccessOutput({
            freeform,
            filters,
            queryContract,
            memoryRuntime,
            semanticDefaults,
            sourcePolicy,
            followUpPolicy,
          })
        )
        perf.finish({ scope, source_id: 'freeform_sql', row_count: freeform.rows.length, scoped_row_count: freeform.rows.length })
        return output
      }
    }
    const output = finalizeOutput(buildFailureOutput('out_of_business_scope', scope, queryContract))
    perf.finish({ scope, source_id: null, row_count: 0, scoped_row_count: 0, outcome: 'out_of_business_scope' })
    return output
  }

  const query = await perf.measure(
    'resolve_query_by_scope',
    () => resolveQueryByScope({
      scope,
      rawQuery,
      slots,
      queryContract,
      resolveVault,
      resolveExecution,
      resolveMetrics,
      resolveRebalance,
      extractExecutionId,
    })
  )

  if (!query) {
    const output = finalizeOutput(buildFailureOutput('source_not_connected', scope, queryContract))
    perf.finish({ scope, source_id: null, row_count: 0, scoped_row_count: 0, outcome: 'source_not_connected' })
    return output
  }
  if (!query.rows.length) {
    const reason = resolveEmptyResultReason({
      scope,
      filters,
      querySourceId: query.source_id,
      slots,
    })
    const output = finalizeOutput(buildFailureOutput(reason, scope, queryContract))
    perf.finish({ scope, source_id: query.source_id, row_count: 0, scoped_row_count: 0, outcome: reason })
    return output
  }

  const pipeline = await perf.measure(
    'run_business_query_pipeline',
    () => Promise.resolve(runBusinessQueryPipeline({ query, filters, rawQuery, queryContract, wantsSingleExecution }))
  )

  if (!pipeline) {
    const reason = resolveEmptyResultReason({
      scope,
      filters,
      querySourceId: query.source_id,
      slots,
    })
    const output = finalizeOutput(buildFailureOutput(reason, scope, queryContract))
    perf.finish({ scope, source_id: query.source_id, row_count: query.rows.length, scoped_row_count: 0, outcome: reason })
    return output
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

  const output = finalizeOutput(
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
      queryContract,
      memoryRuntime,
      semanticDefaults,
      sourcePolicy,
      followUpPolicy,
    })
  )
  perf.finish({ scope, source_id: query.source_id, row_count: query.rows.length, scoped_row_count: scopedRows.length, outcome: 'success' })
  return output
}
