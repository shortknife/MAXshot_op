import { loadInteractionLearningLogRuntime } from '@/lib/interaction-learning/runtime'
import { InteractionLogSurface } from '@/components/interaction-log/interaction-log-surface'

export const dynamic = 'force-dynamic'

export default async function InteractionLogPage() {
  const runtime = await loadInteractionLearningLogRuntime()
  return <InteractionLogSurface source={runtime.source} items={runtime.items} />
}
