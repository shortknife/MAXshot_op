import type { SqlGenerationResult } from '@/server-actions/capabilities/sql-generation-engine'
import { createTemplate } from '@/server-actions/capabilities/sql-template-engine'

export type DepositionCriteria = {
  minSuccessCount: number
  minConfidence: number
  minFrequency: number
  days: number
  schemaStability: number
}

export async function getDepositionCandidates(_: DepositionCriteria) {
  return []
}

export async function evaluateDepositionCandidate(query: any) {
  return {
    queryHistory: query,
    depositionCriteria: null,
    meetsCriteria: false,
    matchedQueries: [],
    extractedTemplate: null,
  }
}

export async function depositTemplate(candidate: any): Promise<{ success: boolean; template?: unknown; error?: string }> {
  if (!candidate?.extractedTemplate) {
    return { success: false, error: 'no_extracted_template' }
  }
  try {
    const template = await createTemplate({
      name: candidate.extractedTemplate.name || 'deposited_template',
      description: candidate.extractedTemplate.description || null,
      category: candidate.extractedTemplate.category || 'analytics',
      template_sql: candidate.extractedTemplate.template_sql || '',
      schema_signature: candidate.extractedTemplate.schema_signature || {},
      parameters: candidate.extractedTemplate.parameters || {},
      success_count: 0,
      last_used_at: null,
    } as any)
    return { success: true, template }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export type _KeepType = SqlGenerationResult
