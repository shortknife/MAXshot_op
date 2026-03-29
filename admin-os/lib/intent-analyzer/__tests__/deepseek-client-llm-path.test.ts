import { afterEach, describe, expect, it, vi } from 'vitest'
import { callDeepSeek } from '@/lib/intent-analyzer/deepseek-client'

function makeSessionContext(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    conversation_context: {
      pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] },
      active_context: {
        scope: 'vault',
        query_mode: 'metrics',
        metric: 'vault_list',
        chain: 'arbitrum',
        protocol: null,
        vault_name: null,
        time_window_days: null,
        aggregation: null,
        exact_day: null,
        date_from: null,
        date_to: null,
        updated_at: Date.now(),
      },
      recent_turns_summary: [
        { role: 'user', content: '现在ARB链上有那几个Vault？' },
        { role: 'assistant', content: 'active_context: scope=vault; metric=vault_list; chain=arbitrum' },
      ],
    },
    ...overrides,
  })
}

describe('callDeepSeek hot paths use llm stack when API is available', () => {
  const originalKey = process.env.DEEPSEEK_API_KEY
  const originalFetch = global.fetch

  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalKey
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('does not short-circuit overall-performance business queries before LLM', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            intent_type: 'business_query',
            matched_capability_ids: ['capability.data_fact_query'],
            matched_capability_id: 'capability.data_fact_query',
            in_scope: true,
            need_clarification: false,
            slots: { scope: 'yield', metric: 'apy' },
            confidence: 0.9,
          }) } }],
          usage: { total_tokens: 42 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ pass: true, repaired_output: null }) } }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          intent_type: 'business_query',
          matched_capability_ids: ['capability.data_fact_query'],
          matched_capability_id: 'capability.data_fact_query',
          in_scope: true,
          need_clarification: false,
          slots: { scope: 'yield', metric: 'apy' },
          confidence: 0.9,
        }) } }] }),
      } as Response)
    global.fetch = fetchMock as typeof global.fetch

    const result = await callDeepSeek('MAXshot 业务整体表现如何')

    expect(fetchMock).toHaveBeenCalled()
    expect(result.tokens_used).toBeGreaterThan(0)
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.scope).toBe('yield')
  })

  it('does not short-circuit vault follow-up chain switches before LLM', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            intent_type: 'business_query',
            matched_capability_ids: ['capability.data_fact_query'],
            matched_capability_id: 'capability.data_fact_query',
            in_scope: true,
            need_clarification: false,
            slots: { scope: 'vault', metric: 'vault_list', chain: 'base' },
            confidence: 0.9,
          }) } }],
          usage: { total_tokens: 24 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ pass: true, repaired_output: null }) } }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          intent_type: 'business_query',
          matched_capability_ids: ['capability.data_fact_query'],
          matched_capability_id: 'capability.data_fact_query',
          in_scope: true,
          need_clarification: false,
          slots: { scope: 'vault', metric: 'vault_list', chain: 'base' },
          confidence: 0.9,
        }) } }] }),
      } as Response)
    global.fetch = fetchMock as typeof global.fetch

    const result = await callDeepSeek('Base呢？', makeSessionContext())

    expect(fetchMock).toHaveBeenCalled()
    expect(result.tokens_used).toBeGreaterThan(0)
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.metric).toBe('vault_list')
    expect(result.intent.extracted_slots?.chain).toBe('base')
  })
})
