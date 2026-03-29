import { describe, expect, it } from 'vitest'
import { buildBusinessFailureResponse } from '@/lib/chat/business-response'
import { buildBusinessSuccessResponse } from '@/lib/chat/business-success-response'

const queryContract = {
  version: 'v2',
  scope: 'yield',
  metric: 'apy',
  entity: null,
  aggregation: 'avg',
  query_mode: 'metrics',
  question_shape: null,
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
    chain: 'arbitrum',
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
}

describe('business response query contract exposure', () => {
  it('includes query_contract on rejected business responses', () => {
    const body = buildBusinessFailureResponse({
      reason: 'no_data_in_selected_range',
      intentType: 'business_query',
      canonicalIntentType: 'ops_query',
      primaryCapabilityId: 'capability.data_fact_query',
      matchedCapabilityIds: ['capability.data_fact_query'],
      promptMeta: null,
      followUpContextApplied: true,
      intentQuery: '3月20日当天 APY 最高是多少',
      scope: 'yield',
      clarificationAutoAssumed: false,
      queryContract: {
        ...queryContract,
        completeness: {
          ready: false,
          missing_slots: ['time_window'],
        },
      },
      criticDecision: {
        version: 'v1',
        pass: true,
        severity: 'info',
        issues: [],
      },
    })

    expect(body.data.meta.query_contract.completeness.missing_slots).toEqual(['time_window'])
    expect(body.data.meta.critic_decision.pass).toBe(true)
    expect(body.data.meta.next_actions).toEqual([
      '换一个时间范围重试',
      '改查最近7天或最近30天',
      '指定 chain / protocol / vault 缩小范围',
    ])
  })

  it('includes query_contract on answered business responses', () => {
    const body = buildBusinessSuccessResponse({
      summary: 'ok',
      previewRows: [],
      intentType: 'business_query',
      canonicalIntentType: 'ops_query',
      primaryCapabilityId: 'capability.data_fact_query',
      matchedCapabilityIds: ['capability.data_fact_query'],
      promptMeta: null,
      scope: 'yield',
      followUpContextApplied: true,
      queryMode: 'metrics',
      metricSemantics: 'yield_metric',
      clarificationAutoAssumed: false,
      interpretation: '我的理解是：查询 指定时间范围 的 平均 APY。',
      resolvedScope: 'yield',
      intentQuery: '最近7天 APY',
      evidence: [],
      narrativeEvidence: [],
      explanation: null,
      reasonTags: [],
      reasonBreakdown: { main_reason: 'insufficient_signal', secondary_reasons: [], evidence_count: 0 },
      reasonBreakdownZh: { main_reason: '信号不足', secondary_reasons: [], evidence_count: 0 },
      rows: [],
      filtersApplied: {},
      qualityAlert: null,
      semanticDefaults: null,
      sourcePolicy: null,
      followUpPolicy: null,
      nextActions: null,
      memoryRefsRef: [],
      queryContract,
      criticDecision: {
        version: 'v1',
        pass: true,
        severity: 'info',
        issues: [],
      },
    })

    expect(body.data.meta.query_contract).toEqual(queryContract)
    expect(body.data.meta.critic_decision.pass).toBe(true)
    expect(body.data.meta.next_actions).toEqual(['例如：看 Morpho 的 APY', '例如：看 AAVE 的 APY', '例如：看 Euler 的 APY'])
  })
})
