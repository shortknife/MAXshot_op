export type AuditLog = { events?: { event_type?: string; data?: Record<string, unknown> }[] }
export type ExecutionResult = { capability_outputs?: { capability_id?: string; status?: string; evidence?: { sources?: unknown[]; fallback_reason?: string }; metadata?: { fallback_reason?: string } }[] }

export type AttributionResult = {
  capability_impact: Record<string, { status: 'contributed' | 'blocked' | 'failed' }>
  evidence_coverage: 'complete' | 'partial' | 'missing'
  fallback_flags: string[]
  confidence: 'high' | 'medium' | 'low'
}

export function buildAttribution(input: { result: ExecutionResult | null; audit_log: AuditLog | null }): AttributionResult {
  const outputs = input.result?.capability_outputs || []
  const events = input.audit_log?.events || []
  const capability_impact: Record<string, { status: 'contributed' | 'blocked' | 'failed' }> = {}
  const fallback_flags: string[] = []

  for (const out of outputs as any[]) {
    const capId = out?.capability_id || 'unknown'
    const status = out?.status === 'success' || out?.status === 'completed' ? 'contributed' : 'failed'
    capability_impact[capId] = { status }
    const fallback = out?.evidence?.fallback_reason || out?.metadata?.fallback_reason
    if (fallback) fallback_flags.push(String(fallback))
  }

  for (const ev of events as any[]) {
    if (ev.event_type === 'capability_executed') {
      const capId = ev.data?.capability_id as string | undefined
      if (capId && !capability_impact[capId]) {
        capability_impact[capId] = { status: 'contributed' }
      }
    }
  }

  const evidenceSourcesCount = outputs.reduce((sum: number, out: any) => sum + (out?.evidence?.sources?.length || 0), 0)
  let evidence_coverage: AttributionResult['evidence_coverage'] = 'missing'
  if (evidenceSourcesCount > 0) evidence_coverage = 'partial'
  if (evidenceSourcesCount >= outputs.length && outputs.length > 0) evidence_coverage = 'complete'

  let confidence: AttributionResult['confidence'] = 'low'
  if (evidence_coverage === 'complete' && fallback_flags.length === 0) confidence = 'high'
  else if (evidence_coverage !== 'missing') confidence = 'medium'

  return { capability_impact, evidence_coverage, fallback_flags, confidence }
}
