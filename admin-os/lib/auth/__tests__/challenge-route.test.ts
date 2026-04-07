import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveIdentityByEmail: vi.fn(),
  resolveIdentityByWallet: vi.fn(),
  issueEmailChallenge: vi.fn(),
  issueWalletChallenge: vi.fn(),
  loadCustomerRuntimePolicy: vi.fn(),
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
  beforeEach(() => {
    mocks.loadCustomerRuntimePolicy.mockResolvedValue({ customer_id: 'maxshot', policy_version: '1.5', primary_plane: 'ops_data', auth: { customer_id: 'maxshot', verification_posture: 'operator' } })
  })
  it('issues email challenge', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })
    mocks.issueEmailChallenge.mockResolvedValue({ challenge_id: 'email-auth-1', code_preview: '123456' })
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.challenge.challenge_id).toBe('email-auth-1')
    expect(body.challenge.auth_posture.customer_id).toBe('maxshot')
    expect(body.challenge.auth_default_experience.customer_id).toBe('maxshot')
    expect(body.challenge.customer_policy_evidence.customer_id).toBe('maxshot')
  })

  it('issues wallet challenge', async () => {
    mocks.resolveIdentityByWallet.mockResolvedValue({ identity_id: 'maxshot-ops', customer_id: 'maxshot' })
    mocks.issueWalletChallenge.mockResolvedValue({ challenge_id: 'wallet-auth-1', nonce: 'abc' })
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.challenge.challenge_id).toBe('wallet-auth-1')
    expect(body.challenge.auth_posture.customer_id).toBe('maxshot')
    expect(body.challenge.customer_policy_evidence.customer_id).toBe('maxshot')
  })

  it('rejects unknown identity', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue(null)
    const res = await POST(buildRequest({ mode: 'email', email: 'missing@example.com' }) as never)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('identity_not_found')
  })
})

vi.mock('@/lib/customers/runtime-policy', () => ({
  loadCustomerRuntimePolicy: mocks.loadCustomerRuntimePolicy,
  buildCustomerAuthResponseMeta: (policy: { auth?: { customer_id?: string; verification_posture?: string; primary_auth_method?: string; wallet_posture?: string; summary?: string | null; entry_hint?: string | null; recovery_actions?: string[] } | null; customer_id?: string; policy_version?: string; primary_plane?: string } | null | undefined) => ({
    auth_posture: policy?.auth || null,
    auth_default_experience: policy?.auth ? {
      customer_id: policy.customer_id || null,
      policy_version: policy.policy_version || null,
      primary_plane: policy.primary_plane || null,
      primary_auth_method: policy.auth.primary_auth_method || null,
      verification_posture: policy.auth.verification_posture || null,
      wallet_posture: policy.auth.wallet_posture || null,
      summary: policy.auth.summary || null,
      entry_hint: policy.auth.entry_hint || null,
      recovery_actions: policy.auth.recovery_actions || [],
    } : null,
    customer_runtime_policy: policy ? { customer_id: policy.customer_id || null, policy_version: policy.policy_version || null, primary_plane: policy.primary_plane || null } : null,
    customer_policy_evidence: policy ? { customer_id: policy.customer_id || null, policy_version: policy.policy_version || null, primary_plane: policy.primary_plane || null, default_entry_path: null, summary: 'policy', auth_primary_method: policy.auth?.primary_auth_method || null, auth_verification_posture: policy.auth?.verification_posture || null, delivery_summary_style: null, review_escalation_style: null, clarification_style: null, focused_surfaces: [], recommended_route_order: [], preferred_capability_count: 0 } : null,
  }),
}))
