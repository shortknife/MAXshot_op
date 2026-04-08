import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { assertCustomerReadAccess } from '@/lib/customers/runtime-entry'

const DEFAULT_DAYS = 14
const MAX_ROWS = 300

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const daysRaw = Number(searchParams.get('days') || DEFAULT_DAYS)
    const requesterId = searchParams.get('requester_id')
    const operatorId = searchParams.get('operator_id')
    const customerId = searchParams.get('customer_id')
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : DEFAULT_DAYS
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    try {
      await assertCustomerReadAccess({ customerId, requesterId, operatorId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'read_scope_not_allowed'
      if (message === 'requester_identity_not_found') {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      const status = message === 'missing_reader_identity' ? 400 : 403
      return NextResponse.json({ error: message }, { status })
    }

    const { data, error } = await supabase
      .from('task_executions_op')
      .select('execution_id, intent_name, created_at, audit_log')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (error) {
      return NextResponse.json({ error: 'hypothesis_report_load_failed', details: error.message }, { status: 500 })
    }

    const rows = data || []
    const items: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const events = (row.audit_log?.events || []) as Array<{ event_type?: string; timestamp?: string; data?: Record<string, unknown> }>
      for (const event of events) {
        if (event.event_type === 'hypothesis_generated') {
          items.push({
            execution_id: row.execution_id,
            intent_name: row.intent_name,
            created_at: row.created_at,
            event_time: event.timestamp,
            ...(event.data || {}),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      days,
      since,
      total_hypothesis_events: items.length,
      items: items.slice(0, 100),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'hypothesis_report_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

