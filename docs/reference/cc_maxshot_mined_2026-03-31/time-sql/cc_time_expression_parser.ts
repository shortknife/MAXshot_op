/**
 * 时间表达式解析器
 *
 * 用途：将自然语言中的时间表达式转换为 PostgreSQL 时间范围表达式
 * 支持：最近 N 天、本周、上周、昨天、今天等常见模式
 *
 * 示例：
 * - "最近 7 天" → "created_at >= NOW() - INTERVAL '7 days'"
 * - "本周" → "created_at >= date_trunc('week', NOW())"
 * - "昨天" → "created_at >= date_trunc('day', NOW() - INTERVAL '1 day')"
 *
 * @author Claude Code (CC)
 * @created 2026-03-21
 * @version 1.0
 */

export interface TimeRange {
  start_time: string // PostgreSQL 表达式
  end_time: string // PostgreSQL 表达式
  description: string // 中文描述
}

export interface ParsedTimeExpression {
  time_range: TimeRange
  confidence: number // 0-1
  original_expression: string // 原始表达式
}

/**
 * 时间表达式模式匹配规则
 */
const TIME_PATTERNS = [
  // 模式 1: 最近 N 天/周/月/年
  {
    pattern: /最近\s+(\d+)\s*(天|周|月|年)/,
    handler: (match: RegExpMatchArray) => {
      const num = parseInt(match[1])
      const unit = match[2]
      const unitMap: Record<string, string> = {
        '天': 'day',
        '周': 'week',
        '月': 'month',
        '年': 'year'
      }
      const pgUnit = unitMap[unit]
      return {
        start_time: `NOW() - INTERVAL '${num} ${pgUnit}'`,
        end_time: 'NOW()',
        description: `最近 ${num} ${unit}`
      }
    }
  },

  // 模式 2: 本周/上周
  {
    pattern: /(本|上)周/,
    handler: (match: RegExpMatchArray) => {
      const prefix = match[1]
      if (prefix === '本') {
        return {
          start_time: "date_trunc('week', NOW())",
          end_time: 'NOW()',
          description: '本周'
        }
      } else {
        return {
          start_time: "date_trunc('week', NOW() - INTERVAL '1 week')",
          end_time: "date_trunc('week', NOW())",
          description: '上周'
        }
      }
    }
  },

  // 模式 3: 本月/上月
  {
    pattern: /(本|上)月/,
    handler: (match: RegExpMatchArray) => {
      const prefix = match[1]
      if (prefix === '本') {
        return {
          start_time: "date_trunc('month', NOW())",
          end_time: 'NOW()',
          description: '本月'
        }
      } else {
        return {
          start_time: "date_trunc('month', NOW() - INTERVAL '1 month')",
          end_time: "date_trunc('month', NOW())",
          description: '上月'
        }
      }
    }
  },

  // 模式 4: 昨天/今天
  {
    pattern: /(昨|今)天/,
    handler: (match: RegExpMatchArray) => {
      const prefix = match[1]
      if (prefix === '今') {
        return {
          start_time: "date_trunc('day', NOW())",
          end_time: 'NOW()',
          description: '今天'
        }
      } else {
        return {
          start_time: "date_trunc('day', NOW() - INTERVAL '1 day')",
          end_time: "date_trunc('day', NOW())",
          description: '昨天'
        }
      }
    }
  },

  // 模式 5: N 天前/N 周前
  {
    pattern: /(\d+)\s*(天|周)前/,
    handler: (match: RegExpMatchArray) => {
      const num = parseInt(match[1])
      const unit = match[2]
      const unitMap: Record<string, string> = {
        '天': 'day',
        '周': 'week'
      }
      const pgUnit = unitMap[unit]
      return {
        start_time: `date_trunc('day', NOW() - INTERVAL '${num} ${pgUnit}')`,
        end_time: `date_trunc('day', NOW() - INTERVAL '${num} ${pgUnit}') + INTERVAL '1 ${pgUnit}'`,
        description: `${num} ${unit}前`
      }
    }
  },

  // 模式 6: YYYY-MM-DD 格式
  {
    pattern: /(\d{4})-(\d{2})-(\d{2})/,
    handler: (match: RegExpMatchArray) => {
      const [, year, month, day] = match
      const dateStr = `${year}-${month}-${day}`
      return {
        start_time: `'${dateStr} 00:00:00'::timestamp`,
        end_time: `'${dateStr} 23:59:59'::timestamp`,
        description: `${dateStr}`
      }
    }
  }
]

/**
 * 解析时间表达式
 * @param expression - 自然语言时间表达式
 * @returns 解析结果
 */
export function parseTimeExpression(expression: string): ParsedTimeExpression | null {
  // 去除空格
  const cleaned = expression.trim()

  // 尝试匹配每个模式
  for (const { pattern, handler } of TIME_PATTERNS) {
    const match = cleaned.match(pattern)
    if (match) {
      const time_range = handler(match)
      return {
        time_range,
        confidence: 0.9,
        original_expression: expression
      }
    }
  }

  // 未匹配
  return null
}

/**
 * 生成时间 WHERE 子句
 * @param parsed - 解析结果
 * @param columnName - 列名（默认: created_at）
 * @returns SQL WHERE 子句
 */
export function generateTimeWhereClause(
  parsed: ParsedTimeExpression,
  columnName: string = 'created_at'
): string {
  const { start_time, end_time } = parsed.time_range

  return `${columnName} >= ${start_time} AND ${columnName} < ${end_time}`
}

/**
 * 批量解析（处理多个时间表达式）
 * @param expressions - 时间表达式数组
 * @returns 解析结果数组
 */
export function batchParseTimeExpressions(
  expressions: string[]
): Array<ParsedTimeExpression & { index: number }> {
  return expressions
    .map((expr, index) => {
      const parsed = parseTimeExpression(expr)
      if (parsed) {
        return { ...parsed, index }
      }
      return null
    })
    .filter((result): result is ParsedTimeExpression & { index: number } => result !== null)
}
