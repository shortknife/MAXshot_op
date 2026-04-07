import { decorateWithCustomerPolicyEvidence } from '@/lib/customers/runtime-policy'
import { loadInteractionLearningLogRuntime } from '@/lib/interaction-learning/runtime'
import { InteractionLogSurface } from '@/components/interaction-log/interaction-log-surface'

export const dynamic = 'force-dynamic'

export default async function InteractionLogPage() {
  const runtime = await loadInteractionLearningLogRuntime()
  const items = await decorateWithCustomerPolicyEvidence(runtime.items)
  return <InteractionLogSurface source={runtime.source} items={items} />
}
