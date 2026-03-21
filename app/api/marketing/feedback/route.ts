import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { assertWriteEnabled } from '@/lib/utils'
import { computeFeedbackSummary, MarketingTags } from '@/lib/marketing/analytics'
import { AuditLog } from '@/lib/types'
import { buildAuditEvent } from '@/lib/router/audit-event'

type FeedbackBody = {
  execution_id?: string
  operator_id?: string
  confirm_token?: string
  topic?: string
  style?: string
  channel?: string
  time_window?: string
  impressions?: number
  interactions?: number
  conversions?: number
}

function toSafeNumber(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.floor(num)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FeedbackBody
    const executionId = String(body.execution_id || '').trim()
    const operatorId = String(body.operator_id || '').trim()
    const confirmToken = String(body.confirm_token || '').trim()

    try {
      assertWriteEnabled({ operatorId, confirmToken })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'write_blocked' }, { status: 403 })
    }

    if (!executionId) {
      return NextResponse.json({ error: 'missing_execution_id' }, { status: 400 })
    }

    const tags: MarketingTags = {
      topic: String(body.topic || 'unknown'),
      style: String(body.style || 'neutral'),
      channel: String(body.channel || 'general'),
      time_window: String(body.time_window || 'all_day'),
    }
    const metrics = {
      impressions: toSafeNumber(body.impressions),
      interactions: toSafeNumber(body.interactions),
      conversions: toSafeNumber(body.conversions),
    }

    const feedback = computeFeedbackSummary({ ...tags, ...metrics })

    const { data: existing, error: loadError } = await supabase
      .from('task_executions_op')
      .select('audit_log')
      .eq('execution_id', executionId)
      .maybeSingle()

    if (loadError) {
      return NextResponse.json({ error: 'execution_load_failed', details: loadError.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'execution_not_found' }, { status: 404 })
    }

    const currentLog = (existing.audit_log as AuditLog | undefined) || {
      execution_id: executionId,
      events: [],
      created_at: new Date().toISOString(),
    }
    const now = new Date().toISOString()
    const events = [
      buildAuditEvent(executionId, {
        timestamp: now,
        event_type: 'marketing_feedback_recorded',
        data: {
          status: 'completed',
          operator_id: operatorId,
          ...tags,
          ...metrics,
          engagement_rate: feedback.engagement_rate,
          conversion_rate: feedback.conversion_rate,
        },
      }),
      buildAuditEvent(executionId, {
        timestamp: now,
        event_type: 'marketing_attribution_generated',
        data: {
          status: 'completed',
          performance_tier: feedback.performance_tier,
          reason_code: feedback.reason_code,
          recommendations: feedback.recommendations,
        },
      }),
    ]

    const auditLog: AuditLog = {
      execution_id: executionId,
      created_at: currentLog.created_at || now,
      events: [...(currentLog.events || []), ...events],
    }

    const { error: updateError } = await supabase
      .from('task_executions_op')
      .update({ audit_log: auditLog })
      .eq('execution_id', executionId)

    if (updateError) {
      return NextResponse.json({ error: 'execution_update_failed', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      execution_id: executionId,
      feedback: {
        ...tags,
        ...metrics,
        ...feedback,
      },
      events: ['marketing_feedback_recorded', 'marketing_attribution_generated'],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'marketing_feedback_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
