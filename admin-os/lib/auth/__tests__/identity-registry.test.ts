import { describe, expect, it } from 'vitest'

import { loadHybridIdentityRegistry, resolveIdentityByEmail, resolveIdentityByWallet } from '@/lib/auth/identity-registry'

describe('hybrid identity registry', () => {
  it('loads filesystem-managed identities', async () => {
    const registry = await loadHybridIdentityRegistry()
    expect(registry.length).toBeGreaterThanOrEqual(4)
    expect(registry.find((item) => item.identity_id === 'maxshot-ops')).toMatchObject({
      customer_id: 'maxshot',
      email: 'ops@maxshot.ai',
      operator_id: 'maxshot-ops',
    })
  })

  it('resolves email and wallet identities to the same linked record', async () => {
    const emailIdentity = await resolveIdentityByEmail('ops@maxshot.ai')
    const walletIdentity = await resolveIdentityByWallet('0xBEEF000000000000000000000000000000000001')

    expect(emailIdentity?.identity_id).toBe('maxshot-ops')
    expect(walletIdentity?.identity_id).toBe('maxshot-ops')
    expect(walletIdentity?.auth_methods).toContain('wallet')
  })
})
