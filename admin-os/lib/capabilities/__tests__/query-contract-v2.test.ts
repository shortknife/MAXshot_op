import { describe, expect, it } from 'vitest'
import { buildQueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

describe('Query Contract v2', () => {
  it('captures explicit calendar semantics for week APY queries', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '3月第一周的平均APY是多少',
      slots: {
        metric: 'apy',
        aggregation: 'avg',
        calendar_year: 2026,
        calendar_month: 3,
        week_of_month: 1,
      },
      filters: {
        date_from: '2026-03-01',
        date_to: '2026-03-07',
      },
    })

    expect(contract.scope).toBe('yield')
    expect(contract.metric).toBe('apy')
    expect(contract.aggregation).toBe('avg')
    expect(contract.time.calendar_month).toBe(3)
    expect(contract.time.week_of_month).toBe(1)
    expect(contract.completeness.ready).toBe(true)
  })

  it('keeps compare follow-up executable when time window is inherited', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '比较 Maxshot USDC V2 和 dForce USDC 的 APY',
      slots: {
        metric: 'apy',
        aggregation: 'avg',
        compare_targets: ['Maxshot USDC V2', 'dForce USDC'],
      },
      filters: {
        time_window_days: 7,
      },
    })

    expect(contract.targets.compare_targets).toEqual(['Maxshot USDC V2', 'dForce USDC'])
    expect(contract.completeness.missing_slots).toEqual([])
    expect(contract.completeness.ready).toBe(true)
  })

  it('marks missing slots when a yield summary is still under-specified', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '当前 vault APY 怎么样？',
      slots: {
        metric: 'apy',
        entity: 'vault',
      },
      filters: {},
    })

    expect(contract.completeness.ready).toBe(false)
    expect(contract.completeness.missing_slots).toContain('time_window')
    expect(contract.completeness.missing_slots).toContain('metric_agg')
  })


  it('normalizes time-only APY clarification replies into avg window summaries', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '最近7天 平均 APY',
      slots: {},
      filters: {
        time_window_days: 7,
      },
    })

    expect(contract.metric).toBe('apy')
    expect(contract.aggregation).toBe('avg')
    expect(contract.question_shape).toBe('window_summary')
    expect(contract.completeness.ready).toBe(true)
  })

  it('normalizes ranking and trend semantics into contract fields', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '最近7天按 chain 看 APY 排名',
      slots: {
        metric: 'apy',
      },
      filters: {
        time_window_days: 7,
      },
    })

    expect(contract.question_shape).toBe('ranking_by_dimension')
    expect(contract.ranking_dimension).toBe('chain')
    expect(contract.query_mode).toBe('metrics')
  })

  it('marks multi-goal metric queries as not ready for MVP', () => {
    const contract = buildQueryContractV2({
      scope: 'yield',
      rawQuery: '3月份的APY均值是多少？最高和最低分别是多少？',
      slots: {
        metric: 'apy',
        aggregation: 'max',
      },
      filters: {
        date_from: '2026-03-01',
        date_to: '2026-03-31',
      },
    })

    expect(contract.completeness.ready).toBe(false)
    expect(contract.completeness.missing_slots).toContain('primary_goal')
  })

  it('marks cross-period delta-ranking queries as not ready for MVP', () => {
    const contract = buildQueryContractV2({
      scope: 'vault',
      rawQuery: '2月份和3月份比较的话，那个vault TVL 提高最多呢？以当月最高的TVL计算即可！',
      slots: {
        metric: 'tvl',
        aggregation: 'max',
      },
      filters: {
        date_from: '2026-02-01',
        date_to: '2026-02-28',
      },
    })

    expect(contract.completeness.ready).toBe(false)
    expect(contract.completeness.missing_slots).toContain('primary_goal')
  })
})
