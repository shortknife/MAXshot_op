import { describe, expect, it } from 'vitest'

import { assertCustomerCapabilityMutationAccess, getCustomerCapabilityPolicy, isCapabilityAllowedForCustomer, isMutationAllowedForCustomer, resolveCustomer } from '@/lib/customers/runtime'
import { assertOperatorCustomerAccess, canOperatorAccessCustomer, resolveOperator } from '@/lib/customers/access'

describe('customer runtime policy', () => {
  it('resolves configured customers', () => {
    expect(resolveCustomer('maxshot')?.solution_key).toBe('maxshot-sample')
    expect(resolveCustomer('missing')).toBeNull()
  })

  it('enforces allowed capabilities for configured customers', () => {
    expect(isCapabilityAllowedForCustomer('maxshot', 'capability.faq_answering')).toBe(true)
    expect(isCapabilityAllowedForCustomer('nexa-demo', 'capability.data_fact_query')).toBe(false)
    expect(isCapabilityAllowedForCustomer(null, 'capability.data_fact_query')).toBe(true)
  })

  it('enforces mutation capability policy', () => {
    expect(isMutationAllowedForCustomer('maxshot', 'capability.kb_upload_qc')).toBe(true)
    expect(isMutationAllowedForCustomer('nexa-demo', 'capability.kb_upload_qc')).toBe(false)
    expect(() => assertCustomerCapabilityMutationAccess({ customerId: 'nexa-demo', capabilityId: 'capability.kb_upload_qc' })).toThrow('customer_capability_not_allowed')
  })

  it('enforces operator access scope', () => {
    expect(resolveOperator('platform-admin')?.role).toBe('platform_admin')
    expect(canOperatorAccessCustomer('platform-admin', 'maxshot')).toBe(true)
    expect(canOperatorAccessCustomer('maxshot-ops', 'maxshot')).toBe(true)
    expect(canOperatorAccessCustomer('maxshot-ops', 'nexa-demo')).toBe(false)
    expect(() => assertOperatorCustomerAccess({ operatorId: 'maxshot-ops', customerId: 'nexa-demo' })).toThrow('operator_customer_scope_not_allowed')
  })

  it('returns normalized capability policy', () => {
    expect(getCustomerCapabilityPolicy('maxshot')).toEqual(expect.objectContaining({
      customer_id: 'maxshot',
      enabled_planes: expect.arrayContaining(['ops_data', 'faq_kb']),
      allowed_capabilities: expect.arrayContaining(['capability.faq_answering']),
      mutation_capabilities: expect.arrayContaining(['capability.kb_upload_qc']),
    }))
  })
})
