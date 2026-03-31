import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderSqlTemplate: vi.fn(),
  businessRpc: vi.fn(),
  businessSelect: vi.fn(),
  businessSelectLatestByCreatedAt: vi.fn(),
  businessSelectLatestByFreshness: vi.fn(),
  findAllocationExecutionIdsByVaultKeyword: vi.fn(),
  findExecutionByExecutionIdOrId: vi.fn(),
  queryMarketMetricsSince: vi.fn(),
  queryMarketMetricsBetween: vi.fn(),
}))

vi.mock('@/lib/sql-templates', () => ({
  renderSqlTemplate: mocks.renderSqlTemplate,
}))

vi.mock('@/lib/capabilities/business-data-access', () => ({
  businessRpc: mocks.businessRpc,
  businessSelect: mocks.businessSelect,
  businessSelectLatestByCreatedAt: mocks.businessSelectLatestByCreatedAt,
  businessSelectLatestByFreshness: mocks.businessSelectLatestByFreshness,
  findAllocationExecutionIdsByVaultKeyword: mocks.findAllocationExecutionIdsByVaultKeyword,
  findExecutionByExecutionIdOrId: mocks.findExecutionByExecutionIdOrId,
  queryMarketMetricsSince: mocks.queryMarketMetricsSince,
  queryMarketMetricsBetween: mocks.queryMarketMetricsBetween,
}))

import { buildBusinessQueryResolvers } from '@/lib/capabilities/business-query-provider'
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function makeContract(partial?: Partial<QueryContractV2>): QueryContractV2 {
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

describe('buildBusinessQueryResolvers resolveMetrics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.queryMarketMetricsSince.mockResolvedValue({
      data: [
        { execution_id: '1', chain: 'arbitrum', protocol: 'Morpho', market_name: 'Maxshot USDC V2', net_apy: 0.04, tvl: 100, created_at: '2026-03-31T00:00:00Z' },
        { execution_id: '2', chain: 'base', protocol: 'Morpho', market_name: 'Maxshot USDC V2', net_apy: 0.02, tvl: 80, created_at: '2026-03-31T00:00:00Z' },
        { execution_id: '3', chain: 'arbitrum', protocol: 'AAVE V3', market_name: 'CORE', net_apy: 0.01, tvl: 60, created_at: '2026-03-31T00:00:00Z' },
      ],
      error: null,
    })
    mocks.queryMarketMetricsBetween.mockResolvedValue({ data: [], error: null })
    mocks.findAllocationExecutionIdsByVaultKeyword.mockResolvedValue({ data: [], error: null })
    mocks.businessRpc.mockResolvedValue({ data: null, error: new Error('rpc_disabled') })
    mocks.businessSelectLatestByCreatedAt.mockResolvedValue({ data: [], error: null })
    mocks.businessSelectLatestByFreshness.mockResolvedValue({ data: [], error: null })
    mocks.businessSelect.mockResolvedValue({ data: [], error: null })
    mocks.renderSqlTemplate.mockImplementation(() => {
      throw new Error('template_not_used')
    })
  })

  it('applies chain and protocol filters to yield window averages', async () => {
    const resolvers = buildBusinessQueryResolvers({
      withRetry: async <T>(fn: () => Promise<T>) => fn(),
      explainMaxTotalCost: 100000,
    })

    const result = await resolvers.resolveMetrics(
      'yield',
      '最近7天 arbitrum morpho 的 APY',
      {},
      makeContract({
        targets: {
          chain: 'arbitrum',
          protocol: 'Morpho',
          vault_name: null,
          market_name: null,
          compare_targets: [],
          execution_id: null,
        },
      })
    )

    expect(result?.rows).toHaveLength(1)
    expect(result?.rows[0]).toMatchObject({
      chain: 'arbitrum',
      protocol: 'Morpho',
      market_name: 'Maxshot USDC V2',
      avg_apy_pct: 4,
    })
  })
})
