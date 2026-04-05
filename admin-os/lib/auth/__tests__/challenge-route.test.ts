import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveIdentityByEmail: vi.fn(),
  resolveIdentityByWallet: vi.fn(),
  issueEmailChallenge: vi.fn(),
  issueWalletChallenge: vi.fn(),
}))

vi.mock('@/lib/auth/identity-registry', () => ({
  resolveIdentityByEmail: mocks.resolveIdentityByEmail,
  resolveIdentityByWallet: mocks.resolveIdentityByWallet,
}))

vi.mock('@/lib/auth/runtime', () => ({
  issueEmailChallenge: mocks.issueEmailChallenge,
  issueWalletChallenge: mocks.issueWalletChallenge,
}))

import { POST } from '@/app/api/auth/challenge/route'

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('auth challenge route', () => {
  it('issues email challenge', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })
    mocks.issueEmailChallenge.mockResolvedValue({ challenge_id: 'email-auth-1', code_preview: '123456' })
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.challenge.challenge_id).toBe('email-auth-1')
  })

  it('issues wallet challenge', async () => {
    mocks.resolveIdentityByWallet.mockResolvedValue({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })
    mocks.issueWalletChallenge.mockResolvedValue({ challenge_id: 'wallet-auth-1', nonce: 'abc' })
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.challenge.challenge_id).toBe('wallet-auth-1')
  })

  it('rejects unknown identity', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue(null)
    const res = await POST(buildRequest({ mode: 'email', email: 'missing@example.com' }) as never)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('identity_not_found')
  })
})
