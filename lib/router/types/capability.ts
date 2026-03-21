export type Intent = {
  type: string
  extracted_slots: Record<string, unknown>
  matched_capability_ids?: string[]
}

export type CapabilityInputEnvelope = {
  capability_id: string
  execution_id: string
  intent: Intent
  slots: Record<string, unknown>
  memory_refs?: unknown[]
  memory_refs_ref?: string[]
  context?: Record<string, unknown>
}

export type CapabilityOutput = {
  capability_id: string
  capability_version: string
  status: 'success' | 'failed'
  result: unknown
  error?: string
  evidence: {
    sources: unknown[]
    doc_quotes: unknown
    fallback_reason?: string
  }
  audit: {
    capability_id: string
    capability_version: string
    status: string
    used_skills: string[]
  }
  used_skills: string[]
  metadata?: Record<string, unknown>
  recommendations?: unknown[]
}
