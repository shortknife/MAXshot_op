import { NextRequest, NextResponse } from 'next/server'

import { resolveIdentityByEmail, resolveIdentityByWallet } from '@/lib/auth/identity-registry'

function buildSession(identity: Awaited<ReturnType<typeof resolveIdentityByEmail>> | Awaited<ReturnType<typeof resolveIdentityByWallet>>, authMethod: 'email' | 'wallet') {
  if (!identity) return null
  return {
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    display_name: identity.display_name,
    role: identity.role,
    operator_id: identity.operator_id,
    email: identity.email,
    wallet_address: identity.wallet_address,
    auth_method: authMethod,
    linked_methods: identity.auth_methods,
    token: `${identity.identity_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = String(body.mode || '').trim()

  if (mode === 'email') {
    const email = String(body.email || '').trim()
    if (!email) return NextResponse.json({ success: false, error: 'missing_email' }, { status: 400 })
    const identity = await resolveIdentityByEmail(email)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    return NextResponse.json({ success: true, session: buildSession(identity, 'email') })
  }

  if (mode === 'wallet') {
    const walletAddress = String(body.wallet_address || '').trim()
    if (!walletAddress) return NextResponse.json({ success: false, error: 'missing_wallet_address' }, { status: 400 })
    const identity = await resolveIdentityByWallet(walletAddress)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    return NextResponse.json({ success: true, session: buildSession(identity, 'wallet') })
  }

  return NextResponse.json({ success: false, error: 'unsupported_auth_mode' }, { status: 400 })
}
