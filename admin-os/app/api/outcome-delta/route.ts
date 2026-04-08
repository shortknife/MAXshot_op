import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertExecutionReadAccess } from '@/lib/customers/runtime-entry';

type AuditEvent = { timestamp?: string; event_type?: string; data?: Record<string, unknown> };

type Delta = { path: string; before: unknown; after: unknown };

function extractAuditEvents(auditLog: unknown): AuditEvent[] {
  if (!auditLog || typeof auditLog !== 'object') return [];
  const events = (auditLog as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.filter((e): e is AuditEvent => typeof e === 'object' && e !== null);
}

function findSourceExecutionId(events: AuditEvent[]): string | null {
  const retryEvent = events.find((e) => e.event_type === 'execution_retry_created');
  const source = retryEvent?.data?.source_execution_id;
  return typeof source === 'string' && source ? source : null;
}

function diffJson(a: unknown, b: unknown, limit = 50) {
  const deltas: Delta[] = [];
  let truncated = false;

  const walk = (left: unknown, right: unknown, path = '') => {
    if (deltas.length >= limit) {
      truncated = true;
      return;
    }
    if (left === right) return;

    const leftType = typeof left;
    const rightType = typeof right;
    if (left == null || right == null || leftType !== 'object' || rightType !== 'object') {
      deltas.push({ path, before: left ?? null, after: right ?? null });
      return;
    }

    const leftObj = left as Record<string, unknown>;
    const rightObj = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]);
    for (const key of keys) {
      if (deltas.length >= limit) {
        truncated = true;
        break;
      }
      walk(leftObj[key], rightObj[key], path ? `${path}.${key}` : key);
    }
  };

  walk(a, b);
  return { deltas, truncated };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('execution_id');
    const requesterId = searchParams.get('requester_id');
    const operatorId = searchParams.get('operator_id');
    const counterpartParam = searchParams.get('counterpart_execution_id');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 50) || 50, 1), 200);

    if (!executionId) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionReadAccess({ executionId, requesterId, operatorId });
      if (counterpartParam) {
        await assertExecutionReadAccess({ executionId: counterpartParam, requesterId, operatorId });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'read_scope_not_allowed';
      if (message === 'execution_not_found') {
        return NextResponse.json({ error: 'Execution not found', execution_id: executionId }, { status: 404 });
      }
      if (message === 'requester_identity_not_found') {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      const status = message === 'missing_reader_identity' ? 400 : 403;
      return NextResponse.json({ error: message }, { status });
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

    let direction: 'parent_to_child' | 'child_to_parent' | 'explicit' | 'none' = 'none';
    let counterpart: { execution_id: string; result: unknown } | null = null;

    if (counterpartParam) {
      const { data: other } = await supabase
        .from('task_executions_op')
        .select('execution_id, result')
        .eq('execution_id', counterpartParam)
        .maybeSingle();
      if (other) {
        counterpart = other;
        direction = 'explicit';
      }
    }

    if (!counterpart) {
      const events = extractAuditEvents(execution.audit_log);
      const parentId = findSourceExecutionId(events);
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
    }

    if (!counterpart) {
      const { data: recent } = await supabase
        .from('task_executions_op')
        .select('execution_id, result, audit_log, created_at')
        .order('created_at', { ascending: true })
        .limit(200);
      const children = (recent || []).filter((row) => {
        const evs = extractAuditEvents(row.audit_log);
        return evs.some((e) => e.event_type === 'execution_retry_created' && e.data?.source_execution_id === executionId);
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
    const { deltas, truncated } = diffJson(before, after, limit);

    return NextResponse.json({
      execution_id: executionId,
      counterpart_execution_id: counterpart.execution_id,
      direction,
      deltas,
      truncated,
      limit,
      triggered_by: direction === 'explicit' ? 'manual_compare' : 'execution_retry_created',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
