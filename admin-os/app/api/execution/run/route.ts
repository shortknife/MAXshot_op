import { NextRequest, NextResponse } from 'next/server';
import { executeRouter } from '@/lib/router/execute';
import { supabase } from '@/lib/supabase';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';

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
    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    const result = await executeRouter(execution_id);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          execution_id,
          error: result.error || 'router_blocked',
          routing_decision: (result as Record<string, unknown>).routing_decision || null,
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
