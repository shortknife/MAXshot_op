import { NextRequest, NextResponse } from 'next/server'
import { assertWriteEnabled } from '@/lib/utils'
import { registerKbSourceDraft, transitionKbSourceItem } from '@/lib/faq-kb/source-inventory'
import { assertOperatorCustomerAccess } from '@/lib/customers/access'
import { assertCapabilityMutationPolicy } from '@/lib/router/capability-policy'
import { acquireWriteLane, releaseWriteLane } from '@/lib/router/write-lane'

type KbSourceAction = 'register' | 'accept' | 'reject'

function isValidAction(action: string): action is KbSourceAction {
  return action === 'register' || action === 'accept' || action === 'reject'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const action = String(body.action || '').trim()
    const operatorId = String(body.operator_id || '').trim()
    const confirmToken = String(body.confirm_token || '').trim()
    const approved = body.approved === true

    if (!isValidAction(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }
    if (!approved) {
      return NextResponse.json({ error: 'approval_required' }, { status: 400 })
    }

    assertWriteEnabled({ operatorId, confirmToken })

    if (action === 'register') {
      const title = String(body.title || '').trim()
      const customerId = String(body.customer_id || '').trim() || null
      const sourceType = String(body.source_type || '').trim() as 'markdown' | 'text' | 'url' | 'pdf'
      const sourceRef = String(body.source_ref || '').trim()
      const kbScope = String(body.kb_scope || '').trim() || null
      const customerContext = String(body.customer_context || '').trim() || null
      const sourceId = String(body.source_id || '').trim() || null

      if (!title || !sourceRef || !['markdown', 'text', 'url', 'pdf'].includes(sourceType)) {
        return NextResponse.json({ error: 'invalid_register_payload' }, { status: 400 })
      }
      try {
        assertCapabilityMutationPolicy({ capabilityId: 'capability.kb_upload_qc', customerId })
        assertOperatorCustomerAccess({ operatorId, customerId })
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'customer_capability_not_allowed' }, { status: 403 })
      }
      let lease = null
      try {
        lease = await acquireWriteLane({ capabilityId: 'capability.kb_upload_qc', customerId, operatorId })
      } catch (error) {
        if (error instanceof Error && error.message === 'write_lane_busy') {
          return NextResponse.json({ error: 'write_lane_busy' }, { status: 409 })
        }
        throw error
      }

      try {
        const registered = await registerKbSourceDraft({
          source_id: sourceId,
          title,
          customer_id: customerId,
          kb_scope: kbScope,
          source_type: sourceType,
          source_ref: sourceRef,
          uploaded_by: operatorId,
          customer_context: customerContext,
        })

        if (!registered) {
          return NextResponse.json({ error: 'kb_source_inventory_unavailable' }, { status: 503 })
        }

        return NextResponse.json({ source_id: registered.source_id, source_status: 'draft', inventory_source: registered.inventory_source })
      } finally {
        await releaseWriteLane(lease)
      }
    }

    const sourceId = String(body.source_id || '').trim()
    if (!sourceId) {
      return NextResponse.json({ error: 'missing_source_id' }, { status: 400 })
    }

    try {
      const transitioned = await transitionKbSourceItem({ source_id: sourceId, action, operator_id: operatorId })
      if (!transitioned) {
        return NextResponse.json({ error: 'kb_source_not_found_or_unavailable' }, { status: 404 })
      }
      return NextResponse.json(transitioned)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'kb_source_transition_failed'
      if (message.startsWith('invalid_transition:')) {
        return NextResponse.json({ error: message }, { status: 409 })
      }
      if (message === 'customer_capability_not_allowed') {
        return NextResponse.json({ error: message }, { status: 403 })
      }
      if (message === 'write_lane_busy') {
        return NextResponse.json({ error: message }, { status: 409 })
      }
      if (message === 'operator_customer_scope_not_allowed') {
        return NextResponse.json({ error: message }, { status: 403 })
      }
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'kb_source_action_failed' },
      { status: 500 }
    )
  }
}
