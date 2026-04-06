import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadLearningAssetSnapshot: vi.fn(),
}))

vi.mock('@/lib/interaction-learning/derivation', () => ({
  loadLearningAssetSnapshot: mocks.loadLearningAssetSnapshot,
}))

import { loadCustomerMemoryAsset, loadCustomerWalletAsset } from '@/lib/customers/asset-runtime'
import { buildCustomerLongTermMemory } from '@/lib/customers/memory'

describe('customer asset runtime', () => {
  beforeEach(() => {
    mocks.loadLearningAssetSnapshot.mockReset()
    mocks.loadLearningAssetSnapshot.mockResolvedValue({
      source: 'supabase',
      generated_at: '2026-04-04T00:00:00.000Z',
      totals: { interactions: 3, hard_cases: 1, capability_candidates: 2, customers: 1, prompt_policy_issues: 0 },
      hard_cases: [],
      capability_candidates: [],
      customer_profiles: [
        {
          customer_id: 'maxshot',
          total_interactions: 3,
          top_planes: [{ plane: 'ops_data', count: 2 }],
          top_capabilities: [{ capability_id: 'capability.data_fact_query', count: 2 }],
          top_issue_reasons: [{ reason: 'review_required', count: 1 }],
        },
      ],
      prompt_policy_issues: [],
    })
  })

  it('loads memory and wallet assets from filesystem markdown', async () => {
    const memory = await loadCustomerMemoryAsset('maxshot')
    const wallet = await loadCustomerWalletAsset('maxshot')

    expect(memory).toMatchObject({
      customer_id: 'maxshot',
      response_style: 'concise_operational',
    })
    expect(memory?.preferred_planes).toContain('ops_data')
    expect(memory?.recall_priority).toBe('customer_first')
    expect(memory?.recall_focus_tags).toContain('vault')
    expect(wallet).toMatchObject({
      customer_id: 'maxshot',
      wallet_mode: 'manual_review',
      status: 'active',
      settlement_asset: 'USDC',
    })
    expect(wallet?.supported_actions).toContain('agent_payment_preview')
  })

  it('builds customer long-term memory from static assets plus runtime learning snapshot', async () => {
    const ref = await buildCustomerLongTermMemory('maxshot')
    expect(ref).toBeTruthy()
    expect(ref).toMatchObject({
      memory_origin: 'customer_profile',
      type: 'insight',
    })
    expect((ref?.content as { customer_id?: string }).customer_id).toBe('maxshot')
    expect((ref?.content as { preferred_planes?: string[] }).preferred_planes).toContain('ops_data')
    expect((ref as { recall_priority?: string } | null)?.recall_priority).toBe('customer_first')
  })
})
