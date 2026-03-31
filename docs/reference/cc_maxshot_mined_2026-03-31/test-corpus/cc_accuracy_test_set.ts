/**
 * Accuracy Test Set
 *
 * 职责：定义准确率测试用例（50+ 问题）
 *
 * 依据 FSD 00.1 One-Pager System Intent v1.0
 *
 * 技能标记：_v1.0_skill_supabase-postgres_v1.0_source_cc-team.md
 */

// =====================================================
// 类型定义
// =====================================================

/**
 * 测试用例
 */
export interface TestCase {
  id: string
  query: string
  expected_intent_type: string
  expected_template_id: string | null
  expected_params: Record<string, unknown>
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

/**
 * 测试结果
 */
export interface TestResult {
  test_id: string
  query: string
  expected_intent_type: string
  actual_intent_type?: string
  expected_template_id: string | null
  actual_template_id?: string
  intent_match: boolean
  template_match: boolean
  params_match: boolean
  overall_match: boolean
  errors: string[]
}

/**
 * 准确率报告
 */
export interface AccuracyReport {
  total_tests: number
  intent_matches: number
  template_matches: number
  params_matches: number
  overall_matches: number
  intent_accuracy: number
  template_accuracy: number
  params_accuracy: number
  overall_accuracy: number
  results_by_difficulty: {
    easy: { total: number; matches: number }
    medium: { total: number; matches: number }
    hard: { total: number; matches: number }
  }
  results_by_category: Record<string, { total: number; matches: number }>
  failed_tests: TestResult[]
}

// =====================================================
// 测试用例 (50+ questions)
// =====================================================

/**
 * 准确率测试集 - 50+ 问题
 *
 * 覆盖范围：
 * 1. 金库查询（ops_query）
 * 2. 性能指标（performance_metrics）
 * 3. 交易历史（recent_transactions）
 * 4. APY 对比（apy_comparison）
 * 5. 边界条件和复杂查询
 * 6. 不同表达方式和歧义查询
 */
export const ACCURACY_TEST_SET: TestCase[] = [
  // ======================================
  // Category 1: 金库列表查询 (15 questions)
  // ======================================
  {
    id: 'T001',
    query: '查询所有金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T002',
    query: '显示金库列表',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T003',
    query: '所有金库信息',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T004',
    query: '金库一览',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T005',
    query: '有哪些金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T006',
    query: '查询前 20 个金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 20, has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T007',
    query: '显示 15 个金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 15, has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T008',
    query: '获取金库数据',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T009',
    query: '列出所有 vaults',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T010',
    query: '我看看金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { has_limit: true },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T011',
    query: '金库在哪里',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'medium',
    category: 'vault_list',
  },
  {
    id: 'T012',
    query: '给我看看所有金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T013',
    query: '查看全部金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T014',
    query: '金库总量',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'easy',
    category: 'vault_list',
  },
  {
    id: 'T015',
    query: '总共有多少金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'easy',
    category: 'vault_list',
  },

  // ======================================
  // Category 2: 金库详情查询 (10 questions)
  // ======================================
  {
    id: 'T016',
    query: '查询 USDT 金库的详细信息',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T017',
    query: '查看 USDT vault 详情',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T018',
    query: 'USDT 金库详情',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T019',
    query: '显示 USDT 金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T020',
    query: '这个 USDT 金库怎么样',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T021',
    query: 'USDT vault 的信息',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T022',
    query: '查看 ETH 金库详情',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'eth', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T023',
    query: 'ETH vault 信息',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'eth', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T024',
    query: '查询 BTC 金库',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'btc', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },
  {
    id: 'T025',
    query: 'BTC vault 详情',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T2_OPS_VAULT_DETAIL',
    expected_params: { chain: 'btc', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'vault_detail',
  },

  // ======================================
  // Category 3: 性能指标查询 (8 questions)
  // ======================================
  {
    id: 'T026',
    query: '所有金库的性能指标',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'easy',
    category: 'performance_metrics',
  },
  {
    id: 'T027',
    query: '性能汇总',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'easy',
    category: 'performance_metrics',
  },
  {
    id: 'T028',
    query: 'APY 对比分析',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'easy',
    category: 'performance_metrics',
  },
  {
    id: 'T029',
    query: '收益率对比',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'easy',
    category: 'performance_metrics',
  },
  {
    id: 'T030',
    query: '每个金库的表现',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'medium',
    category: 'performance_metrics',
  },
  {
    id: 'T031',
    query: '查看性能数据',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'easy',
    category: 'performance_metrics',
  },
  {
    id: 'T032',
    query: '收益分析',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'medium',
    category: 'performance_metrics',
  },
  {
    id: 'T033',
    query: '金库收益率统计',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'medium',
    category: 'performance_metrics',
  },

  // ======================================
  // Category 4: 交易历史查询 (8 questions)
  // ======================================
  {
    id: 'T034',
    query: 'USDT 金库最近交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T035',
    query: '最新的 10 笔交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T036',
    query: '交易历史记录',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T037',
    query: '查看最近交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T038',
    query: '最新的交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T039',
    query: '最近的 5 笔交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 5, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T040',
    query: '查看最新 20 笔交易',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 20, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },
  {
    id: 'T041',
    query: '交易记录',
    expected_intent_type: 'recent_transactions',
    expected_template_id: 'T4_OPS_RECENT_TRANSACTIONS',
    expected_params: { chain: 'usdt', limit: 10, offset: 0 },
    difficulty: 'medium',
    category: 'transactions',
  },

  // ======================================
  // Category 5: APY 对比查询 (7 questions)
  // ======================================
  {
    id: 'T042',
    query: '对比所有 USDT 金库的 APY',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T043',
    query: 'USDT 金库 APY 对比',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T044',
    query: '哪个金库 APY 最高',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T045',
    query: '最高 APY 的金库',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T046',
    query: '对比 ETH 金库收益率',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'eth' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T047',
    query: '收益率最高的金库',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },
  {
    id: 'T048',
    query: '比较各金库 APY',
    expected_intent_type: 'apy_comparison',
    expected_template_id: 'T5_OPS_APY_COMPARISON',
    expected_params: { chain: 'usdt' },
    difficulty: 'medium',
    category: 'apy_comparison',
  },

  // ======================================
  // Category 6: 边界条件和歧义查询 (7 questions)
  // ======================================
  {
    id: 'T049',
    query: '',
    expected_intent_type: 'ops_query',
    expected_template_id: null,
    expected_params: {},
    difficulty: 'easy',
    category: 'edge_case',
  },
  {
    id: 'T050',
    query: '   ',
    expected_intent_type: 'ops_query',
    expected_template_id: null,
    expected_params: {},
    difficulty: 'easy',
    category: 'edge_case',
  },
  {
    id: 'T051',
    query: '查一下',
    expected_intent_type: 'ops_query',
    expected_template_id: null,
    expected_params: {},
    difficulty: 'medium',
    category: 'edge_case',
  },
  {
    id: 'T052',
    query: '显示给我看',
    expected_intent_type: 'ops_query',
    expected_template_id: null,
    expected_params: {},
    difficulty: 'medium',
    category: 'edge_case',
  },
  {
    id: 'T053',
    query: '查询 vaults',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'medium',
    category: 'edge_case',
  },
  {
    id: 'T054',
    query: 'vaults 列表',
    expected_intent_type: 'ops_query',
    expected_template_id: 'T1_OPS_VAULT_LIST',
    expected_params: { limit: 10 },
    difficulty: 'medium',
    category: 'edge_case',
  },
  {
    id: 'T055',
    query: '看看 APY',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'medium',
    category: 'edge_case',
  },
  {
    id: 'T056',
    query: '性能怎么样',
    expected_intent_type: 'performance_metrics',
    expected_template_id: 'T3_OPS_PERFORMANCE_METRICS',
    expected_params: {},
    difficulty: 'medium',
    category: 'edge_case',
  },
]

// =====================================================
// 工具函数
// =====================================================

/**
 * 获取测试用例数量
 */
export function getTestCount(): number {
  return ACCURACY_TEST_SET.length
}

/**
 * 按难度分组获取测试用例
 */
export function getTestsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): TestCase[] {
  return ACCURACY_TEST_SET.filter(t => t.difficulty === difficulty)
}

/**
 * 按分类获取测试用例
 */
export function getTestsByCategory(category: string): TestCase[] {
  return ACCURACY_TEST_SET.filter(t => t.category === category)
}

/**
 * 获取测试用例
 */
export function getTestById(testId: string): TestCase | undefined {
  return ACCURACY_TEST_SET.find(t => t.id === testId)
}

/**
 * 获取所有测试用例
 */
export function getAllTests(): TestCase[] {
  return ACCURACY_TEST_SET
}
