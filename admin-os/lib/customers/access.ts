import fs from 'fs'
import path from 'path'

const OPERATOR_REGISTRY_PATH = path.join(process.cwd(), 'app/configs/customers/operator_registry_v1.json')

type OperatorRegistryItem = {
  operator_id: string
  role: string
  allowed_customers: string[]
  notes: string | null
}

type OperatorRegistry = {
  registry_id: string
  version: string
  operators: OperatorRegistryItem[]
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

export function loadOperatorRegistry(): OperatorRegistry {
  const raw = JSON.parse(fs.readFileSync(OPERATOR_REGISTRY_PATH, 'utf8')) as OperatorRegistry & {
    operators?: Array<Partial<OperatorRegistryItem>>
  }
  return {
    registry_id: raw.registry_id,
    version: raw.version,
    operators: Array.isArray(raw.operators)
      ? raw.operators.map((operator) => ({
          operator_id: String(operator.operator_id || '').trim(),
          role: String(operator.role || '').trim(),
          allowed_customers: normalizeStringArray(operator.allowed_customers),
          notes: typeof operator.notes === 'string' && operator.notes.trim() ? operator.notes.trim() : null,
        }))
      : [],
  }
}

export function resolveOperator(operatorId: string | null | undefined): OperatorRegistryItem | null {
  if (!operatorId) return null
  return loadOperatorRegistry().operators.find((operator) => operator.operator_id === operatorId) || null
}

export function canOperatorAccessCustomer(operatorId: string | null | undefined, customerId: string | null | undefined): boolean {
  if (!customerId) return true
  const operator = resolveOperator(operatorId)
  if (!operator) return false
  return operator.allowed_customers.includes('*') || operator.allowed_customers.includes(customerId)
}

export function assertOperatorCustomerAccess(params: { operatorId?: string | null; customerId?: string | null }) {
  if (!params.customerId) return
  if (!canOperatorAccessCustomer(params.operatorId, params.customerId)) {
    throw new Error('operator_customer_scope_not_allowed')
  }
}
