import { NextResponse } from 'next/server'
import { loadRecentAuthEvents } from '@/lib/auth/events'

export async function GET(request: Request) {
  const identityId = new URL(request.url).searchParams.get('identity_id') || ''
  if (!identityId.trim()) {
    return NextResponse.json({ success: false, error: 'missing_identity_id' }, { status: 400 })
  }
  const items = await loadRecentAuthEvents(identityId, 6)
  return NextResponse.json({ success: true, items })
}
