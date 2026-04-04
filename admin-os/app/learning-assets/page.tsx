import { LearningAssetsSurface } from '@/components/learning-assets/learning-assets-surface'
import { loadLearningAssetSnapshot } from '@/lib/interaction-learning/derivation'

export const dynamic = 'force-dynamic'

export default async function LearningAssetsPage() {
  const snapshot = await loadLearningAssetSnapshot()
  return <LearningAssetsSurface snapshot={snapshot} />
}
