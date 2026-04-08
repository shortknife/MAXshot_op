import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { buildAuditEvent } from '@/lib/router/audit-event';
import { assertExecutionEntryAccess } from '@/lib/customers/runtime-entry';
import { assertWriteEnabled, buildWriteBlockedEvent } from '@/lib/utils';
import { appendAuditEvent } from '@/lib/router/audit-logging';

/**
 * POST /api/execution/evolve
 * 手动触发 Evolution：生成 Insight 并记录 recommendation（not_applied）。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { execution_id, actor_id, actor_role, confirm_token } = body;

    try {
      assertWriteEnabled({ operatorId: actor_id, confirmToken: confirm_token });
    } catch (e) {
      if (execution_id) {
        const blocked = buildWriteBlockedEvent({
          reason: e instanceof Error ? e.message : 'write_blocked',
          operatorId: actor_id,
          requestPath: '/api/execution/evolve',
        });
        await appendAuditEvent(execution_id, blocked);
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'write_blocked' }, { status: 403 });
    }

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionEntryAccess({ executionId: execution_id, operatorId: actor_id, requestPath: '/api/execution/evolve' });
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
      .select('execution_id, status, intent_name, result, audit_log')
      .eq('execution_id', execution_id)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id }, { status: 404 });
    }

    const summary = `Insight from execution ${execution_id}: status=${execution.status}; intent=${execution.intent_name || 'unknown'}`;
    const insightId = randomUUID();

    const { error: insertError } = await supabase
      .from('agent_memories_op')
      .insert({
        id: insightId,
        type: 'insight',
        content: summary,
        context: {
          execution_id,
          intent_name: execution.intent_name || null,
        },
        weight: 0.9,
        confidence: 0.7,
        source_execution_id: execution_id,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to write insight', details: insertError.message }, { status: 500 });
    }

    const auditLog = execution.audit_log || { execution_id, events: [], created_at: new Date().toISOString() };
    const nextAudit = {
      ...auditLog,
      events: [
        ...(auditLog.events || []),
        buildAuditEvent(execution_id, {
          event_type: 'recommendation_received',
          data: {
            status: execution.status,
            decision: 'not_applied',
            recommendation: {
              type: 'evolution',
              description: summary,
              target: 'working_mind',
            },
            actor_id: actor_id || null,
            actor_role: actor_role || null,
          },
        }),
      ],
    };

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: nextAudit })
      .eq('execution_id', execution_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update audit log', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      execution_id,
      insight_id: insightId,
      recommendation: { decision: 'not_applied' },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
