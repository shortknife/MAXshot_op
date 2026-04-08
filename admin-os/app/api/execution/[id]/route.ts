import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildTraceReadModel } from '@/lib/router/audit-read';
import { assertExecutionReadAccess } from '@/lib/customers/runtime-entry';

/**
 * GET /api/execution/[id]
 * Phase 1 Admin OS 最小执行审计视图 - 按 execution_id 拉取 task_executions_op + audit 数据
 * 与 FSD 02.3、09 审计责任一致：展示 execution_id、status、intent、failure_mode、used_skills、evidence
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: execution_id } = await params;
    const requesterId = req.nextUrl.searchParams.get('requester_id');
    const operatorId = req.nextUrl.searchParams.get('operator_id');
    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionReadAccess({ executionId: execution_id, requesterId, operatorId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'read_scope_not_allowed';
      if (message === 'execution_not_found') {
        return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
      }
      if (message === 'requester_identity_not_found') {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      const status = message === 'missing_reader_identity' ? 400 : 403;
      return NextResponse.json({ error: message }, { status });
    }

    // 1. task_executions_op 主记录（必有）
    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('*')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      console.error('[Execution API] task_executions_op error:', execError);
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    const trace = buildTraceReadModel((execution as { audit_log?: unknown })?.audit_log, execution_id);

    return NextResponse.json({
      execution: {
        execution_id: execution.execution_id,
        task_id: execution.task_id,
        entry_type: execution.entry_type,
        requester_id: execution.requester_id,
        intent_name: execution.intent_name,
        reason_for_pending: execution.reason_for_pending ?? null,
        confirmation_request: execution.confirmation_request ?? null,
        confirmation_result: execution.confirmation_result ?? null,
        idempotency_key: (execution as { idempotency_key?: string }).idempotency_key ?? null,
        status: execution.status,
        result: execution.result ?? null,
        created_at: execution.created_at,
        updated_at: execution.updated_at,
      },
      audit_log: execution.audit_log ?? null,
      audit_steps: trace.events,
      trace,
    });
  } catch (error: unknown) {
    console.error('[Execution API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
