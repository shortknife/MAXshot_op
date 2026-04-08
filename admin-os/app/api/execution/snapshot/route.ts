import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertExecutionReadAccess } from '@/lib/customers/runtime-entry';

/**
 * POST /api/execution/snapshot
 * 只读快照：返回 payload/result/audit_log，不写入 DB。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, requester_id, operator_id } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionReadAccess({ executionId: execution_id, requesterId: requester_id, operatorId: operator_id });
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

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('execution_id, payload, result, audit_log, created_at, updated_at')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      execution: {
        execution_id: execution.execution_id,
        payload: execution.payload ?? null,
        result: execution.result ?? null,
        audit_log: execution.audit_log ?? null,
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
