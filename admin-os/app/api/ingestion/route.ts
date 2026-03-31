import { NextRequest, NextResponse } from 'next/server'

import type { SourceSystem } from '@/lib/ingestion/contract'
import { runIngestion } from '@/lib/ingestion/runner'

function readSourceSystem(body: Record<string, unknown>, req: NextRequest): SourceSystem | null {
  const bodyValue = typeof body.source_system === 'string' ? body.source_system : null
  const headerValue = req.headers.get('x-source-system')
  const queryValue = req.nextUrl.searchParams.get('source_system')
  const value = bodyValue || headerValue || queryValue
  return value === 'native' || value === 'morpho' ? value : null
}

function readPayload(body: Record<string, unknown>): unknown {
  if ('payload' in body) return body.payload
  return body
}

function assertToken(req: NextRequest): string | null {
  const required = process.env.INGESTION_SHARED_TOKEN || ''
  if (!required) return null

  const header = req.headers.get('x-ingestion-token') || ''
  if (header === required) return null
  return 'invalid_ingestion_token'
}

export async function POST(req: NextRequest) {
  try {
    const tokenError = assertToken(req)
    if (tokenError) {
      return NextResponse.json({ success: false, error: tokenError }, { status: 401 })
    }

    const body = await req.json()
    const sourceSystem = readSourceSystem(body, req)
    if (!sourceSystem) {
      return NextResponse.json({ success: false, error: 'missing_source_system' }, { status: 400 })
    }

    const payload = readPayload(body)
    const result = await runIngestion(sourceSystem, payload)

    if (result.status === 'quarantined') {
      return NextResponse.json({
        success: false,
        status: 'quarantined',
        source_system: result.source_system,
        reasons: result.decision.findings,
        quarantine_record: result.quarantineRecord,
      }, { status: 202 })
    }

    return NextResponse.json({
      success: true,
      status: 'written',
      source_system: result.source_system,
      execution_id: result.factWrite?.execution_id || '',
      message: result.factWrite?.message || 'ingestion_written',
      decision: result.decision,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'unknown_ingestion_error',
    }, { status: 500 })
  }
}
