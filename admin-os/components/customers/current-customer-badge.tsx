'use client'

import { getStoredSession } from '@/lib/auth'

export function CurrentCustomerBadge({ customerId }: { customerId: string }) {
  const session = getStoredSession()
  if (!session?.customer_id || session.customer_id !== customerId) return null
  return <span className="rounded-full border border-slate-300 bg-slate-900 px-3 py-1 text-xs text-white">current workspace</span>
}
