import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const eq = vi.fn()
  const order = vi.fn()
  const select = vi.fn()
  const from = vi.fn()
  const loadInteractionLearningLogRuntime = vi.fn()
  const listActiveCustomers = vi.fn()
  const getPromptPolicyForCustomer = vi.fn()
  const loadPromptVersionHistory = vi.fn()
  const loadPromptReleaseEvents = vi.fn()
  return {
    eq,
    order,
    select,
    from,
    loadInteractionLearningLogRuntime,
    listActiveCustomers,
    getPromptPolicyForCustomer,
    loadPromptVersionHistory,
    loadPromptReleaseEvents,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

vi.mock('@/lib/interaction-learning/runtime', () => ({
  loadInteractionLearningLogRuntime: mocks.loadInteractionLearningLogRuntime,
}))

vi.mock('@/lib/customers/runtime', () => ({
  listActiveCustomers: mocks.listActiveCustomers,
}))

vi.mock('@/lib/chat/prompt-policy', () => ({
  getPromptPolicyForCustomer: mocks.getPromptPolicyForCustomer,
}))

vi.mock('@/lib/prompts/release', () => ({
  loadPromptVersionHistory: mocks.loadPromptVersionHistory,
  loadPromptReleaseEvents: mocks.loadPromptReleaseEvents,
}))

import { loadPromptGovernanceSnapshot } from '@/lib/prompts/governance'

describe('prompt governance snapshot', () => {
  beforeEach(() => {
    mocks.eq.mockReset()
    mocks.order.mockReset()
    mocks.select.mockReset()
    mocks.from.mockReset()
    mocks.loadInteractionLearningLogRuntime.mockReset()
    mocks.listActiveCustomers.mockReset()
    mocks.getPromptPolicyForCustomer.mockReset()
    mocks.loadPromptVersionHistory.mockReset()
    mocks.loadPromptReleaseEvents.mockReset()

    mocks.eq.mockReturnValue({ order: mocks.order })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ select: mocks.select })

    mocks.listActiveCustomers.mockReturnValue([
      { customer_id: 'maxshot' },
      { customer_id: 'ops-observer' },
    ])

    mocks.getPromptPolicyForCustomer.mockImplementation((customerId: string) => ({
      allow_local_stub_intent: customerId !== 'ops-observer',
      allowed_intent_sources: customerId === 'ops-observer' ? ['supabase'] : ['local_stub', 'supabase'],
      allowed_execution_sources: ['supabase', 'fallback_csv'],
      execution_prompt_required_capabilities: ['capability.product_doc_qna'],
    }))

    mocks.loadPromptVersionHistory.mockResolvedValue({})
    mocks.loadPromptReleaseEvents.mockResolvedValue([])
  })

  it('builds snapshot from supabase inventory and runtime rollups', async () => {
    mocks.order.mockResolvedValue({
      data: [
        {
          slug: 'product_doc_qna',
          name: 'Product Doc QnA',
          system_prompt: 'system',
          user_prompt_template: 'user',
          model_config: { provider: 'deepseek' },
          description: 'doc prompt',
          version: '7',
          updated_at: '2026-04-03T10:00:00.000Z',
        },
      ],
      error: null,
    })

    mocks.loadInteractionLearningLogRuntime.mockResolvedValue({
      source: 'supabase',
      items: [
        {
          meta: {
            prompt_runtime: {
              primary_prompt_slug: 'product_doc_qna',
              prompt_sources: ['local_stub', 'supabase'],
            },
            prompt_policy: {
              outcome: 'allow',
              reason: null,
            },
          },
        },
        {
          meta: {
            prompt_runtime: {
              primary_prompt_slug: 'product_doc_qna',
              prompt_sources: ['supabase'],
            },
            prompt_policy: {
              outcome: 'review',
              reason: 'intent_prompt_source_not_allowed',
            },
          },
        },
      ],
    })

    mocks.loadPromptVersionHistory.mockResolvedValue({
      product_doc_qna: [
        {
          slug: 'product_doc_qna',
          name: 'Product Doc QnA',
          version: '7',
          is_active: true,
          updated_at: '2026-04-03T10:00:00.000Z',
          updated_by: 'platform-admin',
          editable: true,
          action_hint: 'none',
        },
        {
          slug: 'product_doc_qna',
          name: 'Product Doc QnA',
          version: '6',
          is_active: false,
          updated_at: '2026-04-02T10:00:00.000Z',
          updated_by: 'platform-admin',
          editable: true,
          action_hint: 'rollback',
        },
      ],
    })

    mocks.loadPromptReleaseEvents.mockResolvedValue([
      {
        event_id: 'release-1',
        slug: 'product_doc_qna',
        action: 'release',
        target_version: '7',
        previous_version: '6',
        operator_id: 'platform-admin',
        release_note: 'Promote v7',
        created_at: '2026-04-03T10:10:00.000Z',
      },
    ])

    const snapshot = await loadPromptGovernanceSnapshot()

    expect(snapshot.source).toBe('supabase')
    expect(snapshot.prompts).toHaveLength(1)
    expect(snapshot.prompts[0]?.editable).toBe(true)
    expect(snapshot.runtime.recent_logs).toBe(2)
    expect(snapshot.runtime.policy_allow).toBe(1)
    expect(snapshot.runtime.policy_review).toBe(1)
    expect(snapshot.runtime.local_stub_intent_count).toBe(1)
    expect(snapshot.runtime.primary_prompt_mix[0]).toEqual({ slug: 'product_doc_qna', count: 2 })
    expect(snapshot.runtime.policy_reason_mix[0]).toEqual({ reason: 'intent_prompt_source_not_allowed', count: 1 })
    expect(snapshot.histories.product_doc_qna?.[1]).toMatchObject({ version: '6', action_hint: 'rollback' })
    expect(snapshot.release_events).toHaveLength(1)
    expect(snapshot.policy[1]).toMatchObject({
      customer_id: 'ops-observer',
      allow_local_stub_intent: false,
      allowed_intent_sources: ['supabase'],
    })
  })

  it('falls back to local config when supabase inventory is unavailable', async () => {
    mocks.order.mockResolvedValue({ data: null, error: new Error('unavailable') })
    mocks.loadInteractionLearningLogRuntime.mockResolvedValue({ source: 'empty', items: [] })

    const snapshot = await loadPromptGovernanceSnapshot()

    expect(snapshot.source).toBe('local_config')
    expect(snapshot.prompts.length).toBeGreaterThan(0)
    expect(snapshot.prompts.every((prompt) => prompt.editable === false)).toBe(true)
    expect(snapshot.release_events).toEqual([])
    expect(Object.values(snapshot.histories).every((items) => items[0]?.editable === false)).toBe(true)
  })
})
