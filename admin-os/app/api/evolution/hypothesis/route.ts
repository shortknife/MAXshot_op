import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { assertWriteEnabled } from '@/lib/utils'
import { AuditLog } from '@/lib/types'
import { buildExecutionHypotheses, summarizeHypothesisPortfolio } from '@/lib/evolution/hypothesis'
import { assertExecutionEntryAccess } from '@/lib/customers/runtime-entry'
import { buildAuditEvent } from '@/lib/router/audit-event'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const executionId = String(body?.execution_id || '').trim()
    const operatorId = String(body?.operator_id || '').trim()
    const confirmToken = String(body?.confirm_token || '').trim()

    try {
      assertWriteEnabled({ operatorId, confirmToken })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'write_blocked' }, { status: 403 })
    }

    if (!executionId) {
      return NextResponse.json({ error: 'missing_execution_id' }, { status: 400 })
    }

    try {
      await assertExecutionEntryAccess({ executionId, operatorId, requestPath: '/api/evolution/hypothesis' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'operator_customer_scope_not_allowed'
      if (message === 'execution_not_found') return NextResponse.json({ error: 'execution_not_found' }, { status: 404 })
      if (message.startsWith('execution_context_load_failed:')) {
        return NextResponse.json({ error: 'execution_context_load_failed', details: message.slice('execution_context_load_failed:'.length) }, { status: 500 })
      }
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const { data: execution, error: loadError } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, intent_name, result, audit_log, created_at')
      .eq('execution_id', executionId)
      .maybeSingle()

    if (loadError) {
      return NextResponse.json({ error: 'execution_load_failed', details: loadError.message }, { status: 500 })
    }
    if (!execution) {
      return NextResponse.json({ error: 'execution_not_found' }, { status: 404 })
    }

    const hypotheses = buildExecutionHypotheses({
      execution_id: execution.execution_id,
      status: execution.status,
      intent_name: execution.intent_name,
      result: execution.result as { capability_outputs?: Array<Record<string, unknown>> } | null,
      created_at: execution.created_at,
    })
    const summary = summarizeHypothesisPortfolio(hypotheses)

    const now = new Date().toISOString()
    const currentAudit = (execution.audit_log as AuditLog | undefined) || {
      execution_id: executionId,
      created_at: now,
      events: [],
    }
    const event = buildAuditEvent(executionId, {
      timestamp: now,
      event_type: 'hypothesis_generated',
      data: {
        status: 'completed',
        operator_id: operatorId,
        summary,
        hypotheses,
      },
    })
    const nextAudit: AuditLog = {
      execution_id: executionId,
      created_at: currentAudit.created_at || now,
      events: [...(currentAudit.events || []), event],
    }

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: nextAudit })
      .eq('execution_id', executionId)

    if (updateError) {
      return NextResponse.json({ error: 'execution_update_failed', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      summary,
      hypotheses,
      event_type: 'hypothesis_generated',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'hypothesis_generate_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
