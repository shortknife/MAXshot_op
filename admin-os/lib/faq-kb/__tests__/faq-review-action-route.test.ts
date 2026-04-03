import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  assertWriteEnabled: vi.fn(),
  transitionFaqReviewItem: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  assertWriteEnabled: mocks.assertWriteEnabled,
}))

vi.mock('@/lib/faq-kb/review-queue', async () => {
  const actual = await vi.importActual<typeof import('@/lib/faq-kb/review-queue')>('@/lib/faq-kb/review-queue')
  return {
    ...actual,
    transitionFaqReviewItem: mocks.transitionFaqReviewItem,
  }
})

import { POST } from '@/app/api/faq-review/action/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/faq-review/action', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('faq review action route', () => {
  beforeEach(() => {
    mocks.assertWriteEnabled.mockReset()
    mocks.transitionFaqReviewItem.mockReset()
  })

  it('requires explicit approval', async () => {
    const res = await POST(buildRequest({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      approved_by: 'op-1',
      approved: false,
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('approval_required')
  })

  it('applies bounded review transition', async () => {
    mocks.transitionFaqReviewItem.mockResolvedValue({
      review_id: 'faq-review-runtime-1',
      previous_status: 'prepared',
      queue_status: 'approved',
      queue_source: 'supabase',
    })

    const res = await POST(buildRequest({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      approved_by: 'op-1',
      approved: true,
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.queue_status).toBe('approved')
    expect(mocks.transitionFaqReviewItem).toHaveBeenCalledWith({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      operator_id: 'op-1',
    })
  })

  it('rejects operator outside customer scope', async () => {
    mocks.transitionFaqReviewItem.mockRejectedValue(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(buildRequest({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      approved_by: 'ops-auditor',
      approved: true,
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
  })

  it('rejects customer without review mutation permission', async () => {
    mocks.transitionFaqReviewItem.mockRejectedValue(new Error('customer_capability_not_allowed'))

    const res = await POST(buildRequest({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      approved_by: 'demo-reviewer',
      approved: true,
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('customer_capability_not_allowed')
  })

  it('returns conflict for invalid transition', async () => {
    mocks.transitionFaqReviewItem.mockRejectedValue(new Error('invalid_transition:rejected->approved'))

    const res = await POST(buildRequest({
      review_id: 'faq-review-runtime-1',
      action: 'approve',
      approved_by: 'op-1',
      approved: true,
      confirm_token: 'token',
    }))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('invalid_transition:rejected->approved')
  })
})
