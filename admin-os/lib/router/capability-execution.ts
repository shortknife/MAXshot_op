import { getCapabilityDefinition } from './capability-catalog'
import type { CapabilityOutput } from './types/capability'

function toCanonicalCapabilityId(inputCapabilityId: string): string {
  const definition = getCapabilityDefinition(inputCapabilityId)
  return definition?.capability_id || String(inputCapabilityId || '').trim()
}

export function buildCapabilityFailureOutput(params: {
  requested_capability_id: string
  reason: string
}): CapabilityOutput {
  const canonicalId = toCanonicalCapabilityId(params.requested_capability_id)
  return {
    capability_id: canonicalId,
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: params.reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: params.reason },
    audit: {
      capability_id: canonicalId,
      capability_version: '1.0',
      status: 'failed',
      used_skills: [],
    },
    used_skills: [],
    metadata: { rejected_reason: params.reason, fallback_reason: params.reason },
  }
}

export function normalizeCapabilityExecutionResult(
  requestedCapabilityId: string,
  output: CapabilityOutput
): CapabilityOutput {
  const canonicalId = toCanonicalCapabilityId(requestedCapabilityId)
  const status = output?.status === 'success' ? 'success' : 'failed'
  const capabilityVersion = String(output?.capability_version || '1.0').trim() || '1.0'
  const evidence = output?.evidence && typeof output.evidence === 'object'
    ? {
        sources: Array.isArray(output.evidence.sources) ? output.evidence.sources : [],
        doc_quotes: Object.prototype.hasOwnProperty.call(output.evidence, 'doc_quotes') ? output.evidence.doc_quotes : null,
        ...(output.evidence.fallback_reason ? { fallback_reason: output.evidence.fallback_reason } : {}),
      }
    : { sources: [], doc_quotes: null }
  const audit = output?.audit && typeof output.audit === 'object'
    ? {
        capability_id: canonicalId,
        capability_version: capabilityVersion,
        status,
        used_skills: Array.isArray(output.audit.used_skills) ? output.audit.used_skills : [],
      }
    : {
        capability_id: canonicalId,
        capability_version: capabilityVersion,
        status,
        used_skills: [],
      }

  return {
    capability_id: canonicalId,
    capability_version: capabilityVersion,
    status,
    result: Object.prototype.hasOwnProperty.call(output || {}, 'result') ? output.result : null,
    ...(output?.error ? { error: output.error } : {}),
    evidence,
    audit,
    used_skills: Array.isArray(output?.used_skills) ? output.used_skills : [],
    ...(output?.metadata && typeof output.metadata === 'object' ? { metadata: output.metadata } : {}),
    ...(Array.isArray(output?.recommendations) ? { recommendations: output.recommendations } : {}),
  }
}
