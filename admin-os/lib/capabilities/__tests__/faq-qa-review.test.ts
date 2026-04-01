import { describe, expect, it } from 'vitest'

import { faqQaReview } from '@/lib/capabilities/faq-qa-review'

describe('faqQaReview', () => {
  it('packages a flagged faq case for manual review', async () => {
    const result = await faqQaReview({
      capability_id: 'capability.faq_qa_review',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: {} },
      slots: {
        question: 'What does the Pro plan include?',
        draft_answer: 'partial answer',
        reason: 'faq_low_confidence',
        confidence: 0.22,
        citations: [{ source_id: 'plans-and-billing' }],
        kb_scope: 'public',
      },
    })

    expect(result.status).toBe('success')
    expect(result.capability_id).toBe('faq_qa_review')
    expect((result.result as { manual_review_required?: boolean }).manual_review_required).toBe(true)
    expect((result.result as { queue_status?: string }).queue_status).toBe('prepared')
  })
})
