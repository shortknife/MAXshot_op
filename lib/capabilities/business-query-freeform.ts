import { readFile } from 'node:fs/promises'
import { generateSQL } from '@/server-actions/capabilities/sql-generation-engine'
import { assertReadOnlySql } from '@/lib/sql-templates/guard'
import { businessRpc } from '@/lib/capabilities/business-data-access'
import type { BusinessQueryResult as QueryResult } from '@/lib/capabilities/business-query-runtime'

type RetryFn = <T>(fn: () => Promise<T>) => Promise<T>

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

async function getBusinessSchemaDDL(): Promise<string> {
  const inline = process.env.BUSINESS_SCHEMA_DDL
  if (inline) return inline
  const path = process.env.BUSINESS_SCHEMA_DDL_PATH
  if (path) {
    const content = await readFile(path, 'utf8')
    return content
  }
  try {
    const fallback = `${process.cwd()}/docs/status/BUSINESS_SCHEMA_DDL.sql`
    const content = await readFile(fallback, 'utf8')
    return content
  } catch {
    throw new Error('business_schema_unavailable')
  }
}

export async function tryFreeformSql(params: {
  rawQuery: string
  withRetry: RetryFn
  explainMaxTotalCost: number
}): Promise<QueryResult | null> {
  const { rawQuery, withRetry, explainMaxTotalCost } = params
  try {
    const schema = await getBusinessSchemaDDL()
    const result = await generateSQL({
      naturalQuery: rawQuery,
      queryType: 'analytics',
      schemaInfo: schema,
      maxRows: 200,
    })
    assertReadOnlySql(result.sql)
    const { data: explainData, error: explainError } = await withRetry(() =>
      businessRpc('sql_template_explain_op', {
        sql: result.sql,
        params: [],
      })
    )
    if (explainError) return null
    const explainCost = extractExplainTotalCost(explainData)
    if (explainCost !== null && explainCost > explainMaxTotalCost) return null
    const { data, error } = await withRetry(() =>
      businessRpc('sql_template_query', {
        sql: result.sql,
        params: [],
      })
    )
    if (error) return null
    return {
      scope: 'unknown',
      rows: Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
      summary: '已完成自由查询。',
      source_type: 'template',
      source_id: 'freeform_sql',
    }
  } catch {
    return null
  }
}
