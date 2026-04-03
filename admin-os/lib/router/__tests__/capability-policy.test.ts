import { describe, expect, it } from 'vitest'

import { getCapabilityExecutionPolicy } from '@/lib/router/capability-catalog'

describe('capability execution policy', () => {
  it('exposes serialized mutation metadata for kb upload qc', () => {
    expect(getCapabilityExecutionPolicy('capability.kb_upload_qc')).toEqual(expect.objectContaining({
      capability_id: 'capability.kb_upload_qc',
      execution_mode: 'mutation',
      mutation_scope: 'kb_source_inventory',
      concurrency_safe: false,
      requires_confirmation: true,
      requires_verification: true,
    }))
  })

  it('exposes faq review queue policy', () => {
    expect(getCapabilityExecutionPolicy('capability.faq_qa_review')).toEqual(expect.objectContaining({
      capability_id: 'capability.faq_qa_review',
      execution_mode: 'mutation',
      mutation_scope: 'faq_review_queue',
      concurrency_safe: false,
    }))
  })
})
