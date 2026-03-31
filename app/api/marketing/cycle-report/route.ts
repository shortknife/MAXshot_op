import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buildCycleReport } from '@/lib/marketing/analytics'

const DEFAULT_DAYS = 7
const MAX_ROWS = 500

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const daysRaw = Number(searchParams.get('days') || DEFAULT_DAYS)
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : DEFAULT_DAYS
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('task_executions_op')
      .select('execution_id, intent_name, created_at, audit_log')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (error) {
      return NextResponse.json({ error: 'cycle_report_load_failed', details: error.message }, { status: 500 })
    }

    const rows = data || []
    const feedbackEvents: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const events = (row.audit_log?.events || []) as Array<{ event_type?: string; data?: Record<string, unknown> }>
      for (const event of events) {
        if (event.event_type === 'marketing_feedback_recorded') {
          feedbackEvents.push({
            execution_id: row.execution_id,
            intent_name: row.intent_name,
            created_at: row.created_at,
            ...(event.data || {}),
          })
        }
      }
    }

    const report = buildCycleReport(feedbackEvents)

    return NextResponse.json({
      success: true,
      days,
      since,
      report,
      feedback_samples: feedbackEvents.slice(0, 20),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'cycle_report_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

