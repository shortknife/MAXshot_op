import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadInteractionLearningLogRuntime: vi.fn(),
}))

vi.mock('@/lib/interaction-learning/runtime', () => ({
  loadInteractionLearningLogRuntime: mocks.loadInteractionLearningLogRuntime,
}))

import { buildInteractionLearningMemory } from '@/lib/interaction-learning/memory'

describe('interaction learning memory', () => {
  beforeEach(() => {
    mocks.loadInteractionLearningLogRuntime.mockReset()
  })

  it('returns empty when runtime is empty', async () => {
    mocks.loadInteractionLearningLogRuntime.mockResolvedValue({ source: 'empty', items: [] })
    await expect(buildInteractionLearningMemory({ contextTags: ['faq'] })).resolves.toEqual([])
  })

  it('builds experience and insight refs from matching logs', async () => {
    mocks.loadInteractionLearningLogRuntime.mockResolvedValue({
      source: 'supabase',
      items: [
        {
          log_id: 'ilog-1',
          created_at: '2026-04-02T10:00:00.000Z',
          session_id: 's1',
          requester_id: null,
          entry_channel: 'web',
          customer_id: 'maxshot',
          raw_query: 'How do I reset my password?',
          effective_query: null,
          intent_type: 'general_qna',
          intent_type_canonical: 'general_qna',
          primary_capability_id: 'capability.faq_answering',
          matched_capability_ids: ['capability.faq_answering'],
          source_plane: 'faq_kb',
          answer_type: 'qna',
          success: true,
          status_code: 200,
          fallback_required: false,
          review_required: false,
          clarification_required: false,
          confidence: 0.92,
          summary: 'Reset via forgot password link.',
          query_mode: null,
          scope: 'faq',
          meta: {},
        },
        {
          log_id: 'ilog-2',
          created_at: '2026-04-02T11:00:00.000Z',
          session_id: 's2',
          requester_id: null,
          entry_channel: 'web',
          customer_id: 'maxshot',
          raw_query: 'What does the Pro plan include?',
          effective_query: null,
          intent_type: 'general_qna',
          intent_type_canonical: 'general_qna',
          primary_capability_id: 'capability.faq_answering',
          matched_capability_ids: ['capability.faq_answering'],
          source_plane: 'faq_kb',
          answer_type: 'qna',
          success: true,
          status_code: 200,
          fallback_required: true,
          review_required: true,
          clarification_required: false,
          confidence: 0.31,
          summary: 'Low confidence FAQ result.',
          query_mode: null,
          scope: 'faq',
          meta: {},
        },
      ],
    })

    const refs = await buildInteractionLearningMemory({ contextTags: ['faq', 'password'] })

    expect(refs.length).toBeGreaterThan(1)
    expect(refs.some((ref) => ref.type === 'experience')).toBe(true)
    expect(refs.some((ref) => ref.type === 'insight')).toBe(true)
    expect(refs[0]?.memory_origin).toBe('interaction_learning')
    expect(refs[0]?.id).toContain('ilog:')
  })
})
