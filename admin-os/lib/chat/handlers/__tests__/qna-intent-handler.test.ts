import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  productDocQnA: vi.fn(),
  faqAnswering: vi.fn(),
  faqFallback: vi.fn(),
  faqQaReview: vi.fn(),
  enqueueFaqReviewItem: vi.fn(),
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

vi.mock('@/lib/capabilities/faq-qa-review', () => ({
  faqQaReview: mocks.faqQaReview,
}))

vi.mock('@/lib/faq-kb/review-queue', () => ({
  enqueueFaqReviewItem: mocks.enqueueFaqReviewItem,
}))

import { handleQnaIntent } from '@/lib/chat/handlers/qna-intent-handler'

describe('qna-intent-handler', () => {
  beforeEach(() => {
    mocks.productDocQnA.mockReset()
    mocks.faqAnswering.mockReset()
    mocks.faqFallback.mockReset()
    mocks.faqQaReview.mockReset()
    mocks.enqueueFaqReviewItem.mockReset()
  })
  it('blocks faq capability when the customer policy does not allow it', async () => {
    const result = await handleQnaIntent({
      intentType: 'general_qna',
      matchedCapabilityIds: ['capability.faq_answering'],
      primaryCapabilityId: 'capability.faq_answering',
      parsed: { intent: { extracted_slots: { customer_id: 'ops-observer' } }, prompt_meta: null },
      rawQuery: 'How do I reset my password?',
    })

    expect(mocks.faqAnswering).not.toHaveBeenCalled()
    expect((result.body as { data?: { summary?: string; meta?: { answer_meta?: { capability_allowed?: boolean; reason?: string; customer_id?: string } } } }).data?.summary).toContain('未开放 FAQ / KB 问答能力')
    expect((result.body as { data?: { meta?: { answer_meta?: { capability_allowed?: boolean; reason?: string; customer_id?: string } } } }).data?.meta?.answer_meta).toEqual(expect.objectContaining({
      capability_allowed: false,
      reason: 'customer_capability_not_allowed',
      customer_id: 'ops-observer',
    }))
  })

  it('uses faq capability when faq capability is primary', async () => {
    mocks.enqueueFaqReviewItem.mockReset()
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


  it('prefers faq capability for faq-first customer workspaces when both qna capabilities match', async () => {
    mocks.faqAnswering.mockResolvedValue({
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'success',
      result: { answer: 'FAQ path', citations: [], confidence: 0.91, fallback_required: false, review_required: false },
      evidence: { sources: [], doc_quotes: null },
      audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
      metadata: { retrieval_count: 1 },
    })

    const result = await handleQnaIntent({
      intentType: 'general_qna',
      matchedCapabilityIds: ['capability.product_doc_qna', 'capability.faq_answering'],
      primaryCapabilityId: 'capability.product_doc_qna',
      parsed: { intent: { extracted_slots: { customer_id: 'nexa-demo' } }, prompt_meta: null },
      rawQuery: 'How does the FAQ review chain work?',
      workspacePreset: {
        customer_id: 'nexa-demo',
        workspace_version: '1',
        primary_plane: 'faq_kb',
        default_entry_path: '/chat',
        preferred_capabilities: ['capability.faq_answering', 'capability.product_doc_qna'],
        focused_surfaces: ['chat'],
        recommended_route_order: ['faq_kb', 'product_docs'],
        summary: 'faq first',
        quick_queries: [],
        file_path: 'customer-assets/nexa-demo/workspace.md',
      },
    })

    expect(mocks.faqAnswering).toHaveBeenCalledTimes(1)
    expect(mocks.productDocQnA).not.toHaveBeenCalled()
    expect((result.body as { data?: { meta?: { answer_meta?: { capability_id?: string } } } }).data?.meta?.answer_meta?.capability_id).toBe('faq_answering')
  })

  it('routes low-confidence faq answers through fallback and review packaging', async () => {
    mocks.enqueueFaqReviewItem.mockResolvedValue({ review_id: 'faq-review-runtime-1', queue_source: 'supabase' })
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
    mocks.faqQaReview.mockResolvedValue({
      capability_id: 'faq_qa_review',
      capability_version: '1.0',
      status: 'success',
      result: {
        review_payload: { question: 'What does the Pro plan include?', priority: 'high' },
        manual_review_required: true,
        queue_status: 'prepared',
      },
      evidence: { sources: [{ source_id: 'plans-and-billing' }], doc_quotes: null, review_reason: 'faq_low_confidence' },
      audit: { capability_id: 'faq_qa_review', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
      metadata: { manual_review_required: true },
    })

    const result = await handleQnaIntent({
      intentType: 'general_qna',
      matchedCapabilityIds: ['capability.faq_answering'],
      primaryCapabilityId: 'capability.faq_answering',
      parsed: { intent: { extracted_slots: { customer_id: 'maxshot' } }, prompt_meta: null },
      rawQuery: 'What does the Pro plan include?',
    })

    expect(mocks.faqFallback).toHaveBeenCalledTimes(1)
    expect(mocks.faqQaReview).toHaveBeenCalledTimes(1)
    expect((result.body as { data?: { summary?: string; meta?: { answer_meta?: { capability_id?: string; review_required?: boolean; review_payload?: { priority?: string } } } } }).data?.summary).toContain('confidence is too low')
    expect((result.body as { data?: { meta?: { answer_meta?: { capability_id?: string } } } }).data?.meta?.answer_meta?.capability_id).toBe('faq_qa_review')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { priority?: string; review_id?: string; queue_source?: string } } } } }).data?.meta?.answer_meta?.review_payload?.priority).toBe('high')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { review_id?: string; queue_source?: string } } } } }).data?.meta?.answer_meta?.review_payload?.review_id).toBe('faq-review-runtime-1')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { queue_source?: string; review_queue_label?: string; escalation_style?: string; suggested_actions?: string[] } } } } }).data?.meta?.answer_meta?.review_payload?.queue_source).toBe('supabase')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { review_queue_label?: string } } } } }).data?.meta?.answer_meta?.review_payload?.review_queue_label).toBe('Operator Review Queue')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { escalation_style?: string } } } } }).data?.meta?.answer_meta?.review_payload?.escalation_style).toBe('operator')
    expect((result.body as { data?: { meta?: { answer_meta?: { review_payload?: { suggested_actions?: string[] } } } } }).data?.meta?.answer_meta?.review_payload?.suggested_actions).toEqual([
      '打开 FAQ Review',
      '检查 KB Management',
      '缩小问题范围后重试',
    ])
    expect(mocks.enqueueFaqReviewItem).toHaveBeenCalledTimes(1)
    expect(mocks.enqueueFaqReviewItem).toHaveBeenCalledWith(expect.objectContaining({ customer_id: 'maxshot' }))
  })
})
