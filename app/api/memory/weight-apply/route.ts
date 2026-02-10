import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils'
import { AuditLog } from '../../../../../server-actions/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const memoryId = body?.memory_id as string | undefined
    const sourceExecutionId = body?.source_execution_id as string | undefined
    const operatorId = body?.approved_by as string | undefined
    const confirmToken = body?.confirm_token as string | undefined
    const approved = body?.approved === true
    const recommendedWeight = body?.recommended_weight
    const reasonCode = body?.reason_code as string | undefined

    
    try {
      assertWriteEnabled({ operatorId, confirmToken })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 })
    }
    if (!approved) return NextResponse.json({ error: 'approval_required' }, { status: 400 })
    if (!memoryId || !sourceExecutionId || !operatorId) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    if (typeof recommendedWeight !== 'number') return NextResponse.json({ error: 'invalid_weight' }, { status: 400 })

    const { data: memoryRow, error: memoryError } = await supabase
      .from('agent_memories_op')
      .select('id, weight, type, content')
      .eq('id', memoryId)
      .maybeSingle()

    if (memoryError || !memoryRow) {
      return NextResponse.json({ error: 'memory_not_found' }, { status: 404 })
    }

    const adjustmentPayload = {
      type: memoryRow.type,
      content: JSON.stringify({
        original_content: memoryRow.content,
        weight_adjustment: {
          from: memoryRow.weight,
          to: recommendedWeight,
          delta: Number((recommendedWeight - Number(memoryRow.weight ?? 0)).toFixed(2)),
        },
      }),
      context: {
        source_memory_id: memoryRow.id,
        approved_by: operatorId,
        reason_code: reasonCode || 'unknown',
      },
      source_execution_id: sourceExecutionId,
      weight: recommendedWeight,
    }

    const { error: insertError } = await supabase
      .from('agent_memories_op')
      .insert(adjustmentPayload)

    if (insertError) {
      return NextResponse.json({ error: 'memory_insert_failed', details: insertError.message }, { status: 500 })
    }

    const { data: existing, error: auditError } = await supabase
      .from('task_executions_op')
      .select('audit_log')
      .eq('execution_id', sourceExecutionId)
      .maybeSingle()

    if (auditError) {
      return NextResponse.json({ error: 'audit_log_load_failed', details: auditError.message }, { status: 500 })
    }

    const now = new Date().toISOString()
    const events = [
      { timestamp: now, event_type: 'memory_weight_adjustment_requested', data: { execution_id: sourceExecutionId, memory_id: memoryRow.id, previous_weight: memoryRow.weight, new_weight: recommendedWeight, operator_id: operatorId, reason_code: reasonCode || 'unknown' } },
      { timestamp: now, event_type: 'memory_weight_adjustment_approved', data: { execution_id: sourceExecutionId, memory_id: memoryRow.id, previous_weight: memoryRow.weight, new_weight: recommendedWeight, operator_id: operatorId, reason_code: reasonCode || 'unknown' } },
      { timestamp: now, event_type: 'memory_weight_adjustment_applied', data: { execution_id: sourceExecutionId, memory_id: memoryRow.id, previous_weight: memoryRow.weight, new_weight: recommendedWeight, operator_id: operatorId, reason_code: reasonCode || 'unknown' } },
    ]

    const existingLog = (existing?.audit_log as AuditLog | undefined) || {
      execution_id: sourceExecutionId,
      events: [],
      created_at: now,
    }

    const auditLog: AuditLog = {
      execution_id: sourceExecutionId,
      events: [...(existingLog.events || []), ...events],
      created_at: existingLog.created_at || now,
    }

    const { error: auditUpdateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: auditLog })
      .eq('execution_id', sourceExecutionId)

    if (auditUpdateError) {
      return NextResponse.json({ error: 'audit_log_update_failed', details: auditUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, events: events.map((e) => e.event_type) })
  } catch {
    return NextResponse.json({ error: 'weight_apply_failed' }, { status: 500 })
  }
}
