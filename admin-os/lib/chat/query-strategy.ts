export type QueryMode = 'metrics' | 'investigate' | 'lookup'

type QueryContractLike = {
  scope?: string | null
  metric?: string | null
  aggregation?: string | null
  query_mode?: QueryMode | null
  ranking_dimension?: 'chain' | 'protocol' | null
  completeness?: { missing_slots?: string[] | null } | null
  targets?: { chain?: string | null; protocol?: string | null; vault_name?: string | null; compare_targets?: string[] | null } | null
}

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

export function inferMetricSemanticsFromContract(
  queryContract: {
    scope?: string | null
    metric?: string | null
    question_shape?: string | null
    ranking_dimension?: string | null
  } | null | undefined,
  fallbackScope: string
): string {
  if (!queryContract) return inferMetricSemantics(fallbackScope)
  if (queryContract.metric === 'tvl') return 'vault_tvl'
  if (queryContract.scope === 'yield' && queryContract.ranking_dimension) return 'apy_ranking'
  if (queryContract.scope === 'yield' && queryContract.question_shape === 'trend_window') return 'yield_trend'
  if (queryContract.scope === 'yield') return 'market_tvl'
  if (queryContract.scope === 'vault') return 'vault_allocation'
  if (queryContract.scope === 'execution') return 'execution_status'
  return inferMetricSemantics(fallbackScope)
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

export function buildBusinessNextActionsFromContract(queryContract: QueryContractLike | null | undefined, success: boolean): string[] | null {
  if (!queryContract) return null
  const missingSlots = Array.isArray(queryContract.completeness?.missing_slots)
    ? queryContract.completeness?.missing_slots || []
    : []
  if (!success && missingSlots.includes('time_window')) {
    return ['例如：最近7天', '例如：最近30天', '例如：今天（Asia/Shanghai）']
  }
  if (!success && missingSlots.includes('metric_agg')) {
    return ['例如：按平均 APY', '例如：按最高 APY', '例如：按实时 APY']
  }
  if (!success && missingSlots.includes('metric')) {
    return ['例如：看 APY', '例如：看 TVL', '例如：看 execution 状态']
  }

  if (success && queryContract.scope === 'yield') {
    if (!queryContract.targets?.chain && queryContract.ranking_dimension !== 'chain') {
      return ['例如：看 arbitrum 的 APY', '例如：看 ethereum 的 APY', '例如：看 base 的 APY']
    }
    if (!queryContract.targets?.protocol && queryContract.ranking_dimension !== 'protocol') {
      return ['例如：看 Morpho 的 APY', '例如：看 AAVE 的 APY', '例如：看 Euler 的 APY']
    }
    if (!(queryContract.targets?.compare_targets || []).length && !queryContract.targets?.vault_name) {
      return ['例如：比较两个 vault 的 APY', '例如：只看某个 vault 的 APY', '例如：看最近7天的 APY']
    }
  }

  if (success && queryContract.scope === 'execution') {
    return ['例如：给我最近一笔 execution 详情', '例如：这个 execution 的失败原因是什么？', '例如：最近7天有哪些失败 execution']
  }

  if (success && queryContract.scope === 'vault') {
    return ['例如：看 base 上有哪些 vault', '例如：比较不同 chain 的分配', '例如：哪个 vault 空闲流动性最高？']
  }

  return null
}
