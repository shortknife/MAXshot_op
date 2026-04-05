import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Wallet } from 'ethers'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import { issueEmailChallenge, issueWalletChallenge, verifyEmailChallenge, verifyWalletChallenge } from '@/lib/auth/runtime'

const identity = {
  identity_id: 'maxshot-ops',
  customer_id: 'maxshot',
  display_name: 'MAXshot Ops',
  role: 'operator',
  status: 'active',
  email: 'ops@maxshot.ai',
  wallet_address: '0xBEEF000000000000000000000000000000000001'.toLowerCase(),
  auth_methods: ['email', 'wallet'] as Array<'email' | 'wallet'>,
  operator_id: 'maxshot-ops',
  summary: 'test',
  file_path: 'identity-assets/maxshot-ops.md',
}

beforeEach(() => {
  mocks.from.mockReset()
  mocks.insert.mockReset()
  mocks.select.mockReset()
  mocks.eq.mockReset()
  mocks.maybeSingle.mockReset()
  mocks.update.mockReset()
  mocks.updateEq.mockReset()
  mocks.from.mockImplementation(() => ({
    insert: mocks.insert.mockResolvedValue({ error: null }),
    select: mocks.select.mockReturnValue({
      eq: mocks.eq.mockReturnValue({
        maybeSingle: mocks.maybeSingle,
      }),
    }),
    update: mocks.update.mockReturnValue({
      eq: mocks.updateEq.mockResolvedValue({ error: null }),
    }),
  }))
})

describe('auth runtime', () => {
  it('issues email challenge with preview code', async () => {
    const result = await issueEmailChallenge(identity)
    expect(result?.challenge_id).toContain('email-auth-')
    expect(result?.code_preview).toHaveLength(6)
    expect(mocks.insert).toHaveBeenCalled()
  })

  it('verifies email challenge with matching code', async () => {
    const issued = await issueEmailChallenge(identity)
    const challengeInsert = mocks.insert.mock.calls[0]?.[0]
    mocks.maybeSingle.mockResolvedValue({ data: challengeInsert, error: null })
    const session = await verifyEmailChallenge(identity, issued!.challenge_id, issued!.code_preview)
    expect(session.identity_id).toBe('maxshot-ops')
    expect(session.verification_method).toBe('email_code')
  })

  it('verifies wallet signature against challenge message', async () => {
    const wallet = new Wallet('0x59c6995e998f97a5a0044966f0945382d7e7b7e53d8f5309f13f776d15e0f2f6')
    const walletIdentity = { ...identity, wallet_address: wallet.address.toLowerCase() }
    const issued = await issueWalletChallenge(walletIdentity)
    const challengeInsert = mocks.insert.mock.calls[0]?.[0]
    mocks.maybeSingle.mockResolvedValue({ data: challengeInsert, error: null })
    const signature = await wallet.signMessage(issued!.message)
    const session = await verifyWalletChallenge(walletIdentity, issued!.challenge_id, signature)
    expect(session.identity_id).toBe('maxshot-ops')
    expect(session.verification_method).toBe('wallet_signature')
  })
})
