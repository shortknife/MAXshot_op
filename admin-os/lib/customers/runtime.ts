import fs from 'fs'
import path from 'path'

export type CustomerRegistryItem = {
  customer_id: string
  name: string
  status: 'active' | 'inactive'
  solution_key: string
  enabled_planes: string[]
  allowed_capabilities: string[]
  mutation_capabilities: string[]
  default_kb_scope: string | null
  notes: string | null
}

export type CustomerRegistry = {
  registry_id: string
  version: string
  customers: CustomerRegistryItem[]
}

const CUSTOMER_REGISTRY_PATH = path.join(process.cwd(), 'app/configs/customers/customer_registry_v1.json')

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

export function loadCustomerRegistry(): CustomerRegistry {
  const raw = JSON.parse(fs.readFileSync(CUSTOMER_REGISTRY_PATH, 'utf8')) as CustomerRegistry & {
    customers?: Array<Partial<CustomerRegistryItem>>
  }
  return {
    registry_id: raw.registry_id,
    version: raw.version,
    customers: Array.isArray(raw.customers)
      ? raw.customers.map((customer) => ({
          customer_id: String(customer.customer_id || '').trim(),
          name: String(customer.name || '').trim(),
          status: customer.status === 'inactive' ? 'inactive' : 'active',
          solution_key: String(customer.solution_key || '').trim(),
          enabled_planes: normalizeStringArray(customer.enabled_planes),
          allowed_capabilities: normalizeStringArray(customer.allowed_capabilities),
          mutation_capabilities: normalizeStringArray(customer.mutation_capabilities),
          default_kb_scope: typeof customer.default_kb_scope === 'string' && customer.default_kb_scope.trim() ? customer.default_kb_scope.trim() : null,
          notes: typeof customer.notes === 'string' && customer.notes.trim() ? customer.notes.trim() : null,
        }))
      : [],
  }
}

export function listActiveCustomers(): CustomerRegistryItem[] {
  return loadCustomerRegistry().customers.filter((customer) => customer.status === 'active')
}

export function resolveCustomer(customerId: string | null | undefined): CustomerRegistryItem | null {
  if (!customerId) return null
  return loadCustomerRegistry().customers.find((customer) => customer.customer_id === customerId) || null
}

export function isCapabilityAllowedForCustomer(customerId: string | null | undefined, capabilityId: string): boolean {
  const customer = resolveCustomer(customerId)
  if (!customer) return true
  return customer.allowed_capabilities.includes(capabilityId)
}

export function isMutationAllowedForCustomer(customerId: string | null | undefined, capabilityId: string): boolean {
  const customer = resolveCustomer(customerId)
  if (!customer) return true
  return customer.mutation_capabilities.includes(capabilityId)
}

export function getCustomerCapabilityPolicy(customerId: string | null | undefined) {
  const customer = resolveCustomer(customerId)
  if (!customer) return null
  return {
    customer_id: customer.customer_id,
    allowed_capabilities: customer.allowed_capabilities,
    mutation_capabilities: customer.mutation_capabilities,
    enabled_planes: customer.enabled_planes,
  }
}
