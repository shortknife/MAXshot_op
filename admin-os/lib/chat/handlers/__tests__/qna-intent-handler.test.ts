import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  productDocQnA: vi.fn(),
  faqAnswering: vi.fn(),
}))

vi.mock('@/lib/capabilities/product-doc-qna', () => ({
  productDocQnA: mocks.productDocQnA,
}))

vi.mock('@/lib/capabilities/faq-answering', () => ({
  faqAnswering: mocks.faqAnswering,
}))

import { handleQnaIntent } from '@/lib/chat/handlers/qna-intent-handler'

describe('qna-intent-handler', () => {
  it('uses faq capability when faq capability is primary', async () => {
    mocks.faqAnswering.mockResolvedValue({
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'success',
      result: {
        answer: 'Use the Forgot password link on the sign-in page.',
        citations: [{ source_id: 'account-access' }],
        confidence: 0.9,
        fallback_required: false,
        review_required: false,
      },
      evidence: { sources: [{ source_id: 'account-access' }], doc_quotes: null },
      audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
      metadata: { retrieval_count: 1 },
    })

    const result = await handleQnaIntent({
      intentType: 'general_qna',
      matchedCapabilityIds: ['capability.faq_answering'],
      primaryCapabilityId: 'capability.faq_answering',
      parsed: { intent: { extracted_slots: {} }, prompt_meta: null },
      rawQuery: 'How do I reset my password?',
    })

    expect(mocks.faqAnswering).toHaveBeenCalledTimes(1)
    expect(mocks.productDocQnA).not.toHaveBeenCalled()
    expect((result.body as { data?: { summary?: string; meta?: { answer_meta?: { capability_id?: string } } } }).data?.summary).toContain('Forgot password')
    expect((result.body as { data?: { meta?: { answer_meta?: { capability_id?: string } } } }).data?.meta?.answer_meta?.capability_id).toBe('faq_answering')
  })
})
