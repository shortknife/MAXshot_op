import { supabase } from '@/lib/supabase'
import type { CustomerPolicyEvidence } from '@/lib/customers/runtime-policy'
import { normalizeCustomerPolicyEvidence } from '@/lib/customers/runtime-policy'

export type AuthEventItem = {
  event_id: string
  identity_id: string | null
  customer_id: string | null
  operator_id: string | null
  auth_method: 'email' | 'wallet'
  verification_method: 'email_code' | 'wallet_signature' | null
  outcome: 'issued' | 'verified' | 'failed'
  reason: string | null
  created_at: string
  customer_policy_evidence: CustomerPolicyEvidence | null
}

const AUTH_EVENTS_TABLE = 'auth_identity_events_op'

function normalize(items: Array<Record<string, unknown>>): AuthEventItem[] {
  return items.map((item): AuthEventItem => ({
    event_id: String(item.event_id || ''),
    identity_id: item.identity_id ? String(item.identity_id) : null,
    customer_id: item.customer_id ? String(item.customer_id) : null,
    operator_id: item.operator_id ? String(item.operator_id) : null,
    auth_method: String(item.auth_method || 'email') === 'wallet' ? 'wallet' : 'email',
    verification_method: item.verification_method === 'wallet_signature' ? 'wallet_signature' : item.verification_method === 'email_code' ? 'email_code' : null,
    outcome: String(item.outcome || 'issued') === 'verified' ? 'verified' : String(item.outcome || 'issued') === 'failed' ? 'failed' : 'issued',
    reason: item.reason ? String(item.reason) : null,
    created_at: String(item.created_at || ''),
    customer_policy_evidence: normalizeCustomerPolicyEvidence(item.meta && typeof item.meta === 'object' ? (item.meta as Record<string, unknown>).customer_policy_audit : null),
  })).filter((item) => item.event_id)
}

export async function loadRecentAuthEvents(identityId: string, limit = 6): Promise<AuthEventItem[]> {
  const normalized = String(identityId || '').trim()
  if (!normalized) return []
  try {
    const { data, error } = await supabase
      .from(AUTH_EVENTS_TABLE)
      .select('event_id, identity_id, customer_id, operator_id, auth_method, verification_method, outcome, reason, created_at, meta')
      .eq('identity_id', normalized)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !Array.isArray(data)) return []
    return normalize(data as Array<Record<string, unknown>>)
  } catch {
    return []
  }
}
