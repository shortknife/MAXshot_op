import { NextRequest, NextResponse } from 'next/server'

import { resolveIdentityByEmail, resolveIdentityByWallet } from '@/lib/auth/identity-registry'
import { buildAuthPostureMeta, loadCustomerAuthPosture } from '@/lib/customers/auth'
import { verifyEmailChallenge, verifyWalletChallenge } from '@/lib/auth/runtime'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = String(body.mode || '').trim()
  const challengeId = String(body.challenge_id || '').trim()
  if (!challengeId) return NextResponse.json({ success: false, error: 'missing_challenge_id' }, { status: 400 })

  if (mode === 'email') {
    const email = String(body.email || '').trim().toLowerCase()
    const code = String(body.code || '').trim()
    if (!email) return NextResponse.json({ success: false, error: 'missing_email' }, { status: 400 })
    if (!code) return NextResponse.json({ success: false, error: 'missing_code' }, { status: 400 })
    const identity = await resolveIdentityByEmail(email)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    try {
      const session = await verifyEmailChallenge(identity, challengeId, code)
      const authPosture = await loadCustomerAuthPosture(identity.customer_id)
      return NextResponse.json({ success: true, session, auth_posture: buildAuthPostureMeta(authPosture) })
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'email_verification_failed' }, { status: 403 })
    }
  }

  if (mode === 'wallet') {
    const walletAddress = String(body.wallet_address || '').trim()
    const signature = String(body.signature || '').trim()
    if (!walletAddress) return NextResponse.json({ success: false, error: 'missing_wallet_address' }, { status: 400 })
    if (!signature) return NextResponse.json({ success: false, error: 'missing_signature' }, { status: 400 })
    const identity = await resolveIdentityByWallet(walletAddress)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    try {
      const session = await verifyWalletChallenge(identity, challengeId, signature)
      const authPosture = await loadCustomerAuthPosture(identity.customer_id)
      return NextResponse.json({ success: true, session, auth_posture: buildAuthPostureMeta(authPosture) })
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'wallet_verification_failed' }, { status: 403 })
    }
  }

  return NextResponse.json({ success: false, error: 'unsupported_auth_mode' }, { status: 400 })
}
