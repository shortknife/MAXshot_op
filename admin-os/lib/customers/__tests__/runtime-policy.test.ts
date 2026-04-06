import { describe, expect, it } from 'vitest'

import { buildCustomerAuthDefaultExperience, buildCustomerDefaultExperience, loadCustomerRuntimePolicy } from '@/lib/customers/runtime-policy'

describe('customer runtime policy', () => {
  it('loads a unified policy from filesystem assets', async () => {
    const policy = await loadCustomerRuntimePolicy('nexa-demo')
    expect(policy).toMatchObject({
      customer_id: 'nexa-demo',
      primary_plane: 'faq_kb',
      preferred_capabilities: ['capability.faq_answering', 'capability.product_doc_qna'],
    })
    expect(policy?.auth?.primary_auth_method).toBe('wallet')
    expect(policy?.delivery?.summary_style).toBe('explainer')
    expect(policy?.review?.escalation_style).toBe('guided')
    expect(policy?.clarification?.clarification_style).toBe('guided')
  })

  it('builds reusable default experience helpers', async () => {
    const policy = await loadCustomerRuntimePolicy('nexa-demo')
    const experience = buildCustomerDefaultExperience(policy)
    const authExperience = buildCustomerAuthDefaultExperience(policy)

    expect(experience).toMatchObject({
      customer_id: 'nexa-demo',
      primary_plane: 'faq_kb',
    })
    expect(experience?.quick_queries.length).toBeGreaterThan(0)
    expect(experience?.workspace_notes.length).toBeGreaterThan(0)
    expect(authExperience).toMatchObject({
      customer_id: 'nexa-demo',
      primary_auth_method: 'wallet',
      verification_posture: 'guided',
    })
  })
})
