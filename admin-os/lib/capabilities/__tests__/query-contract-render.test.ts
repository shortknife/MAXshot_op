import { describe, expect, it } from 'vitest'
import { buildYieldInterpretationFromContract, summarizeMetricRowsWithContract } from '@/lib/capabilities/business-query-contract-render'
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function contract(partial: Partial<QueryContractV2>): QueryContractV2 {
  return {
    version: 'v2',
    scope: 'yield',
    metric: 'apy',
    entity: null,
    aggregation: 'avg',
    query_mode: 'metrics',
    question_shape: 'window_summary',
    ranking_dimension: null,
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

describe('Query Contract render helpers', () => {
  it('builds contract-first yield interpretation', () => {
    const value = buildYieldInterpretationFromContract(contract({
      aggregation: 'max',
      time: {
        timezone: 'Asia/Shanghai',
        time_window_days: null,
        date_from: '2026-03-20',
        date_to: '2026-03-20',
        exact_day: '2026-03-20',
        calendar_year: null,
        calendar_month: null,
        week_of_month: null,
      },
    }))

    expect(value).toBe('我的理解是：查询 指定日期 的 最高 APY。')
  })

  it('summarizes ranking rows using contract semantics', () => {
    const summary = summarizeMetricRowsWithContract(
      [
        { dimension_value: 'arbitrum', avg_apy_pct: 4.12 },
        { dimension_value: 'base', avg_apy_pct: 3.76 },
      ],
      contract({
        question_shape: 'ranking_by_dimension',
        ranking_dimension: 'chain',
      })
    )

    expect(summary).toContain('按链的 APY 排名')
    expect(summary).toContain('arbitrum')
  })

  it('summarizes top-bottom-in-day rows using contract semantics', () => {
    const summary = summarizeMetricRowsWithContract(
      [
        { rank_type: 'highest', market_name: 'Vault A', apy_pct: 8.5, tvl: 100 },
        { rank_type: 'lowest', market_name: 'Vault B', apy_pct: 1.2, tvl: 20 },
      ],
      contract({
        aggregation: 'compare',
        question_shape: 'top_bottom_in_day',
        time: {
          timezone: 'Asia/Shanghai',
          time_window_days: null,
          date_from: '2026-03-20',
          date_to: '2026-03-20',
          exact_day: '2026-03-20',
          calendar_year: null,
          calendar_month: null,
          week_of_month: null,
        },
      })
    )

    expect(summary).toContain('指定日期 APY 最高/最低')
    expect(summary).toContain('Vault A')
    expect(summary).toContain('Vault B')
  })
})
