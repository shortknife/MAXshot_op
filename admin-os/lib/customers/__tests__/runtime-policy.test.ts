import { describe, expect, it } from 'vitest'

import {
  buildCustomerAuthDefaultExperience,
  buildCustomerDefaultExperience,
  buildCustomerPolicyEvidence,
  decorateWithCustomerDefaultExperience,
  decorateWithCustomerPolicyEvidence,
  loadCustomerRuntimePolicy,
} from '@/lib/customers/runtime-policy'

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
    const policyEvidence = buildCustomerPolicyEvidence(policy)

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
    expect(policyEvidence).toMatchObject({
      customer_id: 'nexa-demo',
      primary_plane: 'faq_kb',
      auth_primary_method: 'wallet',
      auth_verification_posture: 'guided',
    })
  })

  it('decorates operational rows with customer default experience', async () => {
    const rows = await decorateWithCustomerDefaultExperience([
      { customer_id: 'nexa-demo', raw_query: 'How do I reset my password?' },
      { customer_id: 'maxshot', raw_query: '最新 vault APY 怎么样？' },
      { customer_id: null, raw_query: 'anonymous' },
    ])

    expect(rows[0].customer_default_experience?.customer_id).toBe('nexa-demo')
    expect(rows[0].customer_default_experience?.quick_queries.length).toBeGreaterThan(0)
    expect(rows[1].customer_default_experience?.primary_plane).toBe('ops_data')
    expect(rows[2].customer_default_experience).toBeNull()
  })

  it('decorates operational rows with customer policy evidence', async () => {
    const rows = await decorateWithCustomerPolicyEvidence([
      { customer_id: 'nexa-demo', raw_query: 'How do I reset my password?' },
      { customer_id: 'maxshot', raw_query: '最新 vault APY 怎么样？' },
      { customer_id: null, raw_query: 'anonymous' },
    ])

    expect(rows[0].customer_policy_evidence?.customer_id).toBe('nexa-demo')
    expect(rows[0].customer_policy_evidence?.auth_primary_method).toBe('wallet')
    expect(rows[1].customer_policy_evidence?.primary_plane).toBe('ops_data')
    expect(rows[2].customer_policy_evidence).toBeNull()
  })
})
