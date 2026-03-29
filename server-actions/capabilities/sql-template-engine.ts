/**
 * SQL Template Engine (Tier 1) - Database-backed template system
 *
 * This module provides database-backed SQL template management with:
 * - Template parameterization and substitution
 * - Template matching based on intent
 * - Success tracking and usage metrics
 * - Safety checks (read-only, allowed tables)
 */

import { supabase } from '../../admin-os/lib/supabase'
import { assertReadOnlySql } from '../../admin-os/lib/sql-templates/guard'

// ============================================================================
// Type Definitions
// ============================================================================

export type SqlQueryCategory = 'data_validation' | 'analytics'

export interface SqlTemplateParameter {
  type: 'text' | 'numeric' | 'boolean' | 'json'
  description?: string
  required?: boolean
}

export interface SqlTemplate {
  id: string
  name: string
  description: string | null
  category: SqlQueryCategory
  template_sql: string
  schema_signature: Record<string, unknown>
  parameters: Record<string, SqlTemplateParameter>
  success_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface SqlTemplateMatch {
  template: SqlTemplate
  confidence: number
  matched_parameters: Record<string, unknown>
  reason: string
}

export interface RenderedTemplate {
  sql: string
  params: unknown[]
  template_id: string
  confidence: number
}

export interface TemplateMatchCriteria {
  queryType: SqlQueryCategory
  entities: {
    tables?: string[]
    columns?: string[]
    metrics?: string[]
  }
  constraints?: {
    maxRows?: number
    aggregation?: string
  }
}

// ============================================================================
// Template Rendering
// ============================================================================

const MAX_TEMPLATE_PARAMS = 20

/**
 * Render a SQL template by substituting parameters
 */
export function renderTemplate(
  template: SqlTemplate,
  parameters: Record<string, unknown>
): RenderedTemplate {
  if (!template.template_sql || template.template_sql.trim() === '') {
    throw new Error('empty_template_sql')
  }

  const renderedParams: unknown[] = []
  const paramIndex = new Map<string, number>()

  // Validate parameters against schema
  for (const [key, value] of Object.entries(parameters)) {
    const paramDef = template.parameters[key]
    if (!paramDef) {
      throw new Error(`unknown_parameter:${key}`)
    }

    if (value === undefined || value === null || value === '') {
      if (paramDef.required) {
        throw new Error(`missing_required_parameter:${key}`)
      }
      continue
    }

    // Type coercion
    let coerced: unknown
    switch (paramDef.type) {
      case 'numeric': {
        const num = typeof value === 'number' ? value : Number(value)
        if (!Number.isFinite(num)) {
          throw new Error(`invalid_numeric_parameter:${key}`)
        }
        coerced = num
        break
      }
      case 'boolean': {
        if (typeof value === 'boolean') {
          coerced = value
        } else if (value === 'true' || value === 'false') {
          coerced = value === 'true'
        } else {
          throw new Error(`invalid_boolean_parameter:${key}`)
        }
        break
      }
      case 'json': {
        if (typeof value === 'string') {
          try {
            coerced = JSON.parse(value)
          } catch {
            throw new Error(`invalid_json_parameter:${key}`)
          }
        } else {
          coerced = value
        }
        if (typeof coerced !== 'object' || coerced === null) {
          throw new Error(`invalid_json_parameter:${key}`)
        }
        break
      }
      default:
        coerced = String(value)
    }

    renderedParams.push(coerced)
    paramIndex.set(key, renderedParams.length)
  }

  // Check for required but missing parameters
  for (const [key, paramDef] of Object.entries(template.parameters)) {
    if (paramDef.required && !parameters.hasOwnProperty(key)) {
      throw new Error(`missing_required_parameter:${key}`)
    }
  }

  // Parameter limit check
  if (renderedParams.length > MAX_TEMPLATE_PARAMS) {
    throw new Error(`too_many_parameters:${renderedParams.length}`)
  }

  // Substitute parameters in SQL
  const renderedSql = template.template_sql.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, paramName) => {
    const index = paramIndex.get(paramName)
    if (index === undefined) {
      // Parameter exists but wasn't provided (should have been caught above)
      if (template.parameters[paramName]?.required) {
        throw new Error(`missing_required_parameter:${paramName}`)
      }
      // Optional parameter - use NULL
      const nullIndex = renderedParams.length
      renderedParams.push(null)
      paramIndex.set(paramName, nullIndex)
      return `$${nullIndex}`
    }
    return `$${index}`
  })

  // Check for unresolved placeholders
  if (renderedSql.includes('{{')) {
    throw new Error('unresolved_template_placeholders')
  }

  // Safety checks
  assertReadOnlySql(renderedSql)

  return {
    sql: renderedSql,
    params: renderedParams,
    template_id: template.id,
    confidence: calculateTemplateConfidence(template),
  }
}

