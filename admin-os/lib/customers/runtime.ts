import fs from 'fs'
import path from 'path'

export type CustomerRegistryItem = {
  customer_id: string
  name: string
  status: 'active' | 'inactive'
  solution_key: string
  enabled_planes: string[]
  default_kb_scope: string | null
  notes: string | null
}

export type CustomerRegistry = {
  registry_id: string
  version: string
  customers: CustomerRegistryItem[]
}

const CUSTOMER_REGISTRY_PATH = path.join(process.cwd(), 'app/configs/customers/customer_registry_v1.json')

export function loadCustomerRegistry(): CustomerRegistry {
  const raw = JSON.parse(fs.readFileSync(CUSTOMER_REGISTRY_PATH, 'utf8')) as CustomerRegistry
  return {
    registry_id: raw.registry_id,
    version: raw.version,
    customers: Array.isArray(raw.customers) ? raw.customers : [],
  }
}

export function listActiveCustomers(): CustomerRegistryItem[] {
  return loadCustomerRegistry().customers.filter((customer) => customer.status === 'active')
}

export function resolveCustomer(customerId: string | null | undefined): CustomerRegistryItem | null {
  if (!customerId) return null
  return loadCustomerRegistry().customers.find((customer) => customer.customer_id === customerId) || null
}
