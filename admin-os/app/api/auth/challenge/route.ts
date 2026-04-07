import { NextRequest, NextResponse } from 'next/server'

import { resolveIdentityByEmail, resolveIdentityByWallet } from '@/lib/auth/identity-registry'
import { buildCustomerAuthResponseMeta, buildCustomerPolicyEvidence, loadCustomerRuntimePolicy } from '@/lib/customers/runtime-policy'
import { issueEmailChallenge, issueWalletChallenge } from '@/lib/auth/runtime'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = String(body.mode || '').trim()

  if (mode === 'email') {
    const email = String(body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ success: false, error: 'missing_email' }, { status: 400 })
    const identity = await resolveIdentityByEmail(email)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    const runtimePolicy = await loadCustomerRuntimePolicy(identity.customer_id)
    const challenge = await issueEmailChallenge(identity, buildCustomerPolicyEvidence(runtimePolicy))
    if (!challenge) return NextResponse.json({ success: false, error: 'challenge_issue_failed' }, { status: 500 })
    return NextResponse.json({ success: true, challenge: { ...challenge, ...buildCustomerAuthResponseMeta(runtimePolicy) } })
  }

  if (mode === 'wallet') {
    const walletAddress = String(body.wallet_address || '').trim()
    if (!walletAddress) return NextResponse.json({ success: false, error: 'missing_wallet_address' }, { status: 400 })
    const identity = await resolveIdentityByWallet(walletAddress)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    const runtimePolicy = await loadCustomerRuntimePolicy(identity.customer_id)
    const challenge = await issueWalletChallenge(identity, buildCustomerPolicyEvidence(runtimePolicy))
    if (!challenge) return NextResponse.json({ success: false, error: 'challenge_issue_failed' }, { status: 500 })
    return NextResponse.json({ success: true, challenge: { ...challenge, ...buildCustomerAuthResponseMeta(runtimePolicy) } })
  }

  return NextResponse.json({ success: false, error: 'unsupported_auth_mode' }, { status: 400 })
}
