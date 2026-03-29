import { describe, expect, it } from 'vitest'
import { evaluateBusinessQueryContract } from '@/lib/capabilities/business-query-critic'
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function contract(partial: Partial<QueryContractV2>): QueryContractV2 {
  return {
    version: 'v2',
    scope: 'yield',
    metric: 'apy',
    entity: null,
    aggregation: 'avg',
    query_mode: 'metrics',
    question_shape: 'ranking_by_dimension',
    ranking_dimension: 'chain',
    return_fields: [],
    time: {
      timezone: 'Asia/Shanghai',
      time_window_days: 7,
      date_from: null,
      date_to: null,
      exact_day: null,
      calendar_year: null,
      calendar_month: null,
      week_of_month: null,
    },
    targets: {
      chain: null,
      protocol: null,
      vault_name: null,
      market_name: null,
      compare_targets: [],
      execution_id: null,
    },
    completeness: {
      ready: true,
      missing_slots: [],
    },
    ...partial,
  }
}

describe('business query critic', () => {
  it('passes when row shape matches ranking contract', () => {
    const decision = evaluateBusinessQueryContract({
      queryContract: contract({}),
      rows: [{ dimension_value: 'arbitrum', avg_apy_pct: 4.1 }],
    })

    expect(decision.pass).toBe(true)
    expect(decision.issues).toEqual([])
  })

  it('blocks when ranking contract receives non-ranking rows', () => {
    const decision = evaluateBusinessQueryContract({
      queryContract: contract({}),
      rows: [{ market_name: 'Vault A', avg_apy_pct: 4.1 }],
    })

    expect(decision.pass).toBe(false)
    expect(decision.issues[0]?.code).toBe('missing_rank_dimension_rows')
  })

  it('blocks when compare query returns fewer than two rows', () => {
    const decision = evaluateBusinessQueryContract({
      queryContract: contract({
        question_shape: 'window_summary',
        ranking_dimension: null,
        targets: {
          chain: null,
          protocol: null,
          vault_name: null,
          market_name: null,
          compare_targets: ['A', 'B'],
          execution_id: null,
        },
      }),
      rows: [{ market_name: 'A', avg_apy_pct: 4.1 }],
    })

    expect(decision.pass).toBe(false)
    expect(decision.issues[0]?.code).toBe('missing_compare_rows')
  })
})
