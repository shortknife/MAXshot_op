import { supabase } from '../supabase'
import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'
import { fetchExternalJson, isAllowedExternalHost } from '../utils/external-fetch'
import { renderSqlTemplate } from '../sql-templates'
import {
  validateDataFactQueryInputContract,
  validateDataFactQueryOutputContract,
} from './contracts/data-fact-query-contract'


const EXPLAIN_MAX_TOTAL_COST = Number.parseInt(process.env.SQL_EXPLAIN_MAX_TOTAL_COST || '100000', 10) || 100000

function extractExplainTotalCost(payload: unknown): number | null {
  if (!payload) return null
  try {
    const arr = Array.isArray(payload) ? payload : [payload]
    const plan = (arr[0] as any)?.Plan
    const total = plan?.['Total Cost']
    return typeof total === 'number' ? total : null
  } catch {
    return null
  }
}

type QueryResult = {
  result: unknown
  evidenceSources: unknown[]
  fallbackReason?: string
  error?: string
  status: 'success' | 'failed'
}

type ExecutionRow = {
  execution_id: string
  status: string
  intent_name: string | null
  requester_id: string | null
  created_at: string
  updated_at: string
}

function buildFailure(reason: string): QueryResult {
  return {
    result: { message: reason },
    evidenceSources: [],
    fallbackReason: reason,
    error: reason,
    status: 'failed',
  }
}

function parseWindowSize(value: string | undefined): number {
  if (!value) return 200
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 200
  return Math.min(Math.floor(parsed), 1000)
}

function buildEvidence(metric: string, filters: Record<string, unknown>) {
  return {
    source: 'supabase',
    table: 'task_executions_op',
    metric,
    filters,
  }
}

