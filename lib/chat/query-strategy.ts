export type QueryMode = 'metrics' | 'investigate' | 'lookup'

export function inferQueryMode(rawQuery: string, scope: string): QueryMode {
  const text = rawQuery.toLowerCase()
  if (scope === 'execution' && /(execution|详情|detail|id|记录)/.test(text)) return 'lookup'
  if (/(为什么|原因|why|reason|波动|异常|insight|explain|驱动|trigger)/.test(text)) return 'investigate'
  return 'metrics'
}

export function inferMetricSemantics(scope: string): string {
  if (scope === 'yield') return 'vault_tvl'
  if (scope === 'vault') return 'vault_allocation'
  if (scope === 'execution') return 'execution_status'
  return 'business_metric'
}

export function buildEvidenceChain(scope: string, mode: QueryMode, rawQuery: string): string[] {
  const text = rawQuery.toLowerCase()
  const asksRebalanceCause = /(调仓|rebalance|拦截|block|冷却|cooldown|没动)/.test(text)

  if (mode === 'investigate') {
    if (asksRebalanceCause) return ['rebalance_decisions', 'execution_logs_rag', 'market_metrics']
    if (scope === 'yield') return ['market_metrics', 'rebalance_decisions', 'execution_logs_rag']
    return ['rebalance_decisions', 'execution_logs_rag', 'market_metrics']
  }

  if (mode === 'lookup') return ['executions', 'rebalance_decisions']
  if (scope === 'yield') return ['market_metrics', 'allocation_snapshots']
  if (scope === 'vault') return ['allocation_snapshots']
  if (scope === 'execution') return ['executions']
  return ['business_tables']
}

export function buildBusinessNextActionsByMode(scope: string, mode: QueryMode, success: boolean): string[] {
  if (!success) return ['例如：最近7天的 APY', '例如：Maxshot Omni Vault USDC 的 APY', '例如：给我 execution_id 的详情']
  if (mode === 'investigate') return ['例如：为什么今天 APY 波动这么大？', '例如：这个 execution 为什么失败？', '例如：最近7天哪个协议变化最大？']
  if (mode === 'lookup') return ['例如：给我某个 execution_id 的详情', '例如：最近一笔 execution 的状态', '例如：这个 execution 的失败原因是什么？']
  if (scope === 'yield') return ['例如：看 arbitrum 的 APY', '例如：看 Morpho 的 APY', '例如：比较两个 vault 的 APY']
  if (scope === 'execution') return ['例如：给我最近一笔 execution 详情', '例如：最近7天有哪些失败 execution', '例如：某个 execution 的耗时是多少']
  if (scope === 'vault') return ['例如：Maxshot 有哪些 vault 可以用？', '例如：比较不同 chain 的分配', '例如：哪个 vault 空闲流动性最高？']
  return ['例如：限定最近7天', '例如：指定某个 vault', '例如：继续追问原因']
}
