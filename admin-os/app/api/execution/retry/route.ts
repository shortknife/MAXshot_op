import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { randomUUID } from 'crypto';
import { buildAuditEvent } from '@/lib/router/audit-event';
import { appendAuditEvent } from '@/lib/router/audit-logging';
import { assertExecutionEntryAccess } from '@/lib/customers/runtime-entry';

/**
 * POST /api/execution/retry
 * 显式重试入口：创建新的 execution（pending_confirmation），不修改原执行记录。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, actor_id, actor_role, reason, confirm_token } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionEntryAccess({ executionId: execution_id, operatorId: actor_id, requestPath: '/api/execution/retry' });
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


    try {
      assertWriteEnabled({ operatorId: actor_id, confirmToken: confirm_token });
    } catch (e) {
      const blocked = buildWriteBlockedEvent({
        reason: e instanceof Error ? e.message : 'write_blocked',
        operatorId: actor_id,
        requestPath: '/api/execution/retry',
      });
      if (execution_id) {
        await appendAuditEvent(execution_id, blocked);
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
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
        buildAuditEvent(newExecutionId, {
          event_type: 'execution_retry_created',
          data: {
            status: 'pending_confirmation',
            source_execution_id: execution.execution_id,
            actor_id: actor_id || null,
            actor_role: actor_role || null,
            reason: reason || null,
          },
        }),
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
      mode: 'child_execution',
      source_execution_id: execution.execution_id,
      execution_id: newExecutionId,
      status: 'pending_confirmation',
      confirmation_request: confirmationRequest,
      message: 'Retry execution created. Confirmation required before run.',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
