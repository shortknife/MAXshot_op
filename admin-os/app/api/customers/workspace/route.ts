import { NextResponse } from 'next/server'

import { loadCustomerWorkspacePreset } from '@/lib/customers/workspace'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  if (!customerId) {
    return NextResponse.json({ success: false, error: 'missing_customer_id' }, { status: 400 })
  }
  const preset = await loadCustomerWorkspacePreset(customerId)
  return NextResponse.json({ success: true, preset })
}
