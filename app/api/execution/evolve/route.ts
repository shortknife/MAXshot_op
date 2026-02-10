import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

/**
 * POST /api/execution/evolve
 * 手动触发 Evolution：生成 Insight 并记录 recommendation（not_applied）。
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
        {
          timestamp: new Date().toISOString(),
          event_type: 'recommendation_received',
          data: {
            execution_id,
            status: execution.status,
            decision: 'not_applied',
            recommendation: {
              type: 'evolution',
              description: summary,
              target: 'working_mind',
            },
          },
        },
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
