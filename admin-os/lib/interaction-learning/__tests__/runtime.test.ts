import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import { loadInteractionLearningLogRuntime, persistInteractionLearningLog } from '@/lib/interaction-learning/runtime'

beforeEach(() => {
  mocks.from.mockReset()
  mocks.insert.mockReset()
  mocks.select.mockReset()
  mocks.order.mockReset()
  mocks.limit.mockReset()
})

describe('interaction learning runtime', () => {
  it('persists runtime log row when store exists', async () => {
    mocks.from.mockReturnValue({
      insert: mocks.insert.mockResolvedValue({ error: null }),
    })

    const result = await persistInteractionLearningLog({
      raw_query: 'test',
      success: true,
      status_code: 200,
      matched_capability_ids: ['capability.data_fact_query'],
    })

    expect(result?.source).toBe('supabase')
    expect(result?.log_id).toContain('ilog-')
  })

  it('loads runtime rows when available', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({
            error: null,
            data: [
              {
                log_id: 'ilog-1',
                created_at: '2026-04-02T10:00:00.000Z',
                session_id: 'sess-1',
                requester_id: 'user-1',
                entry_channel: 'web_app',
                customer_id: 'maxshot',
                raw_query: '最近7天按链 APY 排名',
                effective_query: '最近7天按链 APY 排名',
                intent_type: 'ops_query',
                intent_type_canonical: 'ops_query',
                primary_capability_id: 'capability.data_fact_query',
                matched_capability_ids: ['capability.data_fact_query'],
                source_plane: 'business',
                answer_type: 'answered',
                success: true,
                status_code: 200,
                fallback_required: false,
                review_required: false,
                clarification_required: false,
                confidence: null,
                summary: 'done',
                query_mode: 'metrics',
                scope: 'yield',
                meta: {},
              },
            ],
          }),
        }),
      }),
    })

    const runtime = await loadInteractionLearningLogRuntime()
    expect(runtime.source).toBe('supabase')
    expect(runtime.items[0]?.log_id).toBe('ilog-1')
    expect(runtime.items[0]?.customer_id).toBe('maxshot')
  })

  it('returns empty source when runtime store missing', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({ data: null, error: new Error('relation interaction_learning_log_op does not exist') }),
        }),
      }),
    })

    const runtime = await loadInteractionLearningLogRuntime()
    expect(runtime.source).toBe('empty')
    expect(runtime.items).toEqual([])
  })
})
