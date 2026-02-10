import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type AuditEvent = { timestamp?: string; event_type?: string; data?: Record<string, unknown> };

function extractAuditEvents(auditLog: unknown): AuditEvent[] {
  if (!auditLog || typeof auditLog !== 'object') return [];
  const events = (auditLog as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  return events.filter((e): e is AuditEvent => typeof e === 'object' && e !== null);
}

function sortByTimestamp(events: AuditEvent[]) {
  return events.slice().sort((a, b) => {
    const ta = Date.parse(a.timestamp || '') || 0;
    const tb = Date.parse(b.timestamp || '') || 0;
    return ta - tb;
  });
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
      .select('execution_id, status, audit_log')
      .eq('execution_id', executionId)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id: executionId }, { status: 404 });
    }

    const events = sortByTimestamp(extractAuditEvents(execution.audit_log));

    return NextResponse.json({
      execution_id: executionId,
      status: execution.status,
      timeline: events.map(e => ({
        timestamp: e.timestamp || null,
        event_type: e.event_type || null,
        data: e.data || {},
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
