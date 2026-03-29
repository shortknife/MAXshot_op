/**
 * SQL Generation Engine (Tier 2) - LLM-powered SQL generation with RAG
 *
 * This module provides:
 * - RAG-based few-shot example retrieval from query history
 * - LLM-powered SQL generation using DeepSeek
 * - Query result explanation generation
 * - Confidence scoring and validation
 */

import { supabase } from '../../admin-os/lib/supabase'
import { callDeepSeek } from '../intent-analyzer/deepseek-client'
import { assertReadOnlySql } from '../../admin-os/lib/sql-templates/guard'
import { generateSqlWithVanna } from './vanna-provider'

// ============================================================================
// Type Definitions
// ============================================================================

export type SqlQueryTier = 'template' | 'llm_generated' | 'deposited_template'

export interface SqlQueryHistory {
  id: string
  task_id: string | null
  natural_query: string
  generated_sql: string
  tier_used: SqlQueryTier
  execution_time_ms: number | null
  result_rows: number | null
  success: boolean
  confidence_score: number | null
  embedding: number[] | null
  sql_hash: string
  error_message: string | null
  execution_metadata: Record<string, unknown>
  created_at: string
}

export interface SqlGenerationRequest {
  naturalQuery: string
  queryType: 'data_validation' | 'analytics'
  schemaInfo: string
  maxRows?: number
  taskId?: string
}

export interface SqlGenerationResult {
  sql: string
  confidence: number
  explanation: string
  used_examples: Array<{ query: string; sql: string; confidence: number }>
}

// ============================================================================
// RAG-Based Example Retrieval
// ============================================================================

const TOP_K_EXAMPLES = 3
const MIN_CONFIDENCE = 0.7

/**
 * Retrieve similar queries from history using pgvector similarity search
 */
export async function retrieveSimilarQueries(
  naturalQuery: string,
  embedding: number[],
  options?: {
    topK?: number
    minConfidence?: number
    tier?: SqlQueryTier
  }
): Promise<SqlQueryHistory[]> {
  const topK = options?.topK || TOP_K_EXAMPLES
  const minConfidence = options?.minConfidence || MIN_CONFIDENCE

  const { data, error } = await supabase.rpc('search_similar_queries', {
    query_embedding: `[${embedding.join(',')}]`,
    match_threshold: 0.7,
    match_count: topK,
    min_confidence: minConfidence,
    tier_filter: options?.tier || null,
  })

  if (error) {
    throw new Error(`Failed to retrieve similar queries: ${error.message}`)
  }

  return (data || []) as SqlQueryHistory[]
}

/**
 * Generate embedding for natural language query
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For now, use a simple approach
  // In production, integrate with OpenAI text-embedding-3-small or DeepSeek embeddings
  const apiKey = process.env.OPENAI_API_KEY || ''
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured for embeddings')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding as number[]
}

/**
 * Store query in history with embedding
 */
