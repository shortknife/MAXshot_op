import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractNormalizedAuditEvents } from '@/lib/router/audit-read';

function findSourceExecutionId(events: Array<{ event_type?: string; data?: Record<string, unknown> }>): string | null {
  const retryEvent = events.find(e => e.event_type === 'execution_retry_created');
  const source = retryEvent?.data?.source_execution_id;
  return typeof source === 'string' && source ? source : null;
}

function buildReplayNodes(executionId: string, events: Array<{ event_type?: string; timestamp?: string }>) {
  const replayEvents = events.filter(e => e.event_type === 'execution_replay_requested');
  return replayEvents.map(e => {
    const ts = e.timestamp || '';
    return {
      id: `replay:${executionId}:${ts}`,
      type: 'action',
      label: 'execution_replay_requested',
      timestamp: ts,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('execution_id');
    if (!executionId) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    const { data: target, error: targetError } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, created_at, audit_log')
      .eq('execution_id', executionId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: 'Failed to load execution', details: targetError.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: 'Execution not found', execution_id: executionId }, { status: 404 });
    }

    const events = extractNormalizedAuditEvents(target.audit_log, executionId);
    const sourceExecutionId = findSourceExecutionId(events);

    const nodes: Array<Record<string, unknown>> = [
      { id: executionId, type: 'execution', status: target.status, created_at: target.created_at },
    ];
    const edges: Array<Record<string, unknown>> = [];

    if (sourceExecutionId) {
      const { data: parent } = await supabase
        .from('task_executions_op')
        .select('execution_id, status, created_at')
        .eq('execution_id', sourceExecutionId)
        .maybeSingle();

      if (parent) {
        nodes.push({
          id: parent.execution_id,
          type: 'execution',
          status: parent.status,
          created_at: parent.created_at,
        });
      } else {
        nodes.push({ id: sourceExecutionId, type: 'execution', status: 'unknown' });
      }
      edges.push({ type: 'retry_from', from: sourceExecutionId, to: executionId });
    }

    const replayNodes = buildReplayNodes(executionId, events);
    for (const r of replayNodes) {
      nodes.push(r);
      edges.push({ type: 'replay_of', from: executionId, to: r.id });
    }

    // Find children by scanning recent executions for retry events referencing this execution.
    const { data: recent, error: recentError } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, created_at, audit_log')
      .order('created_at', { ascending: false })
      .limit(200);

    if (recentError) {
      return NextResponse.json({ error: 'Failed to scan executions', details: recentError.message }, { status: 500 });
    }

    const children = (recent || []).filter(row => {
      const evs = extractNormalizedAuditEvents(row.audit_log, row.execution_id);
      return evs.some(e => {
        const data = (e.data || {}) as Record<string, unknown>;
        return e.event_type === 'execution_retry_created' && data.source_execution_id === executionId;
      });
    });

    for (const child of children) {
      nodes.push({
        id: child.execution_id,
        type: 'execution',
        status: child.status,
        created_at: child.created_at,
      });
      edges.push({ type: 'retry_from', from: executionId, to: child.execution_id });
    }

    return NextResponse.json({
      execution_id: executionId,
      nodes,
      edges,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