export async function dataFactQuery(input: CapabilityInputEnvelope, client = supabase): Promise<CapabilityOutput> {
  let inputContract = validateDataFactQueryInputContract({ input, slotsValid: false })

  function finalizeOutput(output: CapabilityOutput): CapabilityOutput {
    const outputContract = validateDataFactQueryOutputContract(output)
    return {
      ...output,
      metadata: {
        ...(output.metadata || {}),
        contract_validation: {
          version: 'v1.0',
          input_passed: inputContract.passed,
          input_errors: inputContract.errors,
          output_passed: outputContract.passed,
          output_errors: outputContract.errors,
          contract_passed: inputContract.passed && outputContract.passed,
        },
      },
    }
  }

  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    inputContract = validateDataFactQueryInputContract({ input, slotsValid: false })
    return finalizeOutput({
      capability_id: 'data_fact_query',
      capability_version: '1.0',
      status: 'failed',
      result: null,
      error: reason,
      evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
      audit: {
        capability_id: 'data_fact_query',
        capability_version: '1.0',
        status: 'failed',
        used_skills: [],
      },
      used_skills: [],
      metadata: { rejected_reason: reason },
    })
  }

  const templateId = readStringParam(slots, 'template_id')
  if (templateId) {
    inputContract = validateDataFactQueryInputContract({ input, slotsValid: true, templateId })
    const used_skills = ['sql-template', 'supabase-read', 'sql-explain']
    const templateSlots = ensureObjectParam((slots as any).template_slots || {}, 'template_slots')
    const auditEvents = [
      {
        event_type: 'sql_template_requested',
        data: {
          template_id: templateId,
          execution_id: input.execution_id,
          capability_id: 'data_fact_query',
        },
      },
    ]

    try {
      const rendered = renderSqlTemplate(templateId, templateSlots)
      auditEvents.push({
        event_type: 'sql_template_rendered',
        data: {
          template_id: templateId,
          execution_id: input.execution_id,
          sql_hash: rendered.hash,
          params_count: rendered.params.length,
        },
      })


      auditEvents.push({
        event_type: 'sql_template_explain_requested',
        data: {
          template_id: templateId,
          execution_id: input.execution_id,
        },
      })

      const { data: explainData, error: explainError } = await client.rpc('sql_template_explain_op', {
        sql: rendered.sql,
        params: rendered.params.map((p) => String(p)),
      })

      if (explainError) {
        auditEvents.push({
          event_type: 'sql_template_explain_rejected',
          data: {
            template_id: templateId,
            execution_id: input.execution_id,
            reason: explainError.message || 'explain_failed',
          },
        })
        return finalizeOutput({
          capability_id: 'data_fact_query',
          capability_version: '1.0',
          status: 'failed',
          result: null,
          error: explainError.message || 'sql_template_explain_failed',
          evidence: { sources: [], doc_quotes: null, fallback_reason: 'sql_template_explain_failed' },
          audit: { capability_id: 'data_fact_query', capability_version: '1.0', status: 'failed', used_skills },
          used_skills,
          metadata: {
            rejected_reason: 'sql_template_explain_failed',
            template_id: templateId,
            audit_events: auditEvents,
          },
        })
      }

      const explainCost = extractExplainTotalCost(explainData)
      if (explainCost !== null && explainCost > EXPLAIN_MAX_TOTAL_COST) {
        auditEvents.push({
          event_type: 'sql_template_explain_rejected',
          data: {
            template_id: templateId,
            execution_id: input.execution_id,
            reason: 'explain_cost_exceeded',
            total_cost: explainCost,
            max_cost: EXPLAIN_MAX_TOTAL_COST,
          },
        })
        return finalizeOutput({
          capability_id: 'data_fact_query',
          capability_version: '1.0',
          status: 'failed',
          result: null,
          error: 'explain_cost_exceeded',
          evidence: { sources: [], doc_quotes: null, fallback_reason: 'explain_cost_exceeded' },
          audit: { capability_id: 'data_fact_query', capability_version: '1.0', status: 'failed', used_skills },
          used_skills,
          metadata: {
            rejected_reason: 'explain_cost_exceeded',
            template_id: templateId,
            audit_events: auditEvents,
          },
        })
      }

      const { data, error } = await client.rpc('sql_template_query', {
        sql: rendered.sql,
        params: rendered.params.map((p) => String(p)),
      })

      if (error) {
        return finalizeOutput({
          capability_id: 'data_fact_query',
          capability_version: '1.0',
          status: 'failed',
          result: null,
          error: error.message || 'sql_template_query_failed',
          evidence: { sources: [], doc_quotes: null, fallback_reason: 'sql_template_query_failed' },
          audit: { capability_id: 'data_fact_query', capability_version: '1.0', status: 'failed', used_skills },
          used_skills,
          metadata: {
            rejected_reason: 'sql_template_query_failed',
            template_id: templateId,
            template_path: rendered.path,
            template_hash: rendered.hash,
            audit_events: auditEvents,
          },
        })
      }

      auditEvents.push({
        event_type: 'sql_template_executed',
        data: {
          template_id: templateId,
          execution_id: input.execution_id,
          row_count: Array.isArray(data) ? data.length : null,
        },
      })

      return finalizeOutput({
        capability_id: 'data_fact_query',
        capability_version: '1.0',
        status: 'success',
        result: {
          template_id: templateId,
          sql: rendered.sql,
          params: rendered.params.map((p) => String(p)),
          rows: data ?? [],
        },
        error: undefined,
        evidence: {
          sources: [
            {
              source: 'supabase',
              template_id: templateId,
              tables: rendered.meta.allowed_tables,
            },
          ],
          doc_quotes: null,
          fallback_reason: undefined,
        },
        audit: { capability_id: 'data_fact_query', capability_version: '1.0', status: 'success', used_skills },
        used_skills,
        metadata: {
          template_id: templateId,
          template_path: rendered.path,
          template_hash: rendered.hash,
          audit_events: auditEvents,
        },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'sql_template_failed'
      return finalizeOutput({
        capability_id: 'data_fact_query',
        capability_version: '1.0',
        status: 'failed',
        result: null,
        error: message,
        evidence: { sources: [], doc_quotes: null, fallback_reason: 'sql_template_failed' },
        audit: { capability_id: 'data_fact_query', capability_version: '1.0', status: 'failed', used_skills },
        used_skills,
        metadata: {
          rejected_reason: message,
          template_id: templateId,
          audit_events: auditEvents,
        },
      })
    }
  }

  const metric = readStringParam(slots, 'metric', { required: true, label: 'metric' })
  inputContract = validateDataFactQueryInputContract({ input, slotsValid: true, metric })
  const statusFilter = readStringParam(slots, 'status')
  const windowSize = parseWindowSize(readStringParam(slots, 'window_size'))

  let queryResult: QueryResult

  try {
    switch (metric) {
      case 'execution_count': {
        let query = client
          .from('task_executions_op')
          .select('execution_id', { count: 'exact', head: true })
        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }
        const { count, error } = await query
        if (error) {
          queryResult = buildFailure('execution_count_query_failed')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, status: statusFilter || null, count: count || 0 },
          evidenceSources: [buildEvidence(metric, statusFilter ? { status: statusFilter } : {})],
        }
        break
      }
      case 'pending_confirmation_count': {
        const { count, error } = await client
          .from('task_executions_op')
          .select('execution_id', { count: 'exact', head: true })
          .eq('status', 'pending_confirmation')
        if (error) {
          queryResult = buildFailure('pending_confirmation_query_failed')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, count: count || 0 },
          evidenceSources: [buildEvidence(metric, { status: 'pending_confirmation' })],
        }
        break
      }
      case 'latest_execution': {
        const { data, error } = await client
          .from('task_executions_op')
          .select('execution_id, status, intent_name, requester_id, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (error) {
          queryResult = buildFailure('latest_execution_query_failed')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, execution: (data || [])[0] || null },
          evidenceSources: [buildEvidence(metric, {})],
        }
        break
      }
      case 'latest_execution_by_status': {
        if (!statusFilter) {
          queryResult = buildFailure('missing_status')
          break
        }
        const { data, error } = await client
          .from('task_executions_op')
          .select('execution_id, status, intent_name, requester_id, created_at, updated_at')
          .eq('status', statusFilter)
          .order('created_at', { ascending: false })
          .limit(1)
        if (error) {
          queryResult = buildFailure('latest_execution_by_status_query_failed')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, status: statusFilter, execution: (data || [])[0] || null },
          evidenceSources: [buildEvidence(metric, { status: statusFilter })],
        }
        break
      }

      case 'external_ops_price': {
        const assetId = readStringParam(slots, 'asset_id', { required: true, label: 'asset_id' })
        const vsCurrency = readStringParam(slots, 'vs_currency') || 'usd'
        const endpoint = readStringParam(slots, 'endpoint') || 'https://api.coingecko.com/api/v3/simple/price'
        if (!isAllowedExternalHost(endpoint)) {
          queryResult = buildFailure('external_host_not_allowed')
          break
        }
        const url = new URL(endpoint)
        url.searchParams.set('ids', assetId)
        url.searchParams.set('vs_currencies', vsCurrency)
        const response = await fetchExternalJson(url.toString())
        if (!response.ok) {
          queryResult = buildFailure(response.error || 'external_api_error')
          break
        }
        const payload = (response.json || {}) as Record<string, Record<string, number>>
        const price = payload[assetId]?.[vsCurrency]
        if (typeof price !== 'number') {
          queryResult = buildFailure('external_payload_invalid')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, asset_id: assetId, vs_currency: vsCurrency, price },
          evidenceSources: [
            {
              source: 'external_api',
              provider: 'coingecko',
              endpoint: url.toString(),
              retrieved_at: new Date().toISOString(),
            },
          ],
        }
        break
      }
      case 'ops_health_summary': {
        const { data, error } = await client
          .from('task_executions_op')
          .select('execution_id, status, intent_name, requester_id, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(windowSize)
        if (error) {
          queryResult = buildFailure('ops_health_query_failed')
          break
        }
        const rows = (data || []) as ExecutionRow[]
        const byStatus: Record<string, number> = {}
        const byIntent: Record<string, number> = {}
        let durationTotal = 0
        let durationCount = 0
        for (const row of rows) {
          byStatus[row.status] = (byStatus[row.status] || 0) + 1
          if (row.intent_name) {
            byIntent[row.intent_name] = (byIntent[row.intent_name] || 0) + 1
          }
          if (row.created_at && row.updated_at) {
            const start = new Date(row.created_at).getTime()
            const end = new Date(row.updated_at).getTime()
            if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
              durationTotal += end - start
              durationCount += 1
            }
          }
        }
        const completed = byStatus['completed'] || 0
        const failed = byStatus['failed'] || 0
        const successRate = completed + failed > 0 ? Number((completed / (completed + failed)).toFixed(4)) : null
        const avgDurationMs = durationCount > 0 ? Math.round(durationTotal / durationCount) : null
        queryResult = {
          status: 'success',
          result: {
            metric,
            window_size: windowSize,
            totals: { count: rows.length, completed, failed },
            by_status: byStatus,
            top_intents: Object.entries(byIntent)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([intent, count]) => ({ intent, count })),
            success_rate: successRate,
            avg_duration_ms: avgDurationMs,
          },
          evidenceSources: [buildEvidence(metric, { window_size: windowSize })],
        }
        break
      }
      case 'recent_failures': {
        const { data, error } = await client
          .from('task_executions_op')
          .select('execution_id, status, intent_name, requester_id, created_at, updated_at')
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(Math.min(windowSize, 50))
        if (error) {
          queryResult = buildFailure('recent_failures_query_failed')
          break
        }
        queryResult = {
          status: 'success',
          result: { metric, failures: data || [] },
          evidenceSources: [buildEvidence(metric, { status: 'failed', window_size: Math.min(windowSize, 50) })],
        }
        break
      }
      default: {
        queryResult = buildFailure('unsupported_metric')
      }
    }
  } catch {
    queryResult = buildFailure('query_exception')
  }

  const used_skills = ['supabase-read']

  return finalizeOutput({
    capability_id: 'data_fact_query',
    capability_version: '1.0',
    status: queryResult.status,
    result: queryResult.result,
    error: queryResult.error,
    evidence: {
      sources: queryResult.evidenceSources ?? [],
      doc_quotes: null,
      fallback_reason: queryResult.fallbackReason,
    },
    audit: {
      capability_id: 'data_fact_query',
      capability_version: '1.0',
      status: queryResult.status,
      used_skills,
    },
    used_skills,
    metadata: queryResult.fallbackReason ? { fallback_reason: queryResult.fallbackReason } : {},
  })
}
