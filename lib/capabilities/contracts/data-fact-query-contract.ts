import { CapabilityInputEnvelope, CapabilityOutput } from '@/lib/router/types/capability'
import type { ContractValidationResult } from '@/lib/capabilities/contracts/data-query-contract'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function validateDataFactQueryInputContract(params: {
  input: CapabilityInputEnvelope
  slotsValid: boolean
  templateId?: string | null
  metric?: string | null
}): ContractValidationResult {
  const errors: string[] = []
  const { input, slotsValid, templateId, metric } = params

  if (!String(input.execution_id || '').trim()) errors.push('missing_request_id')

  if (!slotsValid) {
    errors.push('invalid_slots')
    return { passed: errors.length === 0, errors }
  }

  const hasTemplate = Boolean(String(templateId || '').trim())
  const hasMetric = Boolean(String(metric || '').trim())
  if (!hasTemplate && !hasMetric) errors.push('missing_metric_or_template')

  return {
    passed: errors.length === 0,
    errors,
  }
}

export function validateDataFactQueryOutputContract(output: CapabilityOutput): ContractValidationResult {
  const errors: string[] = []

  if (!['success', 'failed'].includes(String(output.status || ''))) {
    errors.push('invalid_status')
  }

  if (output.status === 'success') {
    const result = output.result as Record<string, unknown> | null
    if (!isObject(result)) errors.push('missing_result')

    const src = output.evidence?.sources
    if (!Array.isArray(src) || src.length === 0) errors.push('missing_evidence_sources')
  }

  if (output.status === 'failed') {
    if (!String(output.error || '').trim()) errors.push('missing_error_code')
  }

  return {
    passed: errors.length === 0,
    errors,
  }
}
