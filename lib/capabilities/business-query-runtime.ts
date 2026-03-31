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
  resolveVault: (scope: BusinessScope) => Promise<BusinessQueryResult | null>
  resolveExecution: (scope: BusinessScope, executionId: string | null) => Promise<BusinessQueryResult | null>
  resolveMetrics: (scope: BusinessScope, rawQuery: string, slots: Record<string, unknown>) => Promise<BusinessQueryResult | null>
  resolveRebalance: (scope: BusinessScope) => Promise<BusinessQueryResult | null>
  extractExecutionId: (rawQuery: string) => string | null
}): Promise<BusinessQueryResult | null> {
  const { scope, rawQuery, slots, resolveVault, resolveExecution, resolveMetrics, resolveRebalance, extractExecutionId } = params

  if (scope === 'vault' || scope === 'allocation' || scope === 'rebalance') {
    return scope === 'rebalance' ? resolveRebalance(scope) : resolveVault(scope)
  }
  if (scope === 'execution') {
    const executionId = String(slots.execution_id || '').trim() || extractExecutionId(rawQuery)
    return resolveExecution(scope, executionId)
  }
  if (scope === 'yield') {
    return resolveMetrics(scope, rawQuery, slots)
  }
  return null
}
