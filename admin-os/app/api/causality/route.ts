import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractNormalizedAuditEvents, sortAuditEventsByTimestamp } from '@/lib/router/audit-read';
import { assertExecutionReadAccess } from '@/lib/customers/runtime-entry';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('execution_id');
    const requesterId = searchParams.get('requester_id');
    const operatorId = searchParams.get('operator_id');
    if (!executionId) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    try {
      await assertExecutionReadAccess({ executionId, requesterId, operatorId });
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
      .select('execution_id, status, audit_log')
      .eq('execution_id', executionId)
      .maybeSingle();

    if (execError) {
      return NextResponse.json({ error: 'Failed to load execution', details: execError.message }, { status: 500 });
    }
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found', execution_id: executionId }, { status: 404 });
    }

    const events = sortAuditEventsByTimestamp(extractNormalizedAuditEvents(execution.audit_log, executionId));

    return NextResponse.json({
      execution_id: executionId,
      status: execution.status,
      timeline: events.map(e => ({
        timestamp: e.timestamp || null,
        event_type: e.event_type || null,
        event_type_canonical: (e as { event_type_canonical?: string }).event_type_canonical || null,
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
