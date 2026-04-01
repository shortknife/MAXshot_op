import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  productDocQnA: vi.fn(),
  faqAnswering: vi.fn(),
  faqFallback: vi.fn(),
}))

vi.mock('@/lib/capabilities/product-doc-qna', () => ({
  productDocQnA: mocks.productDocQnA,
}))

vi.mock('@/lib/capabilities/faq-answering', () => ({
  faqAnswering: mocks.faqAnswering,
}))

vi.mock('@/lib/capabilities/faq-fallback', () => ({
  faqFallback: mocks.faqFallback,
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

  it('routes low-confidence faq answers through faq fallback', async () => {
    mocks.faqAnswering.mockResolvedValue({
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'success',
      result: {
        answer: 'partial',
        citations: [{ source_id: 'plans-and-billing' }],
        confidence: 0.22,
        fallback_required: true,
        review_required: true,
        reason: 'faq_low_confidence',
      },
      evidence: { sources: [{ source_id: 'plans-and-billing' }], doc_quotes: null, fallback_reason: 'faq_low_confidence' },
      audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
      metadata: { retrieval_count: 1, kb_scope: 'public' },
    })
    mocks.faqFallback.mockResolvedValue({
      capability_id: 'faq_fallback',
      capability_version: '1.0',
      status: 'success',
      result: {
        fallback_message: 'I found related FAQ material, but the answer confidence is too low to present as a grounded final answer.',
      },
      evidence: { sources: [{ source_id: 'plans-and-billing' }], doc_quotes: null, fallback_reason: 'faq_low_confidence' },
      audit: { capability_id: 'faq_fallback', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
      metadata: { kb_scope: 'public' },
    })

    const result = await handleQnaIntent({
      intentType: 'general_qna',
      matchedCapabilityIds: ['capability.faq_answering'],
      primaryCapabilityId: 'capability.faq_answering',
      parsed: { intent: { extracted_slots: {} }, prompt_meta: null },
      rawQuery: 'What does the Pro plan include?',
    })

    expect(mocks.faqFallback).toHaveBeenCalledTimes(1)
    expect((result.body as { data?: { summary?: string; meta?: { answer_meta?: { capability_id?: string; review_required?: boolean } } } }).data?.summary).toContain('confidence is too low')
    expect((result.body as { data?: { meta?: { answer_meta?: { capability_id?: string; review_required?: boolean } } } }).data?.meta?.answer_meta?.capability_id).toBe('faq_fallback')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_required?: boolean } } } }).data?.meta?.answer_meta?.review_required).toBe(true)
  })
})
