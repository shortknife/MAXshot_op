import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  inFn: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  buildInteractionLearningMemory: vi.fn(),
  buildCustomerLongTermMemory: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

vi.mock('@/lib/interaction-learning/memory', () => ({
  buildInteractionLearningMemory: mocks.buildInteractionLearningMemory,
}))

vi.mock('@/lib/customers/memory', () => ({
  buildCustomerLongTermMemory: mocks.buildCustomerLongTermMemory,
}))

import { createWorkingMind, selectMemories } from '@/lib/router/memory-selection'

describe('memory selection', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.select.mockReset()
    mocks.inFn.mockReset()
    mocks.order.mockReset()
    mocks.limit.mockReset()
    mocks.buildInteractionLearningMemory.mockReset()
    mocks.buildCustomerLongTermMemory.mockReset()
  })

  it('merges stored memories with interaction-derived memories', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        in: mocks.inFn.mockReturnValue({
          order: mocks.order.mockReturnValue({
            limit: mocks.limit.mockResolvedValue({
              data: [{ id: 'mem-1', type: 'foundation', content: { note: 'faq account access' }, weight: 0.6, confidence: 0.7 }],
              error: null,
            }),
          }),
        }),
      }),
    })
    mocks.buildInteractionLearningMemory.mockResolvedValue([
      {
        id: 'ilog:1',
        type: 'experience',
        memory_origin: 'interaction_learning',
        weight: 0.7,
        confidence: 0.9,
        content: { summary: 'faq password reset' },
      },
    ])

    mocks.buildCustomerLongTermMemory.mockResolvedValue({
      id: 'customer-memory:maxshot',
      type: 'insight',
      memory_origin: 'customer_profile',
      weight: 0.88,
      confidence: 0.84,
      content: { summary: 'prefers faq account answers' },
    })

    const refs = await selectMemories(['foundation'], ['faq', 'password'], 'maxshot')
    const workingMind = createWorkingMind(refs)

    expect(refs.length).toBe(3)
    expect(workingMind.source_policy).toBe('hybrid_learning')
    expect(workingMind.learning_ref_count).toBe(1)
    expect(workingMind.customer_ref_count).toBe(1)
  })
})
