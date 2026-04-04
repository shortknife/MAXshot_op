import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/auth/login/route'

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('auth login route', () => {
  it('creates a session from email identity', async () => {
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session).toMatchObject({
      identity_id: 'maxshot-ops',
      customer_id: 'maxshot',
      auth_method: 'email',
    })
  })

  it('creates a session from wallet identity', async () => {
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session).toMatchObject({
      identity_id: 'maxshot-ops',
      customer_id: 'maxshot',
      auth_method: 'wallet',
    })
  })

  it('rejects unknown identities', async () => {
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0x0000000000000000000000000000000000000001' }) as never)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.success).toBe(false)
    expect(body.error).toBe('identity_not_found')
  })
})
