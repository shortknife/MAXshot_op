import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const loadInteractionLearningLogRuntime = vi.fn()
  const listActiveCustomers = vi.fn()
  const getPromptPolicyForCustomer = vi.fn()
  const loadActivePromptInventory = vi.fn()
  const loadPromptHistories = vi.fn()
  return {
    loadInteractionLearningLogRuntime,
    listActiveCustomers,
    getPromptPolicyForCustomer,
    loadActivePromptInventory,
    loadPromptHistories,
  }
})

vi.mock('@/lib/interaction-learning/runtime', () => ({
  loadInteractionLearningLogRuntime: mocks.loadInteractionLearningLogRuntime,
}))

vi.mock('@/lib/customers/runtime', () => ({
  listActiveCustomers: mocks.listActiveCustomers,
}))

vi.mock('@/lib/chat/prompt-policy', () => ({
  getPromptPolicyForCustomer: mocks.getPromptPolicyForCustomer,
}))

vi.mock('@/lib/prompts/prompt-registry', () => ({
  loadActivePromptInventory: mocks.loadActivePromptInventory,
  loadPromptHistories: mocks.loadPromptHistories,
}))

import { loadPromptGovernanceSnapshot } from '@/lib/prompts/governance'

describe('prompt governance snapshot', () => {
  beforeEach(() => {
    mocks.loadInteractionLearningLogRuntime.mockReset()
    mocks.listActiveCustomers.mockReset()
    mocks.getPromptPolicyForCustomer.mockReset()
    mocks.loadActivePromptInventory.mockReset()
    mocks.loadPromptHistories.mockReset()

    mocks.listActiveCustomers.mockReturnValue([
      { customer_id: 'maxshot' },
      { customer_id: 'ops-observer' },
    ])

    mocks.getPromptPolicyForCustomer.mockImplementation((customerId: string) => ({
      allow_local_stub_intent: false,
      allowed_intent_sources: ['filesystem_md'],
      allowed_execution_sources: ['filesystem_md'],
      execution_prompt_required_capabilities: ['capability.product_doc_qna'],
      customer_id: customerId,
    }))
  })

  it('builds snapshot from filesystem inventory and runtime rollups', async () => {
    mocks.loadActivePromptInventory.mockResolvedValue([
      {
        slug: 'product_doc_qna',
        name: 'Product Doc QnA',
        family: 'execution',
        description: 'doc prompt',
        version: '1',
        file_path: 'prompts/execution/product_doc_qna.v1.md',
        model_config: { provider: 'deepseek' },
        system_prompt: 'system',
        user_prompt_template: 'user',
      },
    ])

    mocks.loadPromptHistories.mockResolvedValue({
      product_doc_qna: [
        {
          slug: 'product_doc_qna',
          name: 'Product Doc QnA',
          version: '1',
          is_active: true,
          file_path: 'prompts/execution/product_doc_qna.v1.md',
        },
      ],
    })

    mocks.loadInteractionLearningLogRuntime.mockResolvedValue({
      source: 'supabase',
      items: [
        {
          meta: {
            prompt_runtime: {
              primary_prompt_slug: 'product_doc_qna',
              prompt_sources: ['filesystem_md'],
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
              prompt_sources: ['filesystem_md'],
            },
            prompt_policy: {
              outcome: 'review',
              reason: 'execution_prompt_required',
            },
          },
        },
      ],
    })

    const snapshot = await loadPromptGovernanceSnapshot()

    expect(snapshot.source).toBe('filesystem_md')
    expect(snapshot.prompts).toHaveLength(1)
    expect(snapshot.prompts[0]?.editable).toBe(false)
    expect(snapshot.runtime.recent_logs).toBe(2)
    expect(snapshot.runtime.policy_allow).toBe(1)
    expect(snapshot.runtime.policy_review).toBe(1)
    expect(snapshot.runtime.filesystem_prompt_count).toBe(2)
    expect(snapshot.runtime.primary_prompt_mix[0]).toEqual({ slug: 'product_doc_qna', count: 2 })
    expect(snapshot.runtime.policy_reason_mix[0]).toEqual({ reason: 'execution_prompt_required', count: 1 })
    expect(snapshot.histories.product_doc_qna?.[0]).toMatchObject({ version: '1', is_active: true })
    expect(snapshot.release_events).toEqual([])
    expect(snapshot.policy[1]).toMatchObject({
      customer_id: 'ops-observer',
      allowed_intent_sources: ['filesystem_md'],
    })
  })
})
