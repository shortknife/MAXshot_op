import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type AuditEvent = { timestamp?: string; event_type?: string; data?: Record<string, unknown> };

function extractAuditEvents(auditLog: unknown): AuditEvent[] {
  if (!auditLog || typeof auditLog !== 'object') return [];
  const events = (auditLog as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.filter((e): e is AuditEvent => typeof e === 'object' && e !== null);
}

function findSourceExecutionId(events: AuditEvent[]): string | null {
  const retryEvent = events.find(e => e.event_type === 'execution_retry_created');
  const source = retryEvent?.data?.source_execution_id;
  return typeof source === 'string' && source ? source : null;
}

function diffJson(a: unknown, b: unknown, path = '', acc: Array<Record<string, unknown>> = [], limit = 50) {
  if (acc.length >= limit) return acc;
  if (a === b) return acc;

  const aType = typeof a;
  const bType = typeof b;
  if (a == null || b == null || aType !== 'object' || bType !== 'object') {
    acc.push({ path, before: a ?? null, after: b ?? null });
    return acc;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of keys) {
    if (acc.length >= limit) break;
    diffJson(aObj[key], bObj[key], path ? `${path}.${key}` : key, acc, limit);
  }
  return acc;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('execution_id');
    if (!executionId) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    const { data: execution, error: execError } = await supabase
      .from('task_executions_op')
      .select('execution_id, result, audit_log, created_at')
      .eq('execution_id', executionId)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id: executionId }, { status: 404 });
    }

    const events = extractAuditEvents(execution.audit_log);
    let parentId = findSourceExecutionId(events);
    let direction: 'parent_to_child' | 'child_to_parent' | 'none' = 'none';
    let counterpart: { execution_id: string; result: unknown } | null = null;

    if (parentId) {
      const { data: parent } = await supabase
        .from('task_executions_op')
        .select('execution_id, result')
        .eq('execution_id', parentId)
        .maybeSingle();
      if (parent) {
        counterpart = parent;
        direction = 'parent_to_child';
      }
    }

    if (!counterpart) {
      const { data: recent } = await supabase
        .from('task_executions_op')
        .select('execution_id, result, audit_log, created_at')
        .order('created_at', { ascending: true })
        .limit(200);
      const children = (recent || []).filter(row => {
        const evs = extractAuditEvents(row.audit_log);
        return evs.some(e => e.event_type === 'execution_retry_created' && e.data?.source_execution_id === executionId);
      });
      if (children.length > 0) {
        counterpart = { execution_id: children[0].execution_id, result: children[0].result };
        direction = 'child_to_parent';
      }
    }

    if (!counterpart) {
      return NextResponse.json({
        execution_id: executionId,
        message: 'No retry parent/child found for outcome delta.',
        deltas: [],
        direction,
      });
    }

    const before = direction === 'parent_to_child' ? counterpart.result : execution.result;
    const after = direction === 'parent_to_child' ? execution.result : counterpart.result;
    const deltas = diffJson(before, after);

    return NextResponse.json({
      execution_id: executionId,
      counterpart_execution_id: counterpart.execution_id,
      direction,
      deltas,
      triggered_by: 'execution_retry_created',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
