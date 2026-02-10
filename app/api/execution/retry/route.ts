import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

/**
 * POST /api/execution/retry
 * 显式重试入口：创建新的 execution（pending_confirmation），不修改原执行记录。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, actor_id, actor_role, reason } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('*')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    if (!['failed', 'rejected', 'expired'].includes(execution.status)) {
      return NextResponse.json({ error: 'Execution not eligible for retry', status: execution.status }, { status: 409 });
    }

    const newExecutionId = randomUUID();
    const confirmationRequest = {
      preview: {
        source_execution_id: execution.execution_id,
        intent_name: execution.intent_name || null,
      },
      token: `retry_${Date.now()}`,
      summary: 'Retry requested. Confirmation required before execution.',
    };

    const auditLog = {
      execution_id: newExecutionId,
      events: [
        {
          timestamp: new Date().toISOString(),
          event_type: 'execution_retry_created',
          data: {
            execution_id: newExecutionId,
            status: 'pending_confirmation',
            source_execution_id: execution.execution_id,
            actor_id: actor_id || null,
            actor_role: actor_role || null,
            reason: reason || null,
          },
        },
      ],
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('task_executions_op')
      .insert({
        execution_id: newExecutionId,
        task_id: execution.task_id,
        entry_type: execution.entry_type || null,
        requester_id: execution.requester_id || null,
        intent_name: execution.intent_name || null,
        payload: execution.payload || null,
        status: 'pending_confirmation',
        reason_for_pending: 'retry_requested',
        confirmation_request: confirmationRequest,
        audit_log: auditLog,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create retry execution', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      execution_id: newExecutionId,
      status: 'pending_confirmation',
      confirmation_request: confirmationRequest,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
