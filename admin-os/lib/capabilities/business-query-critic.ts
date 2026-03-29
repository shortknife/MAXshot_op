import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

export type CriticIssueCode =
  | 'missing_rank_dimension_rows'
  | 'missing_top_bottom_rows'
  | 'missing_daily_tvl_rows'
  | 'missing_execution_rows'
  | 'missing_compare_rows'

export type BusinessQueryCriticDecision = {
  version: 'v1'
  pass: boolean
  severity: 'info' | 'warning' | 'blocking'
  issues: Array<{
    code: CriticIssueCode
    message: string
  }>
}

function buildDecision(issues: BusinessQueryCriticDecision['issues']): BusinessQueryCriticDecision {
  const blocking = issues.length > 0
  return {
    version: 'v1',
    pass: !blocking,
    severity: blocking ? 'blocking' : 'info',
    issues,
  }
}

export function evaluateBusinessQueryContract(params: {
  queryContract: QueryContractV2 | null | undefined
  rows: Record<string, unknown>[]
}): BusinessQueryCriticDecision {
  const { queryContract, rows } = params
  if (!queryContract) return buildDecision([])
  if (!rows.length) return buildDecision([])

  const issues: BusinessQueryCriticDecision['issues'] = []
  const first = rows[0] || {}

  if (queryContract.question_shape === 'ranking_by_dimension' && typeof first.dimension_value === 'undefined') {
    issues.push({
      code: 'missing_rank_dimension_rows',
      message: 'Ranking query returned rows without dimension_value.',
    })
  }

  if (queryContract.question_shape === 'top_bottom_in_day' && typeof first.rank_type === 'undefined') {
    issues.push({
      code: 'missing_top_bottom_rows',
      message: 'Top/bottom-in-day query returned rows without rank_type markers.',
    })
  }

  if (queryContract.metric === 'tvl' && queryContract.time.time_window_days && typeof first.avg_daily_tvl === 'undefined') {
    issues.push({
      code: 'missing_daily_tvl_rows',
      message: 'Windowed TVL query returned rows without avg_daily_tvl.',
    })
  }

  if (queryContract.scope === 'execution' && typeof first.execution_id === 'undefined') {
    issues.push({
      code: 'missing_execution_rows',
      message: 'Execution query returned rows without execution identifiers.',
    })
  }

  if ((queryContract.targets.compare_targets || []).length >= 2 && rows.length < 2) {
    issues.push({
      code: 'missing_compare_rows',
      message: 'Compare query returned fewer than two target rows.',
    })
  }

  return buildDecision(issues)
}
