import { getCapabilityExecutionPolicy } from '@/lib/router/capability-catalog'
import { assertCustomerCapabilityMutationAccess } from '@/lib/customers/runtime'

export function assertCapabilityMutationPolicy(params: {
  capabilityId: string
  customerId?: string | null
}) {
  const policy = getCapabilityExecutionPolicy(params.capabilityId)
  if (!policy) throw new Error('capability_policy_not_found')
  if (policy.execution_mode !== 'mutation' && policy.execution_mode !== 'review') {
    throw new Error('capability_not_mutation_enabled')
  }
  assertCustomerCapabilityMutationAccess({
    customerId: params.customerId,
    capabilityId: policy.capability_id,
  })
  return policy
}
