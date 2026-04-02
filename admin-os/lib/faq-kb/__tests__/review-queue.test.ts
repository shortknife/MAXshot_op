import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateSelect: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import { enqueueFaqReviewItem, loadFaqReviewQueueRuntime, transitionFaqReviewItem } from '@/lib/faq-kb/review-queue'

beforeEach(() => {
  mocks.from.mockReset()
  mocks.select.mockReset()
  mocks.order.mockReset()
  mocks.limit.mockReset()
  mocks.insert.mockReset()
  mocks.eq.mockReset()
  mocks.maybeSingle.mockReset()
  mocks.update.mockReset()
  mocks.updateEq.mockReset()
  mocks.updateSelect.mockReset()
  mocks.single.mockReset()
})

describe('faq review queue runtime', () => {
  it('falls back to seed queue when runtime store is unavailable', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({ data: null, error: new Error('relation faq_review_queue_op does not exist') }),
        }),
      }),
    })

    const queue = await loadFaqReviewQueueRuntime()
    expect(queue.source).toBe('seed')
    expect(queue.items.length).toBeGreaterThan(0)
  })

  it('uses supabase rows when available', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({
            data: [
              {
                review_id: 'faq-review-runtime-1',
                question: 'How do I reset my password?',
                reason: 'faq_low_confidence',
                priority: 'high',
                queue_status: 'prepared',
                kb_scope: 'general',
                channel: 'web',
                confidence: 0.31,
                created_at: '2026-04-02T10:00:00.000Z',
                draft_answer: 'Use the password reset flow.',
                citations: [{ source_id: 'account-access' }],
              },
            ],
            error: null,
          }),
        }),
      }),
    })

    const queue = await loadFaqReviewQueueRuntime()
    expect(queue.source).toBe('supabase')
    expect(queue.items[0]?.review_id).toBe('faq-review-runtime-1')
  })

  it('persists review item when runtime store is available', async () => {
    mocks.from.mockReturnValue({
      insert: mocks.insert.mockResolvedValue({ error: null }),
    })

    const result = await enqueueFaqReviewItem({
      question: 'What does the Pro plan include?',
      reason: 'faq_low_confidence',
      priority: 'high',
      citations: [{ source_id: 'plans-billing' }],
    })

    expect(result?.queue_source).toBe('supabase')
    expect(result?.review_id).toContain('faq-review-')
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })

  it('transitions prepared review to approved', async () => {
    mocks.from.mockImplementation((table: string) => {
      expect(table).toBe('faq_review_queue_op')
      return {
        select: mocks.select.mockReturnValue({
          eq: mocks.eq.mockReturnValue({
            maybeSingle: mocks.maybeSingle.mockResolvedValue({ data: { review_id: 'faq-review-runtime-1', queue_status: 'prepared' }, error: null }),
          }),
        }),
        update: mocks.update.mockReturnValue({
          eq: mocks.updateEq.mockReturnValue({
            select: mocks.updateSelect.mockReturnValue({
              single: mocks.single.mockResolvedValue({ data: { review_id: 'faq-review-runtime-1', queue_status: 'approved' }, error: null }),
            }),
          }),
        }),
      }
    })

    const result = await transitionFaqReviewItem({ review_id: 'faq-review-runtime-1', action: 'approve', operator_id: 'op-1' })
    expect(result).toEqual({
      review_id: 'faq-review-runtime-1',
      previous_status: 'prepared',
      queue_status: 'approved',
      queue_source: 'supabase',
    })
  })

  it('rejects invalid transitions', async () => {
    mocks.from.mockImplementation(() => ({
      select: mocks.select.mockReturnValue({
        eq: mocks.eq.mockReturnValue({
          maybeSingle: mocks.maybeSingle.mockResolvedValue({ data: { review_id: 'faq-review-runtime-2', queue_status: 'rejected' }, error: null }),
        }),
      }),
      update: mocks.update,
    }))

    await expect(transitionFaqReviewItem({ review_id: 'faq-review-runtime-2', action: 'approve', operator_id: 'op-1' })).rejects.toThrow(
      'invalid_transition:rejected->approved'
    )
  })
})
