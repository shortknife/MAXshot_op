import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { buildAuditEvent } from '@/lib/router/audit-event';
import { appendAuditEvent } from '@/lib/router/audit-logging';
import { assertExecutionEntryAccess } from '@/lib/customers/runtime-entry';

/**
 * POST /api/execution/confirm
 * 确认/拒绝 side_effect 执行，仅更新 execution 状态与确认结果。
 * 严禁触发 Router 或调用任何 capability。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, decision, actor_id, actor_role, confirm_token } = body;

    
    try {
      assertWriteEnabled({ operatorId: actor_id, confirmToken: confirm_token })
    } catch (e) {
      if (execution_id) {
        const blocked = buildWriteBlockedEvent({
          reason: e instanceof Error ? e.message : 'write_blocked',
          operatorId: actor_id,
          requestPath: '/api/execution/confirm',
        });
        await appendAuditEvent(execution_id, blocked);
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }
    if (!execution_id || !decision || !['confirm', 'reject'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    try {
      await assertExecutionEntryAccess({ executionId: execution_id, operatorId: actor_id, requestPath: '/api/execution/confirm' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'operator_customer_scope_not_allowed';
      if (message === 'execution_not_found') {
        return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
      }
      if (message.startsWith('execution_context_load_failed:')) {
        return NextResponse.json({ error: 'execution_context_load_failed', details: message.slice('execution_context_load_failed:'.length) }, { status: 500 });
      }
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, confirmation_result, audit_log')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    if (execution.confirmation_result) {
      return NextResponse.json({ error: 'Confirmation already recorded', execution_id }, { status: 409 });
    }

    if (execution.status !== 'pending_confirmation') {
      return NextResponse.json({ error: 'Execution not pending confirmation', status: execution.status }, { status: 409 });
    }

    const nextStatus = decision === 'confirm' ? 'confirmed' : 'rejected';
    const eventType = decision === 'confirm' ? 'execution_confirmed' : 'execution_rejected';
    const confirmationResult = {
      decision: nextStatus,
      actor_id: actor_id || null,
      actor_role: actor_role || null,
      confirmed_at: new Date().toISOString(),
    };

    const auditLog = execution.audit_log || { execution_id, events: [], created_at: new Date().toISOString() };
    const nextAudit = {
      ...auditLog,
      events: [
        ...(auditLog.events || []),
        buildAuditEvent(execution_id, {
          event_type: eventType,
          data: {
            status: nextStatus,
            decision: nextStatus,
            actor_id: actor_id || null,
            actor_role: actor_role || null,
          },
        }),
      ],
    };

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({
        status: nextStatus,
        confirmation_result: confirmationResult,
        audit_log: nextAudit,
      })
      .eq('execution_id', execution_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update execution', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      execution_id,
      status: nextStatus,
      confirmation_result: confirmationResult,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
