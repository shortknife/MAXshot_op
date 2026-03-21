const WRITE_KEYWORDS = /(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|VACUUM|ANALYZE|COPY)/i
const MULTI_STATEMENT = /;/
const SELECT_INTO = /\bSELECT\b[\s\S]*\bINTO\b/i

export function assertReadOnlySql(sql: string) {
  const trimmed = sql.trim()
  if (!trimmed) throw new Error('empty_sql')
  const upper = trimmed.toUpperCase()
  if (!(upper.startsWith('SELECT') || upper.startsWith('WITH'))) {
    throw new Error('sql_not_select')
  }
  if (WRITE_KEYWORDS.test(upper)) {
    throw new Error('sql_contains_write')
  }
  if (SELECT_INTO.test(upper)) {
    throw new Error('sql_select_into')
  }
  if (MULTI_STATEMENT.test(trimmed)) {
    throw new Error('sql_multi_statement')
  }
}

export function assertAllowedTables(sql: string, allowed: string[]) {
  if (!allowed || allowed.length === 0) return
  const normalizedAllowed = new Set(allowed.map((t) => t.replace(/"/g, '').toLowerCase()))
  const tableMatches = Array.from(sql.matchAll(/(from|join)\s+([a-zA-Z0-9_\."]+)/gi))
  for (const match of tableMatches) {
    const raw = match[2] || ''
    const clean = raw.replace(/"/g, '').split('.')[0].toLowerCase()
    if (!normalizedAllowed.has(clean)) {
      throw new Error('sql_table_not_allowed')
    }
  }
}
