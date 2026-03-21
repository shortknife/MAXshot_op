import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { normalizeAuditEvent } from '@/lib/router/audit-event'

const DEFAULT_LIMIT = 200
const DEFAULT_DAYS = 7
const MAX_LIMIT = 1000

const isFailureEvent = (eventType?: string) => {
  if (!eventType) return false
  if (eventType === 'write_blocked') return true
  if (eventType.includes('failed')) return true
  if (eventType.includes('rejected')) return true
  return false
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawLimit = searchParams.get('limit')
    const rawDays = searchParams.get('days')
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN
    const parsedDays = rawDays ? Number.parseInt(rawDays, 10) : Number.NaN
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT
    const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : DEFAULT_DAYS
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('task_executions_op')
      .select('execution_id, status, audit_log, created_at')
      .order('created_at', { ascending: false })
      .gte('created_at', sinceIso)
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'metrics_load_failed', details: error.message }, { status: 500 })
    }

    const rows = data || []
    const total = rows.length
    const statusCounts: Record<string, number> = {}
    const eventCounts: Record<string, number> = {}
    const eventCanonicalCounts: Record<string, number> = {}
    const failedReasonCounts: Record<string, number> = {}

    for (const row of rows) {
      const status = row.status || 'unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      const events = (row.audit_log?.events || []) as Array<{ event_type?: string; data?: Record<string, unknown>; timestamp?: string }>
      for (const rawEvent of events) {
        const ev = normalizeAuditEvent(
          {
            event_type: String(rawEvent?.event_type || 'unknown_event'),
            timestamp: rawEvent?.timestamp,
            data: rawEvent?.data || {},
          },
          row.execution_id
        )
        const key = ev?.event_type || 'unknown'
        eventCounts[key] = (eventCounts[key] || 0) + 1
        const canonicalKey = ev?.event_type_canonical || 'unknown'
        eventCanonicalCounts[canonicalKey] = (eventCanonicalCounts[canonicalKey] || 0) + 1
        if (isFailureEvent(key)) {
          const data = ev?.data || {}
          const reason =
            (data.reason as string | undefined) ||
            (data.error as string | undefined) ||
            (data.details as string | undefined) ||
            'unknown'
          failedReasonCounts[reason] = (failedReasonCounts[reason] || 0) + 1
        }
      }
    }

    const businessQuestionCounts: Record<string, number> = {}
    const businessErrorCounts: Record<string, number> = {}
    let businessTotal = 0

    const { data: businessData, error: businessError } = await supabase
      .from('data_query_logs')
      .select('question_type, data_sources, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!businessError && businessData) {
      businessTotal = businessData.length
      for (const row of businessData) {
        const qType = String(row.question_type || 'unknown')
        businessQuestionCounts[qType] = (businessQuestionCounts[qType] || 0) + 1
        const src = row.data_sources
        let parsed: Record<string, unknown> = {}
        if (typeof src === 'string') {
          try {
            parsed = JSON.parse(src)
          } catch {
            parsed = {}
          }
        } else if (src && typeof src === 'object') {
          parsed = src as Record<string, unknown>
        }
        const err = String(parsed.error_code || '')
        if (err) {
          businessErrorCounts[err] = (businessErrorCounts[err] || 0) + 1
        }
      }
    }

    return NextResponse.json({
      success: true,
      total,
      status_counts: statusCounts,
      event_counts: eventCounts,
      event_counts_canonical: eventCanonicalCounts,
      failed_reason_counts: failedReasonCounts,
      business_counts: {
        total: businessTotal,
        question_type_counts: businessQuestionCounts,
        error_code_counts: businessErrorCounts,
      },
      since: sinceIso,
      days,
    })
  } catch {
    return NextResponse.json({ error: 'metrics_failed' }, { status: 500 })
  }
}
