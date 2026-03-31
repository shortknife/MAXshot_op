import type { CapabilityOutput } from '@/lib/router/types/capability'
import type { MemoryRuntime } from '@/lib/capabilities/memory-refs'
import type { BusinessFilters } from '@/lib/capabilities/business-query-context'
import type { BusinessScope as Scope, BusinessQueryResult as QueryResult } from '@/lib/capabilities/business-query-runtime'

function failureNextActions(reason: string): string[] {
  return reason === 'query_incomplete'
    ? ['补充时间范围', '补充查询对象', '说明统计口径']
    : reason === 'no_data_in_selected_range'
      ? ['换一个时间范围重试', '改查最近7天或最近30天', '指定 chain / protocol / vault 缩小范围']
    : reason === 'insufficient_business_data'
    ? ['补充时间范围（如最近7天）', '提供 execution_id 或 vault 名称', '切换到 APY 或 Vault 列表查询']
    : reason === 'out_of_business_scope'
      ? ['改问 Vault/Execution/APY', '使用业务指标类问题', '在问题中增加对象和时间范围']
      : ['稍后重试', '检查数据源连接', '改用更具体的问题']
}

export function buildFailureOutput(reason: string, scope: Scope): CapabilityOutput {
  return {
    capability_id: 'business_data_query',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'business_data_query',
      capability_version: '1.0',
      status: 'failed',
      used_skills: ['supabase-read'],
    },
    used_skills: ['supabase-read'],
    metadata: {
      rejected_reason: reason,
      scope,
      data_plane: 'business',
      next_actions: failureNextActions(reason),
    },
  }
}

export function buildFreeformSuccessOutput(params: {
  freeform: QueryResult
  filters: BusinessFilters
  memoryRuntime: MemoryRuntime
  semanticDefaults: Record<string, unknown>
  sourcePolicy: Record<string, unknown>
  followUpPolicy: Record<string, unknown>
}): CapabilityOutput {
  const { freeform, filters, memoryRuntime, semanticDefaults, sourcePolicy, followUpPolicy } = params
  return {
    capability_id: 'business_data_query',
    capability_version: '1.0',
    status: 'success',
    result: {
      scope: freeform.scope,
      summary: freeform.summary,
      rows: freeform.rows,
      filters_applied: filters,
      non_prod_excluded_count: 0,
      invalid_metric_excluded_count: 0,
      metric_semantics: 'business_metric',
    },
    evidence: {
      sources: [
        {
          source: 'supabase',
          data_plane: 'business',
          source_type: freeform.source_type,
          source_id: freeform.source_id,
          row_count: freeform.rows.length,
          evidence_summary: freeform.summary,
        },
      ],
      doc_quotes: null,
    },
    audit: {
      capability_id: 'business_data_query',
      capability_version: '1.0',
      status: 'success',
      used_skills: ['supabase-read', 'sql-generation'],
    },
    used_skills: ['supabase-read', 'sql-generation'],
    metadata: {
      data_plane: 'business',
      source_type: freeform.source_type,
      source_id: freeform.source_id,
      freeform_sql: true,
      memory_runtime: memoryRuntime,
      semantic_defaults: semanticDefaults,
      source_policy: sourcePolicy,
      follow_up_policy: followUpPolicy,
    },
  }
}

export function buildSuccessOutput(params: {
  query: QueryResult
  summaryWithFilter: string
  scopedRows: Record<string, unknown>[]
  filters: BusinessFilters
  nonProdExcluded: number
  invalidMetricExcluded: number
  fallbackUsed: boolean
  metricSemantics: string
  qualityAlert: unknown
  memoryRefsCount: number
  memoryRuntime: MemoryRuntime
  semanticDefaults: Record<string, unknown>
  sourcePolicy: Record<string, unknown>
  followUpPolicy: Record<string, unknown>
}): CapabilityOutput {
  const {
    query,
    summaryWithFilter,
    scopedRows,
    filters,
    nonProdExcluded,
    invalidMetricExcluded,
    fallbackUsed,
    metricSemantics,
    qualityAlert,
    memoryRefsCount,
    memoryRuntime,
    semanticDefaults,
    sourcePolicy,
    followUpPolicy,
  } = params

  const result = {
    scope: query.scope,
    summary: summaryWithFilter,
    rows: scopedRows,
    filters_applied: filters,
    non_prod_excluded_count: nonProdExcluded,
    invalid_metric_excluded_count: invalidMetricExcluded,
    metric_semantics: metricSemantics,
    fallback_testnet_shown: fallbackUsed,
    quality_alert: qualityAlert,
  }

  return {
    capability_id: 'business_data_query',
    capability_version: '1.0',
    status: 'success',
    result,
    evidence: {
      sources: [
        {
          source: 'supabase',
          data_plane: 'business',
          source_type: query.source_type,
          source_id: query.source_id,
          row_count: scopedRows.length,
          evidence_summary: summaryWithFilter,
          filters_applied: filters,
          non_prod_excluded_count: nonProdExcluded,
          invalid_metric_excluded_count: invalidMetricExcluded,
          fallback_testnet_shown: fallbackUsed,
        },
      ],
      doc_quotes: null,
    },
    audit: {
      capability_id: 'business_data_query',
      capability_version: '1.0',
      status: 'success',
      used_skills: ['supabase-read'],
    },
    used_skills: ['supabase-read'],
    metadata: {
      data_plane: 'business',
      source_type: query.source_type,
      source_id: query.source_id,
      metric_semantics: metricSemantics,
      memory_ref_count: memoryRefsCount,
      memory_runtime: memoryRuntime,
      semantic_defaults: semanticDefaults,
      source_policy: sourcePolicy,
      follow_up_policy: followUpPolicy,
      filters_applied: filters,
      non_prod_excluded_count: nonProdExcluded,
      invalid_metric_excluded_count: invalidMetricExcluded,
      fallback_testnet_shown: fallbackUsed,
      quality_alert: qualityAlert,
    },
  }
}
