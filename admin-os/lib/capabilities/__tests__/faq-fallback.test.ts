import { describe, expect, it } from 'vitest'

import { faqFallback } from '@/lib/capabilities/faq-fallback'

describe('faqFallback', () => {
  it('returns a bounded fallback response for low-confidence faq results', async () => {
    const result = await faqFallback({
      capability_id: 'capability.faq_fallback',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: {} },
      slots: {
        question: 'What does the Pro plan include?',
        reason: 'faq_low_confidence',
        kb_scope: 'public',
        citations: [{ source_id: 'plans-and-billing' }],
      },
    })

    expect(result.status).toBe('success')
    expect(result.capability_id).toBe('faq_fallback')
    expect((result.result as { review_required?: boolean }).review_required).toBe(true)
    expect((result.result as { next_step?: string }).next_step).toBe('manual_review')
  })

  it('fails when required slots are missing', async () => {
    const result = await faqFallback({
      capability_id: 'capability.faq_fallback',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: {} },
      slots: {},
    })

    expect(result.status).toBe('failed')
  })
})
