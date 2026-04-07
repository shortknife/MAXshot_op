import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveIdentityByEmail: vi.fn(),
  resolveIdentityByWallet: vi.fn(),
  verifyEmailChallenge: vi.fn(),
  verifyWalletChallenge: vi.fn(),
  loadCustomerRuntimePolicy: vi.fn(),
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
  beforeEach(() => {
    mocks.loadCustomerRuntimePolicy.mockResolvedValue({ customer_id: 'maxshot', policy_version: '1.5', primary_plane: 'ops_data', auth: { customer_id: 'maxshot', verification_posture: 'operator' } })
  })
  it('verifies email challenge', async () => {
    mocks.resolveIdentityByEmail.mockResolvedValue({ identity_id: 'maxshot-ops' })
    mocks.verifyEmailChallenge.mockResolvedValue({ identity_id: 'maxshot-ops', auth_method: 'email', verification_method: 'email_code', token: 'tok', timestamp: 1 })
    const res = await POST(buildRequest({ mode: 'email', email: 'ops@maxshot.ai', challenge_id: 'email-auth-1', code: '123456' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session.verification_method).toBe('email_code')
    expect(body.auth_posture.customer_id).toBe('maxshot')
    expect(body.auth_default_experience.customer_id).toBe('maxshot')
    expect(body.customer_policy_evidence.customer_id).toBe('maxshot')
  })

  it('verifies wallet challenge', async () => {
    mocks.resolveIdentityByWallet.mockResolvedValue({ identity_id: 'maxshot-ops' })
    mocks.verifyWalletChallenge.mockResolvedValue({ identity_id: 'maxshot-ops', auth_method: 'wallet', verification_method: 'wallet_signature', token: 'tok', timestamp: 1 })
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001', challenge_id: 'wallet-auth-1', signature: '0xsig' }) as never)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.session.verification_method).toBe('wallet_signature')
    expect(body.auth_posture.customer_id).toBe('maxshot')
    expect(body.customer_policy_evidence.customer_id).toBe('maxshot')
  })

  it('rejects wallet verify when customer disables wallet auth', async () => {
    mocks.resolveIdentityByWallet.mockResolvedValue({ identity_id: 'ops-auditor', customer_id: 'ops-observer' })
    mocks.loadCustomerRuntimePolicy.mockResolvedValue({ customer_id: 'ops-observer', policy_version: '1.5', primary_plane: 'ops_data', auth: { customer_id: 'ops-observer', verification_posture: 'audit', wallet_posture: 'disabled' } })
    const res = await POST(buildRequest({ mode: 'wallet', wallet_address: '0xBEEF000000000000000000000000000000000001', challenge_id: 'wallet-auth-1', signature: '0xsig' }) as never)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('wallet_auth_disabled')
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

vi.mock('@/lib/customers/runtime-policy', () => ({
  loadCustomerRuntimePolicy: mocks.loadCustomerRuntimePolicy,
  buildCustomerPolicyEvidence: (policy: { customer_id?: string; policy_version?: string; primary_plane?: string; auth?: { primary_auth_method?: string; verification_posture?: string } | null } | null | undefined) =>
    policy ? { customer_id: policy.customer_id || null, policy_version: policy.policy_version || null, primary_plane: policy.primary_plane || null, default_entry_path: null, summary: 'policy', auth_primary_method: policy.auth?.primary_auth_method || null, auth_verification_posture: policy.auth?.verification_posture || null, delivery_summary_style: null, review_escalation_style: null, clarification_style: null, focused_surfaces: [], recommended_route_order: [], preferred_capability_count: 0 } : null,
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
