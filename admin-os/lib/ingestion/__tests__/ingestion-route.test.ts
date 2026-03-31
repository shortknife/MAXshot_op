import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  runIngestion: vi.fn(),
}))

vi.mock('@/lib/ingestion/runner', () => ({ runIngestion: mocks.runIngestion }))

import { POST } from '@/app/api/ingestion/route'

function buildRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/ingestion', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

describe('ingestion route', () => {
  it('rejects missing source_system', async () => {
    const res = await POST(buildRequest({ payload: { foo: 'bar' } }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('missing_source_system')
  })

  it('returns written payloads', async () => {
    mocks.runIngestion.mockResolvedValueOnce({
      status: 'written',
      source_system: 'native',
      payload: {},
      decision: { outcome: 'accepted', findings: [] },
      factWrite: { execution_id: 'exec-123', message: 'ok' },
    })

    const res = await POST(buildRequest({ source_system: 'native', payload: { cleaned_data: {} } }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('written')
    expect(body.execution_id).toBe('exec-123')
  })

  it('returns quarantined payloads as 202', async () => {
    mocks.runIngestion.mockResolvedValueOnce({
      status: 'quarantined',
      source_system: 'morpho',
      payload: {},
      decision: { outcome: 'quarantined', findings: [{ code: 'missing_market_name', severity: 'error', path: 'markets[0].market', message: 'required' }] },
      quarantineRecord: { source_system: 'morpho' },
    })

    const res = await POST(buildRequest({ source_system: 'morpho', payload: { cleaned_data: {} } }))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.status).toBe('quarantined')
    expect(body.source_system).toBe('morpho')
  })
})
