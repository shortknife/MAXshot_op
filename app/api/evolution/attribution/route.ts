import { NextResponse } from 'next/server'
import { buildAttribution } from '../../@/lib/evolution/attribution'
import { buildAuditEvent } from '@/lib/router/audit-event'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = body?.result || null
    const audit_log = body?.audit_log || null
    const executionId = String(body?.execution_id || 'unknown_execution')
    const attribution = buildAttribution({ result, audit_log })
    const auditEvents = [
      buildAuditEvent(executionId, { event_type: 'attribution_generated', data: { status: 'completed' } }),
      buildAuditEvent(executionId, { event_type: 'recommendation_generated', data: { status: 'completed' } }),
    ]
    return NextResponse.json({ attribution, audit_events: auditEvents })
  } catch {
    return NextResponse.json({ error: 'attribution_failed' }, { status: 500 })
  }
}
