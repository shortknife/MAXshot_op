import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const from = vi.fn()
  const assertOperatorPlatformAccess = vi.fn()
  const assertCapabilityMutationPolicy = vi.fn()
  const acquireWriteLane = vi.fn()
  const releaseWriteLane = vi.fn()
  return {
    from,
    assertOperatorPlatformAccess,
    assertCapabilityMutationPolicy,
    acquireWriteLane,
    releaseWriteLane,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

vi.mock('@/lib/customers/access', () => ({
  assertOperatorPlatformAccess: mocks.assertOperatorPlatformAccess,
}))

vi.mock('@/lib/router/capability-policy', () => ({
  assertCapabilityMutationPolicy: mocks.assertCapabilityMutationPolicy,
}))

vi.mock('@/lib/router/write-lane', () => ({
  acquireWriteLane: mocks.acquireWriteLane,
  releaseWriteLane: mocks.releaseWriteLane,
}))

import { loadPromptVersionHistory, releasePromptVersion } from '@/lib/prompts/release'

describe('prompt release runtime', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.assertOperatorPlatformAccess.mockReset()
    mocks.assertCapabilityMutationPolicy.mockReset()
    mocks.acquireWriteLane.mockReset()
    mocks.releaseWriteLane.mockReset()
    mocks.acquireWriteLane.mockResolvedValue({
      lane_key: 'prompt_library:global',
      lease_id: 'lease-1',
      capability_id: 'capability.prompt_governance_mutation',
      mutation_scope: 'prompt_library',
      customer_id: null,
      operator_id: 'platform-admin',
    })
    mocks.releaseWriteLane.mockResolvedValue(undefined)
  })

  it('builds version history with rollback hints', async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: [
        { slug: 'product_doc_qna', name: 'Product Doc QnA', version: '7', is_active: true, updated_at: '2026-04-03T10:00:00.000Z', updated_by: 'platform-admin' },
        { slug: 'product_doc_qna', name: 'Product Doc QnA', version: '6', is_active: false, updated_at: '2026-04-02T10:00:00.000Z', updated_by: 'platform-admin' },
        { slug: 'product_doc_qna', name: 'Product Doc QnA', version: '8', is_active: false, updated_at: '2026-04-04T10:00:00.000Z', updated_by: 'platform-admin' },
      ],
      error: null,
    })
    const firstOrder = vi.fn().mockReturnValue({ order: secondOrder })
    const select = vi.fn().mockReturnValue({ order: firstOrder })
    mocks.from.mockReturnValue({ select })

    const history = await loadPromptVersionHistory()

    expect(history.product_doc_qna?.[0]).toMatchObject({ version: '7', is_active: true, action_hint: 'none' })
    expect(history.product_doc_qna?.[1]).toMatchObject({ version: '8', action_hint: 'release' })
    expect(history.product_doc_qna?.[2]).toMatchObject({ version: '6', action_hint: 'rollback' })
  })

  it('releases a target version and writes a release event', async () => {
    const selectEq = vi.fn().mockResolvedValue({
      data: [
        { slug: 'product_doc_qna', name: 'Product Doc QnA', version: '7', is_active: true, updated_at: '2026-04-03T10:00:00.000Z', updated_by: 'platform-admin' },
        { slug: 'product_doc_qna', name: 'Product Doc QnA', version: '8', is_active: false, updated_at: '2026-04-04T10:00:00.000Z', updated_by: 'platform-admin' },
      ],
      error: null,
    })
    const deactivateEq2 = vi.fn().mockResolvedValue({ error: null })
    const deactivateEq1 = vi.fn().mockReturnValue({ eq: deactivateEq2 })
    const activateEq2 = vi.fn().mockResolvedValue({ error: null })
    const activateEq1 = vi.fn().mockReturnValue({ eq: activateEq2 })
    const insert = vi.fn().mockResolvedValue({ error: null })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'prompt_library') {
        return {
          select: vi.fn().mockReturnValue({ eq: selectEq }),
          update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            if (payload.is_active === false) return { eq: deactivateEq1 }
            return { eq: activateEq1 }
          }),
        }
      }
      if (table === 'prompt_release_events_op') {
        return { insert }
      }
      return {}
    })

    const result = await releasePromptVersion({
      slug: 'product_doc_qna',
      target_version: '8',
      action: 'release',
      operator_id: 'platform-admin',
      release_note: 'Promote v8',
    })

    expect(result).toMatchObject({
      slug: 'product_doc_qna',
      action: 'release',
      target_version: '8',
      previous_version: '7',
      active_version: '8',
      release_source: 'supabase',
    })
    expect(mocks.assertOperatorPlatformAccess).toHaveBeenCalledWith('platform-admin')
    expect(mocks.assertCapabilityMutationPolicy).toHaveBeenCalledWith({
      capabilityId: 'capability.prompt_governance_mutation',
      customerId: null,
    })
    expect(insert).toHaveBeenCalledTimes(1)
    expect(mocks.releaseWriteLane).toHaveBeenCalledTimes(1)
  })
})