export async function recordQuery(
  request: SqlGenerationRequest,
  result: SqlGenerationResult,
  executionResult?: {
    executionTimeMs?: number
    resultRows?: number
    success: boolean
    errorMessage?: string
  }
): Promise<SqlQueryHistory> {
  const embedding = await generateEmbedding(request.naturalQuery)

  // Compute SQL hash
  const sqlHash = Buffer.from(result.sql).toString('base64')

  const { data, error } = await supabase
    .from('sql_query_history_op')
    .insert({
      task_id: request.taskId || null,
      natural_query: request.naturalQuery,
      generated_sql: result.sql,
      tier_used: 'llm_generated',
      execution_time_ms: executionResult?.executionTimeMs || null,
      result_rows: executionResult?.resultRows || null,
      success: executionResult?.success ?? true,
      confidence_score: result.confidence,
      embedding,
      sql_hash: sqlHash,
      error_message: executionResult?.errorMessage || null,
      execution_metadata: {
        query_type: request.queryType,
        schema_info: request.schemaInfo,
        max_rows: request.maxRows,
        used_examples: result.used_examples.length,
      },
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to record query: ${error.message}`)
  }

  return data as SqlQueryHistory
}

// ============================================================================
// LLM-Based SQL Generation
// ============================================================================

const MAX_ROWS_DEFAULT = 1000
const MAX_ROWS_LIMIT = 10000

/**
 * Generate SQL using LLM with few-shot examples
 */
export async function generateSQL(
  request: SqlGenerationRequest
): Promise<SqlGenerationResult> {
  const preferVanna =
    String(process.env.SQL_PROVIDER || '').toLowerCase() === 'vanna' ||
    Boolean(process.env.VANNA_API_URL || process.env.VANNA_ENDPOINT)

  if (preferVanna) {
    return generateSqlWithVanna(request)
  }

  const embedding = await generateEmbedding(request.naturalQuery)

  // Retrieve similar examples
  const similarQueries = await retrieveSimilarQueries(
    request.naturalQuery,
    embedding,
    { tier: 'llm_generated' }
  )

  // Build few-shot examples
  const fewShotExamples = similarQueries.map((q) => ({
    query: q.natural_query,
    sql: q.generated_sql,
    confidence: q.confidence_score || 0.8,
  }))

  // Build prompt
  const prompt = buildGenerationPrompt(request, fewShotExamples)

  // Call DeepSeek
  const deepSeekResult = await callDeepSeekForSQL(prompt)

  // Validate generated SQL
  assertReadOnlySql(deepSeekResult.sql)

  // Apply limits
  let sql = deepSeekResult.sql
  if (!sql.toLowerCase().includes('limit') && !sql.toLowerCase().includes('fetch first')) {
    const maxRows = Math.min(
      request.maxRows || MAX_ROWS_DEFAULT,
      MAX_ROWS_LIMIT
    )
    // Append LIMIT if not present
    if (sql.trim().endsWith(';')) {
      sql = sql.slice(0, -1) + ` LIMIT ${maxRows};`
    } else {
      sql = sql + ` LIMIT ${maxRows}`
    }
  }

  return {
    sql,
    confidence: deepSeekResult.confidence,
    explanation: deepSeekResult.explanation,
    used_examples: fewShotExamples.slice(0, deepSeekResult.used_example_count || 3),
  }
}

/**
 * Build prompt for SQL generation
 */
function buildGenerationPrompt(
  request: SqlGenerationRequest,
  fewShotExamples: Array<{ query: string; sql: string; confidence: number }>
): string {
  const examplesSection =
    fewShotExamples.length > 0
      ? `
**Similar Previous Queries (for reference)**:
${fewShotExamples
  .map(
    (ex, i) => `
Example ${i + 1}:
Query: "${ex.query}"
SQL:
\`\`\`sql
${ex.sql}
\`\`\`
Confidence: ${ex.confidence.toFixed(2)}
`
  )
  .join('\n')}
`
      : ''

  const maxRows = Math.min(
    request.maxRows || MAX_ROWS_DEFAULT,
    MAX_ROWS_LIMIT
  )

  return `You are a PostgreSQL expert specializing in ${request.queryType} queries.

**Database Schema**:
${request.schemaInfo}

${examplesSection}
**User Request**:
"${request.naturalQuery}"

**Constraints**:
- Use only SELECT queries (no modifications)
- Focus on ${request.queryType} queries
- Return maximum ${maxRows} rows
- If the query doesn't match known patterns, create a sensible query
- Use modern PostgreSQL features (CTEs, window functions, etc.) when appropriate

**Output Format (STRICT JSON)**:
{
  "sql": "SELECT ...",
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of why this SQL was chosen",
  "used_example_count": ${fewShotExamples.length}
}

Remember:
- Always output valid PostgreSQL syntax
- The SQL must be valid and executable
- Confidence should be higher when the request clearly matches a known pattern
- Provide clear, helpful explanations`
}

/**
 * Call DeepSeek for SQL generation
 */
async function callDeepSeekForSQL(prompt: string): Promise<{
  sql: string
  confidence: number
  explanation: string
  used_example_count?: number
}> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a PostgreSQL SQL expert. Generate SQL queries based on natural language requests. Always output valid JSON.`,
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ]

  const requestBody = {
    model: 'deepseek-chat',
    messages,
    temperature: 0.2, // Lower temperature for more deterministic SQL
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No choices returned from DeepSeek')
  }

  const content = data.choices[0].message.content

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    // Validate structure
    if (!parsed.sql || typeof parsed.sql !== 'string') {
      throw new Error('Invalid SQL generation: missing sql field')
    }

    return {
      sql: parsed.sql.trim(),
      confidence: typeof parsed.confidence === 'number' ? Math.min(parsed.confidence, 1.0) : 0.8,
      explanation: parsed.explanation || 'Generated based on query interpretation',
      used_example_count: parsed.used_example_count,
    }
  } catch (error) {
    throw new Error(`Failed to parse DeepSeek response: ${error instanceof Error ? error.message : 'unknown'}`)
  }
}

// ============================================================================
// Query History Management
// ============================================================================

/**
 * Get query history with filtering
 */
export async function getQueryHistory(options?: {
  taskId?: string
  tierUsed?: SqlQueryTier
  success?: boolean
  limit?: number
  offset?: number
}): Promise<SqlQueryHistory[]> {
  let query = supabase.from('sql_query_history_op').select('*')

  if (options?.taskId) {
    query = query.eq('task_id', options.taskId)
  }

  if (options?.tierUsed) {
    query = query.eq('tier_used', options.tierUsed)
  }

  if (options?.success !== undefined) {
    query = query.eq('success', options.success)
  }

  query = query.order('created_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch query history: ${error.message}`)
  }

  return (data || []) as SqlQueryHistory[]
}

/**
 * Get a specific query by ID
 */
export async function getQueryById(id: string): Promise<SqlQueryHistory | null> {
  const { data, error } = await supabase
    .from('sql_query_history_op')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get query: ${error.message}`)
  }

  return data as SqlQueryHistory
}

/**
 * Get deposition candidates (queries that meet deposition criteria)
 */
export async function getDepositionCandidates(options?: {
  minSuccessCount?: number
  minConfidence?: number
  days?: number
}): Promise<SqlQueryHistory[]> {
  const minSuccessCount = options?.minSuccessCount || 5
  const minConfidence = options?.minConfidence || 0.85
  const days = options?.days || 30

  // Get successful queries with high confidence
  const { data, error } = await supabase
    .from('sql_query_history_op')
    .select('*')
    .gte('confidence_score', minConfidence)
    .eq('success', true)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch deposition candidates: ${error.message}`)
  }

  const queries = (data || []) as SqlQueryHistory[]

  // Count occurrences of each SQL hash
  const hashCounts = new Map<string, number>()
  for (const q of queries) {
    const count = hashCounts.get(q.sql_hash) || 0
    hashCounts.set(q.sql_hash, count + 1)
  }

  // Filter by minimum success count (frequency)
  return queries.filter((q) => (hashCounts.get(q.sql_hash) || 0) >= minSuccessCount)
}
