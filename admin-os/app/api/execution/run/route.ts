import { NextRequest, NextResponse } from 'next/server';
import { executeRouter } from '@/lib/router/execute';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { appendAuditEvent } from '@/lib/router/audit-logging';
import { assertExecutionEntryAccess } from '@/lib/customers/runtime-entry';

/**
 * POST /api/execution/run
 * 显式触发 Router 执行（仅 confirmed 执行；Router 内部会校验）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, operator_id, confirm_token } = body;

    
    try {
      assertWriteEnabled({ operatorId: operator_id, confirmToken: confirm_token })
    } catch (e) {
      if (execution_id) {
        const blocked = buildWriteBlockedEvent({
          reason: e instanceof Error ? e.message : 'write_blocked',
          operatorId: operator_id,
          requestPath: '/api/execution/run',
        });
        await appendAuditEvent(execution_id, blocked);
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }
    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionEntryAccess({ executionId: execution_id, operatorId: operator_id, requestPath: '/api/execution/run' });
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

    const result = await executeRouter(execution_id);
    if (!result.success) {
      const routingDecision = (result as Record<string, unknown>).routing_decision as Record<string, unknown> | null
      const dispatchReady = routingDecision?.dispatch_ready === true
      if (dispatchReady) {
        return NextResponse.json(
          {
            success: true,
            execution_id,
            routing_decision: routingDecision,
            result,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          execution_id,
          error: result.error || 'router_blocked',
          routing_decision: routingDecision || null,
          result,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      execution_id,
      routing_decision: (result as Record<string, unknown>).routing_decision || null,
      result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Execution run failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
