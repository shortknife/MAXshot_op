/**
 * SQL Generator - 时间 WHERE 子句扩展
 *
 * 用途：扩展 SQL Generator 支持时间 WHERE 子句
 * 集成：与现有白名单验证兼容
 * 支持：时间范围生成、SQL 模板扩展
 *
 * @author Claude Code (CC)
 * @created 2026-03-21
 * @version 1.0
 */

import { parseTimeExpression, generateTimeWhereClause, ParsedTimeExpression } from '../time-expressions/parser'

/**
 * SQL 模板（带时间过滤）
 */
const SQL_TEMPLATES_WITH_TIME = {
  // 查询金库分配（带时间）
  query_allocations_with_time: `
    SELECT
      vault_name,
      chain_name,
      protocol_name,
      total_allocated,
      idle_liquidity,
      created_at
    FROM allocation_snapshots
    WHERE {{TIME_WHERE}}
    ORDER BY created_at DESC
    LIMIT 100
  `,

  // 查询市场指标（带时间）
  query_market_metrics_with_time: `
    SELECT
      chain,
      protocol,
      market_name,
      base_apy,
      reward_apy,
      net_apy,
      tvl,
      created_at
    FROM market_metrics
    WHERE {{TIME_WHERE}}
    ORDER BY created_at DESC
    LIMIT 100
  `,

  // 查询再平衡决策（带时间）
  query_rebalance_decisions_with_time: `
    SELECT
      vault_name,
      rebalance_needed,
      rebalance_reason,
      action_summary,
      decision_timestamp
    FROM rebalance_decisions
    WHERE {{TIME_WHERE}}
    ORDER BY decision_timestamp DESC
    LIMIT 100
  `,

  // 聚合查询（金库汇总，带时间）
  query_vault_summary_with_time: `
    SELECT
      als.vault_name,
      SUM(als.total_allocated) as total_allocated,
      AVG(mm.base_apy) as avg_base_apy,
      COUNT(*) as record_count
    FROM allocation_snapshots als
    LEFT JOIN market_metrics mm
      ON als.execution_id = mm.execution_id
    WHERE {{TIME_WHERE}}
    GROUP BY als.vault_name
    ORDER BY total_allocated DESC
    LIMIT 10
  `
}

/**
 * 生成带时间 WHERE 的 SQL
 * @param templateName - 模板名称
 * @param timeExpression - 时间表达式（如"最近 7 天"）
 * @param tableName - 表名（用于白名单验证）
 * @returns 生成的 SQL
 */
export function generateSQLWithTimeFilter(
  templateName: keyof typeof SQL_TEMPLATES_WITH_TIME,
  timeExpression: string,
  tableName: string
): { sql: string; success: boolean; error?: string } {
  try {
    // 1. 解析时间表达式
    const parsed = parseTimeExpression(timeExpression)
    if (!parsed) {
      return {
        sql: '',
        success: false,
        error: `无法解析时间表达式: ${timeExpression}`
      }
    }

    // 2. 生成时间 WHERE 子句
    const timeWhere = generateTimeWhereClause(parsed, 'created_at')

    // 3. 应用到模板
    const template = SQL_TEMPLATES_WITH_TIME[templateName]
    const sql = template.replace('{{TIME_WHERE}}', timeWhere)

    // 4. 白名单验证（检查表名）
    const allowedTables = ['allocation_snapshots', 'market_metrics', 'rebalance_decisions', 'vault_configs']
    if (!allowedTables.includes(tableName)) {
      return {
        sql: '',
        success: false,
        error: `表名不在白名单中: ${tableName}`
      }
    }

    return {
      sql,
      success: true
    }
  } catch (error) {
    return {
      sql: '',
      success: false,
      error: String(error)
    }
  }
}

/**
 * 智能SQL生成器（根据意图和时间自动选择模板）
 * @param intent - 意图名称
 * @param slots - 槽位（包含时间范围）
 * @returns 生成的 SQL
 */
export function generateSmartSQL(
  intent: string,
  slots: {
    vault_name?: string
    chain?: string
    protocol?: string
    metric?: string
    time_range?: {
      start_time: string
      end_time: string
      description: string
    }
  }
): { sql: string; success: boolean; error?: string } {
  try {
    // 1. 选择基础模板
    let templateName: keyof typeof SQL_TEMPLATES_WITH_TIME
    if (intent === 'ops_query') {
      // 根据槽位选择模板
      if (slots.metric === 'allocation') {
        templateName = 'query_allocations_with_time'
      } else if (slots.metric === 'apy' || slots.metric === 'market') {
        templateName = 'query_market_metrics_with_time'
      } else if (slots.metric === 'rebalance') {
        templateName = 'query_rebalance_decisions_with_time'
      } else {
        templateName = 'query_vault_summary_with_time' // 默认聚合查询
      }
    } else {
      return {
        sql: '',
        success: false,
        error: `不支持的意图: ${intent}`
      }
    }

    // 2. 处理时间范围
    let timeExpression = '最近 7 天' // 默认值
    if (slots.time_range) {
      timeExpression = slots.time_range.description
    }

    // 3. 生成SQL
    const result = generateSQLWithTimeFilter(
      templateName,
      timeExpression,
      'allocation_snapshots' // 默认表名
    )

    return result
  } catch (error) {
    return {
      sql: '',
      success: false,
      error: String(error)
    }
  }
}

/**
 * 批量生成SQL（用于测试）
 */
export function batchGenerateSQL(testCases: Array<{
  query: string
  expected: { templateName: keyof typeof SQL_TEMPLATES_WITH_TIME }
}>) {
  return testCases.map(testCase => {
    const parsed = parseTimeExpression(testCase.query)
    if (!parsed) {
      return {
        query: testCase.query,
        sql: '',
        success: false,
        error: '时间表达式解析失败'
      }
    }

    const sql = generateSQLWithTimeFilter(
      testCase.expected.templateName,
      testCase.query,
      'allocation_snapshots'
    )

    return {
      query: testCase.query,
      ...sql
    }
  })
}
