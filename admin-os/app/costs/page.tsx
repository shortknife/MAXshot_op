import { RuntimeCostSurface } from '@/components/runtime-cost/runtime-cost-surface'
import { decorateWithCustomerPolicyEvidence } from '@/lib/customers/runtime-policy'
import { loadRuntimeCostEvents } from '@/lib/runtime-cost/runtime'

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
  const runtime = await loadRuntimeCostEvents()
  const items = await decorateWithCustomerPolicyEvidence(runtime.items)
  return <RuntimeCostSurface source={runtime.source} items={items} />
}
