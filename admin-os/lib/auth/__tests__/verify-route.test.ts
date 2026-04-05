import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveIdentityByEmail: vi.fn(),
  resolveIdentityByWallet: vi.fn(),
  verifyEmailChallenge: vi.fn(),
  verifyWalletChallenge: vi.fn(),
}))

vi.mock('@/lib/auth/identity-registry', () => ({
  resolveIdentityByEmail: mocks.resolveIdentityByEmail,
  resolveIdentityByWallet: mocks.resolveIdentityByWallet,
}))

vi.mock('@/lib/auth/runtime', () => ({
  verifyEmailChallenge: mocks.verifyEmailChallenge,
  verifyWalletChallenge: mocks.verifyWalletChallenge,
}))

import { POST } from '@/app/api/auth/verify/route'

function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('auth verify route', () => {
  it('verifies email challenge', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue({ identity_id: 'maxshot-ops' })
    mocks.verifyEmailChallenge.mockResolvedValue({ identity_id: 'maxshot-ops', auth_method: 'email', verification_method: 'email_code', token: 'tok', timestamp: 1 })
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai', challenge_id: 'email-auth-1', code: '123456' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session.verification_method).toBe('email_code')
  })

  it('verifies wallet challenge', async () => {
    mocks.resolveIdentityByWallet.mockResolvedValue({ identity_id: 'maxshot-ops' })
    mocks.verifyWalletChallenge.mockResolvedValue({ identity_id: 'maxshot-ops', auth_method: 'wallet', verification_method: 'wallet_signature', token: 'tok', timestamp: 1 })
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001', challenge_id: 'wallet-auth-1', signature: '0xsig' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session.verification_method).toBe('wallet_signature')
  })

  it('returns verifier errors as 403', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue({ identity_id: 'maxshot-ops' })
    mocks.verifyEmailChallenge.mockRejectedValue(new Error('invalid_code'))
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai', challenge_id: 'email-auth-1', code: '000000' }) as never)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('invalid_code')
  })
})
