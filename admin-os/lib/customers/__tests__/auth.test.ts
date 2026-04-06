import { describe, expect, it } from 'vitest'

import { loadCustomerAuthPosture } from '@/lib/customers/auth'

describe('customer auth posture', () => {
  it('loads auth posture from filesystem markdown', async () => {
    const posture = await loadCustomerAuthPosture('nexa-demo')
    expect(posture).toMatchObject({
      customer_id: 'nexa-demo',
      primary_auth_method: 'wallet',
      verification_posture: 'guided',
      wallet_posture: 'identity_preferred',
    })
    expect(posture?.recovery_actions).toContain('改用 email 完成这次登录')
  })
})
