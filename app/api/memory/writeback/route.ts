import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils'
import { buildMemoryInsert, buildWritebackEvents, isValidMemoryType } from '../../../../../server-actions/memory/writeback'
import { AuditLog } from '../../../../../server-actions/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sourceExecutionId = body?.source_execution_id as string | undefined
    const candidate = body?.candidate
    const memoryType = body?.memory_type as string | undefined
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
    if (!sourceExecutionId || typeof sourceExecutionId !== 'string') {
      return NextResponse.json({ error: 'missing_source_execution_id' }, { status: 400 })
    }
    if (!approvedBy || typeof approvedBy !== 'string') {
      return NextResponse.json({ error: 'missing_approved_by' }, { status: 400 })
    }
    if (!memoryType || !isValidMemoryType(memoryType)) {
      return NextResponse.json({ error: 'invalid_memory_type' }, { status: 400 })
    }
    if (!candidate || typeof candidate !== 'object') {
      return NextResponse.json({ error: 'missing_candidate' }, { status: 400 })
    }

    const content = JSON.stringify(candidate)
    const insertPayload = buildMemoryInsert({
      memory_type: memoryType,
      content,
      source_execution_id: sourceExecutionId,
      context: { approved_by: approvedBy },
    })

    const { data: memoryRow, error: insertError } = await supabase
      .from('agent_memories_op')
      .insert(insertPayload)
      .select('id')
      .single()

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

    const existingLog = (existing?.audit_log as AuditLog | undefined) || {
      execution_id: sourceExecutionId,
      events: [],
      created_at: new Date().toISOString(),
    }

    const events = buildWritebackEvents({
      execution_id: sourceExecutionId,
      memory_type: memoryType,
      operator_id: approvedBy,
    })

    const auditLog: AuditLog = {
      execution_id: sourceExecutionId,
      events: [...(existingLog.events || []), ...events],
      created_at: existingLog.created_at || new Date().toISOString(),
    }

    const { error: auditUpdateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: auditLog })
      .eq('execution_id', sourceExecutionId)

    if (auditUpdateError) {
      return NextResponse.json({ error: 'audit_log_update_failed', details: auditUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      memory_id: memoryRow?.id || null,
      events: events.map((e) => e.event_type),
    })
  } catch (e) {
    return NextResponse.json({ error: 'writeback_failed' }, { status: 500 })
  }
}
