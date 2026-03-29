import { describe, it, expect, vi } from 'vitest'
import { dataFactQuery } from '../data-fact-query'

const fakeClient = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) } as any

const makeClient = (responseQueue: Array<{ data?: unknown; count?: number; error?: { message: string } | null }>) => {
  return {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => responseQueue.shift() || { data: [], error: null },
        then: (resolve: any, reject: any) => {
          const res = responseQueue.shift() || { data: [], error: null }
          return Promise.resolve(res).then(resolve, reject)
        },
      }
      return chain
    },
  } as any
}

describe('data_fact_query', () => {
  it('execution_count returns count', async () => {
    const client = makeClient([{ count: 3, error: null }])
    const out = await dataFactQuery(
      {
        capability_id: 'data_fact_query',
        execution_id: 'exec-1',
        intent: { type: 'ops_query', extracted_slots: {}, confidence: 0.8 },
        slots: { metric: 'execution_count' },
        memory_refs: [],
        context: {},
      },
      client
    )
    expect(out.status).toBe('success')
    expect(out.result).toEqual({ metric: 'execution_count', status: null, count: 3 })
    expect(Array.isArray(out.evidence.sources)).toBe(true)
  })

  it('ops_health_summary aggregates status and intents', async () => {
    const rows = [
      { execution_id: 'a', status: 'completed', intent_name: 'ops', requester_id: 'u', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:10:00Z' },
      { execution_id: 'b', status: 'failed', intent_name: 'ops', requester_id: 'u', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:05:00Z' },
      { execution_id: 'c', status: 'completed', intent_name: 'marketing', requester_id: 'u', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:20:00Z' }
    ]
    const client = makeClient([{ data: rows, error: null }])
    const out = await dataFactQuery(
      {
        capability_id: 'data_fact_query',
        execution_id: 'exec-2',
        intent: { type: 'ops_query', extracted_slots: {}, confidence: 0.8 },
        slots: { metric: 'ops_health_summary', window_size: '200' },
        memory_refs: [],
        context: {},
      },
      client
    )
    expect(out.status).toBe('success')
    const result = out.result as any
    expect(result.totals.count).toBe(3)
    expect(result.by_status.completed).toBe(2)
    expect(result.by_status.failed).toBe(1)
    expect(result.top_intents[0].intent).toBe('ops')
  })

  it('latest_execution_by_status requires status', async () => {
    const client = makeClient([{ data: [], error: null }])
    const out = await dataFactQuery(
      {
        capability_id: 'data_fact_query',
        execution_id: 'exec-3',
        intent: { type: 'ops_query', extracted_slots: {}, confidence: 0.8 },
        slots: { metric: 'latest_execution_by_status' },
        memory_refs: [],
        context: {},
      },
      client
    )
    expect(out.status).toBe('failed')
    expect(out.evidence.fallback_reason).toBe('missing_status')
  })
})


describe('external_ops_price', () => {
  it('returns price from external api with evidence', async () => {
    const input = {
      slots: { metric: 'external_ops_price', asset_id: 'bitcoin', vs_currency: 'usd' },
    } as any

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ bitcoin: { usd: 12345 } }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const output = await dataFactQuery(input as any, fakeClient as any)

    expect(output.status).toBe('success')
    expect(output.result).toMatchObject({ price: 12345 })
    expect(output.evidence.sources[0]).toMatchObject({ provider: 'coingecko' })
  })

  it('rejects non-allowed host', async () => {
    const input = {
      slots: { metric: 'external_ops_price', asset_id: 'bitcoin', vs_currency: 'usd', endpoint: 'https://evil.com/price' },
    } as any

    const output = await dataFactQuery(input as any, fakeClient as any)
    expect(output.status).toBe('failed')
    expect(output.evidence.fallback_reason).toBe('external_host_not_allowed')
  })
})
