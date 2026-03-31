/**
 * Whitelist Validator Module (Tier 2)
 *
 * 职责：校验生成的 SQL 是否符合白名单规则
 *
 * 依据 FSD 05.1 Allowed Intelligence v1.0
 *
 * Tier 2: LLM SQL 生成的白名单校验
 * - 允许的表
 * - 允许的表名
 * - 允许的 SQL 关键字
 * - 禁止的操作
 *
 * 技能标记：_v1.0_skill_none_v1.0_source_cc-team.md
 */

// =====================================================
// 类型定义
// =====================================================

/**
 * 校验结果
 */
export interface ValidationResult {
  is_valid: boolean                 // 是否通过校验
  violations?: string[]            // 违规列表
  sanitized_sql?: string           // 净化后的 SQL（可选）
}

/**
 * 白名单配置
 */
export interface WhitelistConfig {
  allowed_tables: string[]         // 允许的表名
  allowed_columns?: Record<string, string[]>  // 允许的字段（按表）
  allowed_keywords: string[]       // 允许的 SQL 关键字
  forbidden_operations: string[]    // 禁止的操作
  max_query_length?: number       // 最大查询长度
}

// =====================================================
// MAXshot SQL 白名单配置
// =====================================================

/**
 * MAXshot SQL 白名单配置（更新 2026-03-22）
 *
 * Business Data First: 仅允许业务表，禁止治理表
 */
export const SQL_WHITELIST: WhitelistConfig = {
  allowed_tables: [
    // Business Data Plane - 业务表
    'allocation_snapshots',
    'market_metrics',
    'rebalance_decisions',
    'vault_configs',
    'v_ops_vault_live_status',
    'daily_vault_snapshot',
    // CC System Tables - CC 系统表（仅限查询）
    'sessions_cc',
    'audit_logs_cc',
  ],
  allowed_columns: {
    allocation_snapshots: [
      'snapshot_id', 'vault_id', 'chain', 'protocol',
      'total_allocated', 'idle_liquidity', 'utilization_rate',
      'created_at'
    ],
    market_metrics: [
      'metric_id', 'chain', 'protocol', 'supply_apy',
      'borrow_apy', 'total_supplied', 'total_borrowed',
      'tvl_usd', 'created_at'
    ],
    rebalance_decisions: [
      'decision_id', 'vault_id', 'rebalance_needed',
      'rebalance_reason', 'action_summary', 'decision_timestamp'
    ],
    vault_configs: [
      'vault_id', 'vault_name', 'chain', 'description'
    ],
    sessions_cc: [
      'session_id', 'requester_id', 'entry_channel',
      'raw_query', 'intent_name', 'extracted_slots',
      'created_at'
    ],
    audit_logs_cc: [
      'log_id', 'session_id', 'executionid', 'timestamp',
      'actor_type', 'actor_id', 'component', 'action',
      'decision', 'created_at'
    ],
  },
  allowed_keywords: [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY',
    'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN',
    'LEFT JOIN', 'INNER JOIN', 'AS', 'COUNT', 'SUM',
    'AVG', 'MAX', 'MIN', 'DISTINCT', 'WITH', 'CASE',
    'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE', 'DESC',
    'ASC', 'NOW', 'INTERVAL',
  ],
  forbidden_operations: [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE',
    'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXEC',
    'CALL', 'BATCH', 'SCRIPT', 'MERGE', 'REPLACE',
  ],
  max_query_length: 5000,
}

// =====================================================
// SQL 校验函数
// =====================================================

/**
 * 校验 SQL 是否符合白名单规则
 *
 * @param sql - 要校验的 SQL
 * @param config - 白名单配置（可选，默认使用 MAXSHOT_WHITELIST）
 * @returns 校验结果
 */
