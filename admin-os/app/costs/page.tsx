import { RuntimeCostSurface } from '@/components/runtime-cost/runtime-cost-surface'
import { loadRuntimeCostEvents } from '@/lib/runtime-cost/runtime'

export const dynamic = 'force-dynamic'

export default async function CostsPage() {
  const runtime = await loadRuntimeCostEvents()
  return <RuntimeCostSurface source={runtime.source} items={runtime.items} />
}
