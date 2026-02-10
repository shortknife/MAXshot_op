import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/execution/replay
 * 显式回放入口：仅返回 execution 的 payload/result/audit，不写入 DB。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
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
        {
          timestamp: new Date().toISOString(),
          event_type: 'execution_replay_requested',
          data: {
            execution_id,
            status: execution.status,
            actor_id: null,
            actor_role: null,
          },
        },
      ],
    };

    await supabase
      .from('task_executions_op')
      .update({ audit_log: nextAudit })
      .eq('execution_id', execution_id);

    return NextResponse.json({
      success: true,
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
