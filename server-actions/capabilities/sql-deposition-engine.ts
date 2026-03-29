/**
 * SQL Deposition Engine (Tier 3) - Template extraction from successful queries
 *
 * This module provides:
 * - Deposition criteria evaluation
 * - Template parameterization from successful queries
 * - Template validation and creation
 * - Deposition workflow management
 */

import { supabase } from '../../admin-os/lib/supabase'
import { assertReadOnlySql } from '../../admin-os/lib/sql-templates/guard'
import { createTemplate } from './sql-template-engine'
import type { SqlQueryHistory } from './sql-generation-engine'

// ============================================================================
// Type Definitions
// ============================================================================

export interface DepositionCriteria {
  minSuccessCount: number
  minConfidence: number
  minFrequency: number // Times used in last N days
  days: number // Time window for frequency check
  schemaStability: number // Consistency of schema signature
}

export interface ExtractedTemplate {
  name: string
  description: string
  category: 'data_validation' | 'analytics'
  template_sql: string
  schema_signature: Record<string, unknown>
  parameters: Record<string, { type: string; required: boolean }>
}

export interface DepositionCandidate {
  queryHistory: SqlQueryHistory
  depositionCriteria: DepositionCriteria
  meetsCriteria: boolean
  matchedQueries: SqlQueryHistory[]
  extractedTemplate: ExtractedTemplate | null
}

// ============================================================================
// Deposition Criteria Evaluation
// ============================================================================

const DEFAULT_DEPOSITION_CRITERIA: DepositionCriteria = {
  minSuccessCount: 5,
  minConfidence: 0.85,
  minFrequency: 3,
  days: 30,
  schemaStability: 0.9,
}

/**
 * Check if a query meets deposition criteria
 */
export async function evaluateDepositionCandidate(
  queryHistory: SqlQueryHistory,
  criteria: DepositionCriteria = DEFAULT_DEPOSITION_CRITERIA
): Promise<DepositionCandidate> {
  // Get all queries with the same SQL hash (same query pattern)
  const { data, error } = await supabase
    .from('sql_query_history_op')
    .select('*')
    .eq('sql_hash', queryHistory.sql_hash)
    .gte('created_at', new Date(Date.now() - criteria.days * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    throw new Error(`Failed to fetch matching queries: ${error.message}`)
  }

  const matchedQueries = (data || []) as SqlQueryHistory[]

  // Evaluate criteria
  const successCount = matchedQueries.filter((q) => q.success).length
  const avgConfidence =
    matchedQueries.reduce((sum, q) => sum + (q.confidence_score || 0), 0) / matchedQueries.length

  const meetsSuccessCount = successCount >= criteria.minSuccessCount
  const meetsConfidence = avgConfidence >= criteria.minConfidence
  const meetsFrequency = successCount >= criteria.minFrequency

  // Schema stability check (consistency of execution_metadata)
  const schemaStability = calculateSchemaStability(matchedQueries)
  const meetsSchemaStability = schemaStability >= criteria.schemaStability

  const meetsAllCriteria = meetsSuccessCount && meetsConfidence && meetsFrequency && meetsSchemaStability

  let extractedTemplate: ExtractedTemplate | null = null

  if (meetsAllCriteria) {
    try {
      extractedTemplate = await extractTemplate(matchedQueries, queryHistory)
    } catch (error) {
      // Template extraction failed, but still return candidate
      console.error('Template extraction failed:', error)
    }
  }

  return {
    queryHistory,
    depositionCriteria: criteria,
    meetsCriteria: meetsAllCriteria,
    matchedQueries,
    extractedTemplate,
  }
}

/**
 * Calculate schema stability score
 */
function calculateSchemaStability(queries: SqlQueryHistory[]): number {
  if (queries.length === 0) return 0

  // Compare execution_metadata across queries
  const schemas = queries.map((q) => {
    const meta = q.execution_metadata || {}
    return JSON.stringify({
      query_type: meta.query_type,
      schema_info: meta.schema_info,
    })
  })

  // Count unique schemas
  const uniqueSchemas = new Set(schemas)
  return uniqueSchemas.size / schemas.length
}

// ============================================================================
// Template Extraction
// ============================================================================

/**
 * Extract a template from a set of similar queries
 */
async function extractTemplate(
  queries: SqlQueryHistory[],
  representativeQuery: SqlQueryHistory
): Promise<ExtractedTemplate> {
  // Use LLM to extract template parameters
  const prompt = buildTemplateExtractionPrompt(queries, representativeQuery)

  const extracted = await callDeepSeekForExtraction(prompt)

  // Validate extracted template
  assertReadOnlySql(extracted.template_sql)

  return {
    name: extracted.name,
    description: extracted.description,
    category: extracted.category,
    template_sql: extracted.template_sql,
    schema_signature: extracted.schema_signature,
    parameters: extracted.parameters,
  }
}

/**
 * Build prompt for template extraction
 */
function buildTemplateExtractionPrompt(
  queries: SqlQueryHistory[],
  representative: SqlQueryHistory
): string {
  const examples = queries
    .slice(0, 5)
    .map((q, i) => `Example ${i + 1}:\nQuery: "${q.natural_query}"\nSQL: ${q.generated_sql}`)
    .join('\n\n')

  return `You are a SQL template extraction expert. Analyze the following successful SQL queries and extract a reusable template.

**Query Examples**:
${examples}

**Representative Query** (use as reference):
Query: "${representative.natural_query}"
SQL: ${representative.generated_sql}

**Task**:
1. Identify common patterns and extract a parameterized template
2. Use {{param_name}} syntax for parameters (e.g., {{table_name}}, {{column_name}}, {{limit}})
3. Determine the query type: 'data_validation' or 'analytics'
4. Generate a descriptive name for the template
5. Create a brief description
6. List all parameters with their types

**Output Format (STRICT JSON)**:
{
  "name": "template_name",
  "description": "Brief description of what this template does",
  "category": "data_validation" | "analytics",
  "template_sql": "SELECT ... WHERE {{column_name}} > {{threshold}}",
  "schema_signature": {
    "required_tables": ["table1"],
    "required_columns": ["column1", "column2"]
  },
  "parameters": {
    "table_name": { "type": "text", "required": true },
    "column_name": { "type": "text", "required": true },
    "threshold": { "type": "numeric", "required": false }
  }
}

**Guidelines**:
- The template_sql must be valid PostgreSQL syntax
- Use simple, clear parameter names
- Make optional parameters nullable in the logic
- Include all relevant constraints in schema_signature`
}

/**
 * Call DeepSeek for template extraction
 */
async function callDeepSeekForExtraction(
  prompt: string
): Promise<ExtractedTemplate> {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a SQL template extraction expert. Analyze queries and create reusable parameterized templates.',
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ]

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
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
    if (!parsed.name || typeof parsed.name !== 'string') {
      throw new Error('Invalid template extraction: missing name')
    }
    if (!parsed.template_sql || typeof parsed.template_sql !== 'string') {
      throw new Error('Invalid template extraction: missing template_sql')
    }
    if (!['data_validation', 'analytics'].includes(parsed.category)) {
      throw new Error('Invalid template extraction: invalid category')
    }

    return {
      name: parsed.name,
      description: parsed.description || '',
      category: parsed.category,
      template_sql: parsed.template_sql.trim(),
      schema_signature: parsed.schema_signature || {},
      parameters: parsed.parameters || {},
    }
  } catch (error) {
    throw new Error(`Failed to parse extraction response: ${error instanceof Error ? error.message : 'unknown'}`)
  }
}