/**
 * Calculate confidence score for a template based on success metrics
 */
function calculateTemplateConfidence(template: SqlTemplate): number {
  const baseConfidence = 0.9 // Base confidence for template match
  const successBonus = Math.min(template.success_count / 50, 0.09) // Up to 0.09 bonus
  const recentUsageBonus = template.last_used_at
    ? Math.min((Date.now() - new Date(template.last_used_at).getTime()) / (30 * 24 * 60 * 60 * 1000) * 0.01, 0.01)
    : 0

  return Math.min(baseConfidence + successBonus + recentUsageBonus, 1.0)
}

// ============================================================================
// Template Matching
// ============================================================================

/**
 * Find the best matching template for given criteria
 */
export async function findMatchingTemplate(
  criteria: TemplateMatchCriteria
): Promise<SqlTemplateMatch | null> {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .select('*')
    .eq('category', criteria.queryType)

  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return null
  }

  const templates = data as SqlTemplate[]

  // Score templates based on match quality
  const scored = templates.map((template) => ({
    template,
    score: scoreTemplateMatch(template, criteria),
  }))

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (best.score < 0.6) {
    // Confidence threshold for template match
    return null
  }

  return {
    template: best.template,
    confidence: best.score,
    matched_parameters: extractParameters(best.template, criteria),
    reason: `Matched by category: ${criteria.queryType}, score: ${best.score.toFixed(2)}`,
  }
}

/**
 * Score a template against matching criteria
 */
function scoreTemplateMatch(
  template: SqlTemplate,
  criteria: TemplateMatchCriteria
): number {
  let score = 0.5 // Base score

  // Category match (high weight)
  if (template.category === criteria.queryType) {
    score += 0.3
  }

  // Entity matches (medium weight)
  if (criteria.entities.tables?.length) {
    const signatureTables = new Set(
      Object.keys(template.schema_signature).filter((k) => k.startsWith('table_'))
    )
    const matchingTables = criteria.entities.tables.filter((t) => signatureTables.has(t))
    score += (matchingTables.length / criteria.entities.tables.length) * 0.15
  }

  // Success history (low weight)
  if (template.success_count > 0) {
    score += Math.min(template.success_count / 100, 0.05)
  }

  return Math.min(score, 1.0)
}

/**
 * Extract parameters from criteria based on template parameters
 */
function extractParameters(
  template: SqlTemplate,
  criteria: TemplateMatchCriteria
): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  for (const [key, paramDef] of Object.entries(template.parameters)) {
    // Try to extract from criteria
    if (key === 'table_name' && criteria.entities.tables?.[0]) {
      params[key] = criteria.entities.tables[0]
    } else if (key === 'column_name' && criteria.entities.columns?.[0]) {
      params[key] = criteria.entities.columns[0]
    } else if (key === 'metric_column' && criteria.entities.metrics?.[0]) {
      params[key] = criteria.entities.metrics[0]
    } else if (key === 'limit' && criteria.constraints?.maxRows) {
      params[key] = criteria.constraints.maxRows
    } else if (key === 'aggregation' && criteria.constraints?.aggregation) {
      params[key] = criteria.constraints.aggregation
    }
    // Additional parameters may need to be extracted from natural language
  }

  return params
}

// ============================================================================
// Template CRUD Operations
// ============================================================================

/**
 * List all templates with optional filtering
 */
export async function listTemplates(options?: {
  category?: SqlQueryCategory
  limit?: number
}): Promise<SqlTemplate[]> {
  let query = supabase.from('sql_templates_op').select('*')

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('success_count', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list templates: ${error.message}`)
  }

  return (data || []) as SqlTemplate[]
}

/**
 * Get a template by ID
 */
export async function getTemplate(id: string): Promise<SqlTemplate | null> {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw new Error(`Failed to get template: ${error.message}`)
  }

  return data as SqlTemplate
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: Omit<SqlTemplate, 'id' | 'created_at' | 'updated_at' | 'success_count' | 'last_used_at'>
): Promise<SqlTemplate> {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .insert({
      ...template,
      success_count: 0,
      last_used_at: null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`)
  }

  return data as SqlTemplate
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<SqlTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<SqlTemplate> {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`)
  }

  return data as SqlTemplate
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('sql_templates_op')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`)
  }
}

/**
 * Increment template success count and update last_used_at
 */
export async function recordTemplateSuccess(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_success', {
    template_id: id,
  })

  if (error) {
    // Fallback if RPC doesn't exist
    await updateTemplate(id, {
      success_count: (await getTemplate(id))!.success_count + 1,
      last_used_at: new Date().toISOString(),
    })
  }
}
