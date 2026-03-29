export type StringParamOptions = {
  required?: boolean
  trim?: boolean
  label?: string
  allowEmpty?: boolean
}

export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options: StringParamOptions = {}
): string | undefined {
  const { required = false, trim = true, label = key, allowEmpty = false } = options
  const raw = params[key]
  if (typeof raw !== 'string') {
    if (required) {
      throw new Error(`${label} required`)
    }
    return undefined
  }
  const value = trim ? raw.trim() : raw
  if (!value && !allowEmpty) {
    if (required) {
      throw new Error(`${label} required`)
    }
    return undefined
  }
  return value
}

export function readBooleanParam(
  params: Record<string, unknown>,
  key: string
): boolean | undefined {
  const raw = params[key]
  if (typeof raw === 'boolean') return raw
  return undefined
}

export function ensureObjectParam(value: unknown, label = 'params'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}
