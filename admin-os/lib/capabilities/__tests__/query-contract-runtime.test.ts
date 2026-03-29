import { describe, expect, it, vi } from 'vitest'
import { resolveQueryByScope, type BusinessQueryResult } from '@/lib/capabilities/business-query-runtime'
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function buildContract(partial: Partial<QueryContractV2>): QueryContractV2 {
  return {
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

describe('Query Contract runtime consumption', () => {
  it('routes vault tvl queries to metrics using query contract metric authority', async () => {
    const resolveMetrics = vi.fn(async (): Promise<BusinessQueryResult> => ({
      scope: 'vault',
      rows: [],
      summary: 'ok',
      source_type: 'table',
      source_id: 'stub_metrics',
    }))
    const resolveVault = vi.fn(async (): Promise<BusinessQueryResult> => ({
      scope: 'vault',
      rows: [],
      summary: 'vault',
      source_type: 'table',
      source_id: 'stub_vault',
    }))

    await resolveQueryByScope({
      scope: 'vault',
      rawQuery: '2月份平均日tvl是多少',
      slots: {},
      queryContract: buildContract({
        scope: 'vault',
        metric: 'tvl',
        aggregation: 'avg',
      }),
      resolveVault,
      resolveExecution: vi.fn(),
      resolveMetrics,
      resolveRebalance: vi.fn(),
      extractExecutionId: vi.fn(() => null),
    })

    expect(resolveMetrics).toHaveBeenCalledOnce()
    expect(resolveVault).not.toHaveBeenCalled()
  })

  it('uses execution id from query contract before reparsing raw query', async () => {
    const resolveExecution = vi.fn(async (): Promise<BusinessQueryResult> => ({
      scope: 'execution',
      rows: [],
      summary: 'execution',
      source_type: 'table',
      source_id: 'stub_execution',
    }))

    await resolveQueryByScope({
      scope: 'execution',
      rawQuery: '给我最近一笔 execution 详情',
      slots: {},
      queryContract: buildContract({
        scope: 'execution',
        metric: null,
        aggregation: null,
        query_mode: 'lookup',
        targets: {
          chain: null,
          protocol: null,
          vault_name: null,
          market_name: null,
          compare_targets: [],
          execution_id: 'exec-from-contract',
        },
      }),
      resolveVault: vi.fn(),
      resolveExecution,
      resolveMetrics: vi.fn(),
      resolveRebalance: vi.fn(),
      extractExecutionId: vi.fn(() => 'exec-from-raw'),
    })

    expect(resolveExecution).toHaveBeenCalledWith('execution', 'exec-from-contract')
  })
})
