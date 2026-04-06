import { NextResponse } from 'next/server'

import { buildCustomerRuntimePolicyMeta, loadCustomerRuntimePolicy } from '@/lib/customers/runtime-policy'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customer_id')
  if (!customerId) {
    return NextResponse.json({ success: false, error: 'missing_customer_id' }, { status: 400 })
  }
  const runtimePolicy = await loadCustomerRuntimePolicy(customerId)
  return NextResponse.json({ success: true, preset: runtimePolicy?.workspace || null, runtime_policy: buildCustomerRuntimePolicyMeta(runtimePolicy), runtime_policy_full: runtimePolicy })
}
