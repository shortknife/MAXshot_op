import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { estimateRuntimeCostUsd, loadRuntimeCostEvents, persistRuntimeCostEvent } from '@/lib/runtime-cost/runtime'

describe('runtime cost runtime', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.select.mockReset()
    mocks.order.mockReset()
    mocks.limit.mockReset()
  })

  it('estimates configured cost from tokens', () => {
    expect(estimateRuntimeCostUsd({ model_source: 'filesystem_md', model_prompt_slug: 'intent_analyzer', tokens_used: 1000 })).toBeGreaterThan(0)
    expect(estimateRuntimeCostUsd({ model_source: 'local_stub', model_prompt_slug: 'intent_analyzer', tokens_used: 1000 })).toBe(0)
  })

  it('persists runtime cost event', async () => {
    mocks.from.mockReturnValue({ insert: mocks.insert.mockResolvedValue({ error: null }) })
    const result = await persistRuntimeCostEvent({
      session_id: 's1', customer_id: 'maxshot', requester_id: null, entry_channel: 'web', raw_query: 'q', intent_type: 'general_qna', intent_type_canonical: 'general_qna', primary_capability_id: 'capability.product_doc_qna', matched_capability_ids: ['capability.product_doc_qna'], source_plane: 'product_docs', answer_type: 'qna', verification_outcome: 'pass', fallback_required: false, review_required: false, success: true, status_code: 200, model_source: 'filesystem_md', model_prompt_slug: 'intent_analyzer', tokens_used: 42, estimated_cost_usd: 0.000011, duration_ms: 120, meta: {}
    })
    expect(result?.source).toBe('supabase')
  })

  it('loads runtime cost events from supabase', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({
            error: null,
            data: [{ event_id: 'e1', created_at: '2026-04-02T00:00:00.000Z', session_id: 's1', customer_id: 'maxshot', requester_id: null, entry_channel: 'web', raw_query: 'q', intent_type: 'general_qna', intent_type_canonical: 'general_qna', primary_capability_id: 'capability.product_doc_qna', matched_capability_ids: ['capability.product_doc_qna'], source_plane: 'product_docs', answer_type: 'qna', verification_outcome: 'pass', fallback_required: false, review_required: false, success: true, status_code: 200, model_source: 'filesystem_md', model_prompt_slug: 'intent_analyzer', tokens_used: 10, estimated_cost_usd: 0.000003, duration_ms: 50, meta: {} }],
          }),
        }),
      }),
    })
    const runtime = await loadRuntimeCostEvents()
    expect(runtime.source).toBe('supabase')
    expect(runtime.items[0]?.event_id).toBe('e1')
  })
})
