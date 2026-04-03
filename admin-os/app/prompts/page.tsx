import { PromptGovernanceSurface } from '@/components/prompts/prompt-governance-surface'
import { loadPromptGovernanceSnapshot } from '@/lib/prompts/governance'

export const dynamic = 'force-dynamic'

export default async function PromptsPage() {
  const snapshot = await loadPromptGovernanceSnapshot()
  return <PromptGovernanceSurface snapshot={snapshot} />
}
