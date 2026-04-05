import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadRecentAuthEvents: vi.fn(),
}))

vi.mock('@/lib/auth/events', () => ({
  loadRecentAuthEvents: mocks.loadRecentAuthEvents,
}))

import { GET } from '@/app/api/auth/events/route'

describe('auth events route', () => {
  it('returns recent auth events for identity', async () => {
    mocks.loadRecentAuthEvents.mockResolvedValue([{ event_id: 'auth-event-1', outcome: 'verified' }])
    const req = new Request('http://localhost/api/auth/events?identity_id=maxshot-ops')
    const res = await GET(req as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.items[0].event_id).toBe('auth-event-1')
  })

  it('requires identity_id', async () => {
    const req = new Request('http://localhost/api/auth/events')
    const res = await GET(req as never)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('missing_identity_id')
  })
})
