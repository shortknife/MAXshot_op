import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { buildAuditEvent } from '@/lib/router/audit-event';

/**
 * POST /api/execution/expire
 * 显式将 execution 标记为 expired，仅更新状态与审计。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, actor_id, actor_role, reason, confirm_token } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }


    try {
      assertWriteEnabled({ operatorId: actor_id, confirmToken: confirm_token });
    } catch (e) {
      const blocked = buildWriteBlockedEvent({
        reason: e instanceof Error ? e.message : 'write_blocked',
        operatorId: actor_id,
        requestPath: '/api/execution/expire',
      });
      if (execution_id) {
        const { data: existing } = await supabase
          .from('task_executions_op')
          .select('audit_log')
          .eq('execution_id', execution_id)
          .maybeSingle();
        const auditLog = existing?.audit_log || { execution_id, events: [], created_at: new Date().toISOString() };
        await supabase
          .from('task_executions_op')
          .update({ audit_log: { ...auditLog, events: [...(auditLog.events || []), blocked] } })
          .eq('execution_id', execution_id);
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, audit_log')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }
    const previousStatus = execution.status;

    if (['completed', 'failed', 'rejected', 'expired'].includes(execution.status)) {
      return NextResponse.json({ error: 'Execution already terminal', status: execution.status }, { status: 409 });
    }

    const auditLog = execution.audit_log || { execution_id, events: [], created_at: new Date().toISOString() };
    const nextAudit = {
      ...auditLog,
      events: [
        ...(auditLog.events || []),
        buildAuditEvent(execution_id, {
          event_type: 'execution_expired',
          data: {
            status: 'expired',
            previous_status: execution.status,
            actor_id: actor_id || null,
            actor_role: actor_role || null,
            reason: reason || null,
          },
        }),
      ],
    };

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({
        status: 'expired',
        audit_log: nextAudit,
      })
      .eq('execution_id', execution_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update execution', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mode: 'in_place',
      execution_id,
      status: 'expired',
      previous_status: previousStatus,
      message: 'Execution marked as expired.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
