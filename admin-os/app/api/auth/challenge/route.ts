import { NextRequest, NextResponse } from 'next/server'

import { resolveIdentityByEmail, resolveIdentityByWallet } from '@/lib/auth/identity-registry'
import { issueEmailChallenge, issueWalletChallenge } from '@/lib/auth/runtime'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = String(body.mode || '').trim()

  if (mode === 'email') {
    const email = String(body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ success: false, error: 'missing_email' }, { status: 400 })
    const identity = await resolveIdentityByEmail(email)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    const challenge = await issueEmailChallenge(identity)
    if (!challenge) return NextResponse.json({ success: false, error: 'challenge_issue_failed' }, { status: 500 })
    return NextResponse.json({ success: true, challenge })
  }

  if (mode === 'wallet') {
    const walletAddress = String(body.wallet_address || '').trim()
    if (!walletAddress) return NextResponse.json({ success: false, error: 'missing_wallet_address' }, { status: 400 })
    const identity = await resolveIdentityByWallet(walletAddress)
    if (!identity) return NextResponse.json({ success: false, error: 'identity_not_found' }, { status: 403 })
    const challenge = await issueWalletChallenge(identity)
    if (!challenge) return NextResponse.json({ success: false, error: 'challenge_issue_failed' }, { status: 500 })
    return NextResponse.json({ success: true, challenge })
  }

  return NextResponse.json({ success: false, error: 'unsupported_auth_mode' }, { status: 400 })
}
