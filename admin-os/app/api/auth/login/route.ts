import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ success: false, error: 'auth_challenge_required' }, { status: 410 })
}
