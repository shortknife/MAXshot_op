import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { buildAuditEvent } from '@/lib/router/audit-event';

/**
 * POST /api/execution/replay
 * In-place replay marker: appends replay event and returns the same execution id.
 * This endpoint does not create a child execution.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, operator_id, confirm_token, actor_role } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }


    try {
      assertWriteEnabled({ operatorId: operator_id, confirmToken: confirm_token });
    } catch (e) {
      const blocked = buildWriteBlockedEvent({
        reason: e instanceof Error ? e.message : 'write_blocked',
        operatorId: operator_id,
        requestPath: '/api/execution/replay',
      });
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
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('execution_id, task_id, status, payload, result, audit_log, created_at, updated_at')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    const auditLog = execution.audit_log || { execution_id, events: [], created_at: new Date().toISOString() };
    const nextAudit = {
      ...auditLog,
      events: [
        ...(auditLog.events || []),
        buildAuditEvent(execution_id, {
          event_type: 'execution_replay_requested',
          data: {
            status: execution.status,
            actor_id: operator_id || null,
            actor_role: actor_role || null,
          },
        }),
      ],
    };

    const replayedAt = new Date().toISOString();
    await supabase
      .from('task_executions_op')
      .update({ audit_log: nextAudit })
      .eq('execution_id', execution_id);

    return NextResponse.json({
      success: true,
      mode: 'in_place',
      execution_id: execution.execution_id,
      status: execution.status,
      replayed_at: replayedAt,
      message: 'Replay event appended to existing execution.',
      execution: {
        execution_id: execution.execution_id,
        task_id: execution.task_id,
        status: execution.status,
        payload: execution.payload || null,
        result: execution.result || null,
        audit_log: execution.audit_log || null,
        created_at: execution.created_at,
        updated_at: execution.updated_at,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
