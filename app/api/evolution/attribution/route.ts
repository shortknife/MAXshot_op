import { NextResponse } from 'next/server'
import { buildAttribution } from '../../../../../server-actions/evolution/attribution'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = body?.result || null
    const audit_log = body?.audit_log || null
    const attribution = buildAttribution({ result, audit_log })
    const auditEvents = [
      { timestamp: new Date().toISOString(), event_type: 'attribution_generated', data: { execution_id: body?.execution_id || null } },
      { timestamp: new Date().toISOString(), event_type: 'recommendation_generated', data: { execution_id: body?.execution_id || null } },
    ]
    return NextResponse.json({ attribution, audit_events: auditEvents })
  } catch {
    return NextResponse.json({ error: 'attribution_failed' }, { status: 500 })
  }
}
