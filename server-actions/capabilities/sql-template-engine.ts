import { supabase } from '@/lib/supabase'

export type SqlTemplate = {
  id: string
  name: string
  description?: string | null
  category: 'data_validation' | 'analytics'
  template_sql: string
  schema_signature?: Record<string, unknown>
  parameters?: Record<string, { type?: string; required?: boolean }>
  success_count?: number
  last_used_at?: string | null
}

export type SqlTemplateMatch = {
  template: SqlTemplate
  confidence: number
  matched_parameters: Record<string, unknown>
  reason: string
}

export function renderTemplate(template: SqlTemplate, parameters: Record<string, unknown>) {
  const sql = String(template.template_sql || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = parameters?.[String(key)]
    if (value === undefined || value === null || value === '') return 'NULL'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    return `'${String(value).replace(/'/g, "''")}'`
  })
  return {
    sql,
    params: [],
    template_id: template.id,
    confidence: 0.9,
  }
}

export async function findMatchingTemplate(_: unknown): Promise<SqlTemplateMatch | null> {
  return null
}

export async function recordTemplateSuccess(templateId: string) {
  try {
    await supabase.rpc('increment_template_success_op', { p_template_id: templateId })
  } catch {
    // ignore
  }
  return { ok: true }
}

export async function createTemplate(payload: Omit<SqlTemplate, 'id'>) {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .insert({
      name: payload.name,
      description: payload.description || null,
      category: payload.category,
      template_sql: payload.template_sql,
      schema_signature: payload.schema_signature || {},
      parameters: payload.parameters || {},
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as SqlTemplate
}

export async function getTemplate(id: string) {
  const { data, error } = await supabase.from('sql_templates_op').select('*').eq('id', id).single()
  if (error) return null
  return data as SqlTemplate
}

export async function updateTemplate(id: string, patch: Partial<SqlTemplate>) {
  const { data, error } = await supabase
    .from('sql_templates_op')
    .update({
      name: patch.name,
      description: patch.description,
      category: patch.category,
      template_sql: patch.template_sql,
      schema_signature: patch.schema_signature,
      parameters: patch.parameters,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as SqlTemplate
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('sql_templates_op').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { ok: true }
}
