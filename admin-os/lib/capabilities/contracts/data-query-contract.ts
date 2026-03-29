import { CapabilityInputEnvelope, CapabilityOutput } from '@/lib/router/types/capability'

export type ContractValidationResult = {
  passed: boolean
  errors: string[]
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function validateDataQueryInputContract(params: {
  input: CapabilityInputEnvelope
  scope: string
  rawQuery: string
}): ContractValidationResult {
  const errors: string[] = []
  const { input, scope, rawQuery } = params

  if (!String(input.execution_id || '').trim()) errors.push('missing_request_id')
  if (!String(rawQuery || '').trim()) errors.push('missing_raw_text')
  if (!String(scope || '').trim() || scope === 'unknown') errors.push('invalid_scope')
  if (!isObject(input.context)) errors.push('missing_context')

  return {
    passed: errors.length === 0,
    errors,
  }
}

export function validateDataQueryOutputContract(output: CapabilityOutput): ContractValidationResult {
  const errors: string[] = []

  if (!['success', 'failed'].includes(String(output.status || ''))) {
    errors.push('invalid_status')
  }

  if (output.status === 'success') {
    const result = output.result as Record<string, unknown> | null
    if (!isObject(result)) {
      errors.push('missing_result')
    } else {
      if (!Array.isArray(result.rows)) errors.push('result_rows_not_array')
      if (typeof result.summary !== 'string' || !result.summary.trim()) errors.push('missing_result_summary')
    }

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