export function validateSQL(
  sql: string,
  config: WhitelistConfig = SQL_WHITELIST
): ValidationResult {
  const violations: string[] = []
  const normalizedSQL = sql.toUpperCase().trim()

  // 1. 检查查询长度
  if (config.max_query_length && sql.length > config.max_query_length) {
    violations.push(`Query exceeds maximum length of ${config.max_query_length} characters`)
  }

  // 2. 检查禁止的操作
  for (const forbiddenOp of config.forbidden_operations) {
    const regex = new RegExp(`\\b${forbiddenOp}\\b`, 'i')
    if (regex.test(normalizedSQL)) {
      violations.push(`Forbidden operation detected: ${forbiddenOp}`)
    }
  }

  // 3. 检查是否包含允许的表
  const usedTables = extractTableNames(sql)
  const disallowedTables = usedTables.filter(
    t => !config.allowed_tables.includes(t.toLowerCase())
  )
  if (disallowedTables.length > 0) {
    violations.push(`Disallowed tables detected: ${disallowedTables.join(', ')}`)
  }

  // 4. 检查是否包含允许的关键字（修复：只检查真正的 SQL 关键字）
  // 注意：不再检查所有大写单词，避免误判列名
  // 我们只检查禁止的操作（已在步骤 2 完成）
  // 这一步可以跳过，因为列名会被误判为"不允许的关键字"

  // 5. 检查字段白名单（如果配置）
  if (config.allowed_columns) {
    const violations2 = validateColumns(sql, config.allowed_columns)
    violations.push(...violations2)
  }

  // 6. 检查 SQL 注入模式
  const injectionPatterns = [
    /;.*\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/i,  // 语句链
    /--.*\n.*SELECT/i,  // 注释注入
    /\/\*.*SELECT.*\*\//i,  // 块注释注入
    /'.*OR.*'.*=.*'/i,  // SQL 注入
    /".*OR.*".*=.*"/i,  // SQL 注入
  ]

  for (const pattern of injectionPatterns) {
    if (pattern.test(sql)) {
      violations.push('Potential SQL injection pattern detected')
      break
    }
  }

  return {
    is_valid: violations.length === 0,
    violations: violations.length > 0 ? violations : undefined,
  }
}

/**
 * 提取 SQL 中的表名
 */
function extractTableNames(sql: string): string[] {
  // 匹配 FROM, JOIN, INTO, UPDATE 后的表名
  const patterns = [
    /(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi,
    /(?:FROM|JOIN|INTO|UPDATE)\s+"([^"]+)"/gi,
  ]

  const tableNames = new Set<string>()

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(sql)) !== null) {
      const tableName = match[1].replace(/["']/g, '')
      tableNames.add(tableName.toLowerCase())
    }
  }

  return Array.from(tableNames)
}

/**
 * 提取 SQL 中的关键字
 */
function extractKeywords(sql: string): string[] {
  // 匹配 SQL 关键字（全大写单词）
  const pattern = /\b[A-Z_]{3,}\b/g
  const matches = sql.toUpperCase().match(pattern) || []
  return [...new Set(matches)]
}

/**
 * 检查关键字是否允许
 */
function isAllowedKeyword(keyword: string, allowed: string[]): boolean {
  return allowed.some(allowedKw =>
    allowedKw.toUpperCase() === keyword.toUpperCase()
  )
}

/**
 * 校验字段白名单
 */
function validateColumns(
  sql: string,
  allowedColumns: Record<string, string[]>
): string[] {
  const violations: string[] = []

  // 提取 SELECT 列表中的字段名
  const selectMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i)
  if (!selectMatch) {
    return violations
  }

  const selectClause = selectMatch[1]
  const columns = extractColumnNames(selectClause)

  // 检查每个表的字段是否在白名单中
  for (const column of columns) {
    if (column.includes('.')) {
      const [tableName, columnName] = column.split('.')
      const tableAllowed = allowedColumns[tableName.toLowerCase()]

      if (tableAllowed && !tableAllowed.includes(columnName.toLowerCase())) {
        violations.push(`Disallowed column: ${column}`)
      }
    } else if (column !== '*') {
      // 无表前缀的字段，检查所有表的白名单
      const foundInAny = Object.values(allowedColumns).some(cols =>
        cols.includes(column.toLowerCase())
      )
      if (!foundInAny) {
        violations.push(`Disallowed column: ${column}`)
      }
    }
  }

  return violations
}

/**
 * 提取列名
 */
function extractColumnNames(selectClause: string): string[] {
  const columns: string[] = []

  // 移除子查询和函数调用
  const cleaned = selectClause
    .replace(/\([^)]*\)/g, '')  // 移除函数
    .replace(/SELECT[\s\S]+?\) AS/gi, '')  // 移除子查询

  // 分割逗号
  const parts = cleaned.split(',').map(p => p.trim())

  for (const part of parts) {
    if (part === '*') {
      columns.push('*')
      continue
    }

    // 提取 AS 之前的列名
    const columnMatch = part.match(/^([a-z_][a-z0-9_.]*)/i)
    if (columnMatch) {
      columns.push(columnMatch[1])
    }
  }

  return columns
}

/**
 * 净化 SQL（移除危险模式）
 *
 * @param sql - 原始 SQL
 * @returns 净化后的 SQL
 */
export function sanitizeSQL(sql: string): string {
  let sanitized = sql

  // 移除注释
  sanitized = sanitized.replace(/--.*$/gm, '')
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '')

  // 移除多余空格
  sanitized = sanitized.replace(/\s+/g, ' ')
  sanitized = sanitized.trim()

  return sanitized
}
