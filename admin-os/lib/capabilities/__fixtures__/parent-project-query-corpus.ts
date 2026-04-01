export type ParentProjectQueryCorpusCase = {
  id: string
  category: 'vault' | 'execution' | 'market' | 'allocation' | 'governance_guard' | 'routing'
  query: string
  expectation: string
}

export const PARENT_PROJECT_QUERY_CORPUS: ParentProjectQueryCorpusCase[] = [
  {
    id: 'VQ-01',
    category: 'vault',
    query: 'Show all vaults',
    expectation: 'vault listing stays on business data plane',
  },
  {
    id: 'VQ-03',
    category: 'vault',
    query: 'Show top 5 vaults by TVL',
    expectation: 'vault ranking query stays in business query scope',
  },
  {
    id: 'VQ-04',
    category: 'vault',
    query: 'Show top 3 vaults by APY',
    expectation: 'APY ranking query resolves as yield ranking',
  },
  {
    id: 'EQ-01',
    category: 'execution',
    query: 'What is the overall 24h success rate?',
    expectation: 'execution metrics query stays in execution scope',
  },
  {
    id: 'MQ-01',
    category: 'market',
    query: '最近7天按链 APY 排名',
    expectation: 'market ranking query resolves as chain ranking',
  },
  {
    id: 'MQ-02',
    category: 'market',
    query: '最近7天按协议 APY 排名',
    expectation: 'market ranking query resolves as protocol ranking',
  },
  {
    id: 'MQ-03',
    category: 'market',
    query: '最近7天 APY 走势如何？',
    expectation: 'yield trend query resolves as trend',
  },
  {
    id: 'MQ-04',
    category: 'market',
    query: '最近7天 APY 哪天最高，哪天最低？',
    expectation: 'yield extremes query resolves as extremes',
  },
  {
    id: 'AQ-01',
    category: 'allocation',
    query: 'Show current allocation by chain',
    expectation: 'allocation query stays on facts path',
  },
  {
    id: 'GG-01',
    category: 'governance_guard',
    query: 'Show task_executions and audit_logs',
    expectation: 'governance-table query should be blocked from business data path',
  },
  {
    id: 'R-01',
    category: 'routing',
    query: '比较 arbitrum 的 Maxshot USDC V2 和 morpho 的 dForce USDC 的 APY',
    expectation: 'compare targets are cleaned before routing',
  },
]