// ============================================================================
// Deposition Workflow
// ============================================================================

/**
 * Get all deposition candidates
 */
export async function getDepositionCandidates(
  criteria: DepositionCriteria = DEFAULT_DEPOSITION_CRITERIA
): Promise<DepositionCandidate[]> {
  // Get successful high-confidence queries
  const { data, error } = await supabase
    .from('sql_query_history_op')
    .select('*')
    .eq('tier_used', 'llm_generated')
    .eq('success', true)
    .gte('confidence_score', criteria.minConfidence)
    .gte('created_at', new Date(Date.now() - criteria.days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch candidates: ${error.message}`)
  }

  const queries = (data || []) as SqlQueryHistory[]

  // Evaluate each query as a candidate
  const candidates = await Promise.all(
    queries.map((q) => evaluateDepositionCandidate(q, criteria))
  )

  // Filter to only those meeting criteria
  return candidates.filter((c) => c.meetsCriteria && c.extractedTemplate !== null)
}

/**
 * Create a template from deposition
 */
export async function depositTemplate(
  candidate: DepositionCandidate
): Promise<{ template: any; success: boolean; error?: string }> {
  if (!candidate.extractedTemplate) {
    return {
      template: null,
      success: false,
      error: 'No extracted template',
    }
  }

  try {
    // Check for duplicate template name
    const { data: existing, error: checkError } = await supabase
      .from('sql_templates_op')
      .select('id')
      .eq('name', candidate.extractedTemplate!.name)
      .single()

    if (!checkError && existing) {
      return {
        template: null,
        success: false,
        error: 'Template with this name already exists',
      }
    }

    // Create the template
    const template = await createTemplate({
      name: candidate.extractedTemplate!.name,
      description: candidate.extractedTemplate!.description,
      category: candidate.extractedTemplate!.category,
      template_sql: candidate.extractedTemplate!.template_sql,
      schema_signature: candidate.extractedTemplate!.schema_signature,
      parameters: candidate.extractedTemplate!.parameters,
    })

    // Mark all matching queries as having been deposited
    const updatePromises = candidate.matchedQueries.map((q) =>
      supabase
        .from('sql_query_history_op')
        .update({
          tier_used: 'deposited_template',
          execution_metadata: {
            ...(q.execution_metadata || {}),
            deposited_to_template_id: template.id,
            deposited_at: new Date().toISOString(),
          },
        })
        .eq('id', q.id)
    )

    await Promise.all(updatePromises)

    return {
      template,
      success: true,
    }
  } catch (error) {
    return {
      template: null,
      success: false,
      error: error instanceof Error ? error.message : 'unknown',
    }
  }
}
