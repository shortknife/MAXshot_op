export interface CapabilityInputEnvelope {
  capability_id: string
  execution_id: string
  intent: Intent
  slots: Record<string, unknown>
  memory_refs: MemoryRef[]
  context: Record<string, unknown>
}

export interface CapabilityOutput {
  capability_id: string
  capability_version: string
  status: 'success' | 'failed'
  result: unknown
  error?: string
  evidence: {
    sources: unknown[]
    doc_quotes: unknown | null
    fallback_reason?: string
  }
  audit: {
    capability_id: string
    capability_version: string
    status: 'success' | 'failed'
    used_skills: string[]
  }
  used_skills: string[]
  recommendations?: Recommendation[]
  metadata: Record<string, unknown>
}

export interface Recommendation {
  type: 'evolution' | 'optimization' | 'error_recovery'
  priority: number
  description: string
  target: string
}

export interface Intent {
  type: string
  extracted_slots: Record<string, unknown>
  confidence: number
}

export interface MemoryRef {
  id: string
  type: 'foundation' | 'experience' | 'insight'
  content: string
  context: Record<string, unknown>
  weight: number
  confidence?: number
}
