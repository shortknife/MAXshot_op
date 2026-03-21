import { supabase } from '@/lib/supabase'

export type SqlGenerationRequest = {
  naturalQuery: string
  queryType: 'data_validation' | 'analytics'
  schemaInfo: string
  maxRows?: number
  taskId?: string
}

export type SqlGenerationResult = {
  sql: string
  confidence: number
  explanation: string
  used_examples: Array<{ query: string; sql: string; confidence: number }>
}

export async function generateSQL(request: SqlGenerationRequest): Promise<SqlGenerationResult> {
  const fallbackSql = `SELECT NOW() AS generated_at, ${Math.max(
    1,
    Math.min(Number(request.maxRows || 50), 500)
  )}::int AS suggested_limit`
  return {
    sql: fallbackSql,
    confidence: 0.55,
    explanation: 'Fallback SQL generation result (local engine).',
    used_examples: [],
  }
}

export async function recordQuery(
  request: SqlGenerationRequest,
  result: SqlGenerationResult,
  executionResult?: {
    executionTimeMs?: number
    resultRows?: number
    success: boolean
    errorMessage?: string
  }
) {
  try {
    const payload = {
      task_id: request.taskId || null,
      natural_query: request.naturalQuery,
      generated_sql: result.sql,
      tier_used: 'llm_generated',
      execution_time_ms: executionResult?.executionTimeMs || null,
      result_rows: executionResult?.resultRows || null,
      success: executionResult?.success ?? true,
      confidence_score: result.confidence,
      sql_hash: Buffer.from(result.sql).toString('base64').slice(0, 255),
      error_message: executionResult?.errorMessage || null,
      execution_metadata: {
        query_type: request.queryType,
      },
    }
    await supabase.from('sql_query_history_op').insert(payload)
  } catch {
    // Best-effort log only.
  }
  return { ok: true }
}

export async function getQueryHistory() {
  const { data } = await supabase
    .from('sql_query_history_op')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}
