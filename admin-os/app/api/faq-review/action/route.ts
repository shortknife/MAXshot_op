import { NextResponse } from 'next/server'

import { transitionFaqReviewItem, isValidFaqReviewAction } from '@/lib/faq-kb/review-queue'
import { assertWriteEnabled } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const reviewId = body?.review_id as string | undefined
    const action = body?.action as string | undefined
    const approvedBy = body?.approved_by as string | undefined
    const confirmToken = body?.confirm_token as string | undefined
    const approved = body?.approved === true

    try {
      assertWriteEnabled({ operatorId: approvedBy, confirmToken })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 })
    }

    if (!approved) {
      return NextResponse.json({ error: 'approval_required' }, { status: 400 })
    }
    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json({ error: 'missing_review_id' }, { status: 400 })
    }
    if (!action || !isValidFaqReviewAction(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }
    if (!approvedBy || typeof approvedBy !== 'string') {
      return NextResponse.json({ error: 'missing_approved_by' }, { status: 400 })
    }

    const updated = await transitionFaqReviewItem({
      review_id: reviewId,
      action,
      operator_id: approvedBy,
    })

    if (!updated) {
      return NextResponse.json({ error: 'review_not_found_or_runtime_unavailable' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      review_id: updated.review_id,
      previous_status: updated.previous_status,
      queue_status: updated.queue_status,
      queue_source: updated.queue_source,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'faq_review_action_failed'
    if (message.startsWith('invalid_transition:')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message === 'write_lane_busy') {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message === 'operator_customer_scope_not_allowed') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message === 'customer_capability_not_allowed') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: 'faq_review_action_failed' }, { status: 500 })
  }
}
