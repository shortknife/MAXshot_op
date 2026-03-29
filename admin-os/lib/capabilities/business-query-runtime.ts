import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

export type BusinessScope = 'vault' | 'execution' | 'yield' | 'allocation' | 'rebalance' | 'unknown'

export type BusinessQueryResult = {
  scope: BusinessScope
  rows: Record<string, unknown>[]
  summary: string
  source_type: 'rpc' | 'table' | 'template'
  source_id: string
}

export async function resolveQueryByScope(params: {
  scope: BusinessScope
  rawQuery: string
  slots: Record<string, unknown>
  queryContract: QueryContractV2
  resolveVault: (scope: BusinessScope, queryContract: QueryContractV2) => Promise<BusinessQueryResult | null>
  resolveExecution: (scope: BusinessScope, executionId: string | null) => Promise<BusinessQueryResult | null>
  resolveMetrics: (
    scope: BusinessScope,
    rawQuery: string,
    slots: Record<string, unknown>,
    queryContract: QueryContractV2
  ) => Promise<BusinessQueryResult | null>
  resolveRebalance: (scope: BusinessScope) => Promise<BusinessQueryResult | null>
  extractExecutionId: (rawQuery: string) => string | null
}): Promise<BusinessQueryResult | null> {
  const {
    scope,
    rawQuery,
    slots,
    queryContract,
    resolveVault,
    resolveExecution,
    resolveMetrics,
    resolveRebalance,
    extractExecutionId,
  } = params

  if (scope === 'vault' || scope === 'allocation' || scope === 'rebalance') {
    if (scope === 'rebalance') return resolveRebalance(scope)
    const metric = String(queryContract.metric || slots.metric || '').trim().toLowerCase()
    if (metric === 'tvl' || metric === 'apy') {
      return resolveMetrics(scope, rawQuery, slots, queryContract)
    }
    return resolveVault(scope, queryContract)
  }
  if (scope === 'execution') {
    const executionId = String(queryContract.targets.execution_id || slots.execution_id || '').trim() || extractExecutionId(rawQuery)
    return resolveExecution(scope, executionId)
  }
  if (scope === 'yield') {
    return resolveMetrics(scope, rawQuery, slots, queryContract)
  }
  return null
}
