import { NextRequest, NextResponse } from 'next/server'
import { assertWriteEnabled } from '@/lib/utils'
import { registerKbSourceDraft, transitionKbSourceItem } from '@/lib/faq-kb/source-inventory'
import { isMutationAllowedForCustomer } from '@/lib/customers/runtime'

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
      if (customerId && !isMutationAllowedForCustomer(customerId, 'capability.kb_upload_qc')) {
        return NextResponse.json({ error: 'customer_capability_not_allowed' }, { status: 403 })
      }

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
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'kb_source_action_failed' },
      { status: 500 }
    )
  }
}
