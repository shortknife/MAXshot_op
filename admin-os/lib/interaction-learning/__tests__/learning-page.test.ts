import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadLearningAssetSnapshot: vi.fn(),
}))

vi.mock('@/lib/interaction-learning/derivation', () => ({
  loadLearningAssetSnapshot: mocks.loadLearningAssetSnapshot,
}))

import LearningAssetsPage from '@/app/learning-assets/page'

describe('learning assets page', () => {
  beforeEach(() => {
    mocks.loadLearningAssetSnapshot.mockReset()
  })

  it('renders the surface with snapshot data', async () => {
    mocks.loadLearningAssetSnapshot.mockResolvedValue({
      source: 'supabase',
      generated_at: '2026-04-04T10:00:00.000Z',
      totals: { interactions: 10, hard_cases: 2, capability_candidates: 3, customers: 1, prompt_policy_issues: 1 },
      hard_cases: [],
      capability_candidates: [],
      customer_profiles: [],
      prompt_policy_issues: [],
    })

    const element = await LearningAssetsPage()
    expect(element).toBeTruthy()
  })
})
