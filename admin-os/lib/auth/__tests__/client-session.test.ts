import { describe, expect, it } from 'vitest'

import { getSessionDefaultEntryPath, isSurfaceAllowed, type IdentitySession } from '@/lib/auth'

const baseSession: IdentitySession = {
  identity_id: 'maxshot-ops',
  customer_id: 'maxshot',
  display_name: 'MAXshot Ops',
  role: 'operator',
  operator_id: 'maxshot-ops',
  email: 'ops@maxshot.ai',
  wallet_address: null,
  auth_method: 'email',
  verification_method: 'email_code',
  linked_methods: ['email'],
  token: 'tok',
  timestamp: 1,
}

describe('auth client session helpers', () => {
  it('prefers customer policy entry path when present', () => {
    expect(getSessionDefaultEntryPath({
      ...baseSession,
      customer_policy_evidence: {
        customer_id: 'maxshot',
        policy_version: '1.5',
        summary: 'policy',
        primary_plane: 'ops_data',
        default_entry_path: '/operations',
        auth_primary_method: 'email',
        auth_verification_posture: 'operator',
        delivery_summary_style: null,
        review_escalation_style: null,
        clarification_style: null,
        focused_surfaces: ['chat', 'costs'],
        recommended_route_order: ['ops_data'],
        preferred_capability_count: 2,
      },
    })).toBe('/operations')
  })

  it('falls back to chat when no policy evidence exists', () => {
    expect(getSessionDefaultEntryPath(baseSession)).toBe('/chat')
  })

  it('allows unrestricted access when no focused surfaces exist', () => {
    expect(isSurfaceAllowed(baseSession, 'prompts')).toBe(true)
  })

  it('enforces focused surfaces when policy evidence exists', () => {
    const session = {
      ...baseSession,
      customer_policy_evidence: {
        customer_id: 'maxshot',
        policy_version: '1.5',
        summary: 'policy',
        primary_plane: 'ops_data',
        default_entry_path: '/chat',
        auth_primary_method: 'email',
        auth_verification_posture: 'operator',
        delivery_summary_style: null,
        review_escalation_style: null,
        clarification_style: null,
        focused_surfaces: ['chat', 'kb-management'],
        recommended_route_order: ['ops_data'],
        preferred_capability_count: 2,
      },
    } satisfies IdentitySession

    expect(isSurfaceAllowed(session, 'kb-management')).toBe(true)
    expect(isSurfaceAllowed(session, 'prompts')).toBe(false)
  })
})
