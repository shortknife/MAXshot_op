import { describe, expect, it } from 'vitest'
import { runBusinessQueryPipeline } from '@/lib/capabilities/business-query-pipeline'
import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function contract(partial: Partial<QueryContractV2>): QueryContractV2 {
  return {
    version: 'v2',
    scope: 'execution',
    metric: null,
    entity: null,
    aggregation: null,
    query_mode: 'lookup',
    question_shape: null,
    ranking_dimension: null,
    return_fields: [],
    time: {
      timezone: 'Asia/Shanghai',
      time_window_days: null,
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

describe('Query Contract pipeline consumption', () => {
  it('uses query contract lookup mode to keep only the latest execution row', () => {
    const result = runBusinessQueryPipeline({
      query: {
        scope: 'execution',
        rows: [
          { execution_id: 'exec-1', updated_at: '2026-03-28T00:00:00Z', status: 'completed' },
          { execution_id: 'exec-2', updated_at: '2026-03-27T00:00:00Z', status: 'completed' },
        ],
        summary: 'ok',
        source_type: 'table',
        source_id: 'executions',
      },
      filters: {},
      rawQuery: '给我 execution 详情',
      queryContract: contract({ targets: { chain: null, protocol: null, vault_name: null, market_name: null, compare_targets: [], execution_id: 'exec-1' } }),
      wantsSingleExecution: () => false,
    })

    expect(result?.scopedRows).toHaveLength(1)
    expect(result?.scopedRows[0].execution_id).toBe('exec-1')
  })
})
