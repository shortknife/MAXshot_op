import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_TABLES = [
  'market_metrics',
  'allocation_snapshots',
  'executions',
  'rebalance_decisions',
  'data_query_logs',
]

function parseTables() {
  const raw = process.env.BUSINESS_SCHEMA_TABLES
  if (!raw) return DEFAULT_TABLES
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function groupColumns(rows) {
  const map = new Map()
  for (const row of rows) {
    const table = row.table_name
    if (!map.has(table)) map.set(table, [])
    map.get(table).push(row)
  }
  return map
}

function formatType(row) {
  if (row.data_type === 'USER-DEFINED') {
    return row.udt_name
  }
  return row.data_type
}

function buildCreateTable(table, cols) {
  const lines = cols.map((c) => {
    const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : ''
    return `  ${c.column_name} ${formatType(c)}${nullable}`
  })
  return `CREATE TABLE ${table} (\n${lines.join(',\n')}\n);\n`
}

async function loadLocalEnv() {
  const envPath = `${process.cwd()}/.env.local`
  try {
    const content = await readFile(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // Ignore missing .env.local; caller will validate required vars.
  }
}

async function main() {
  await loadLocalEnv()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  const tables = parseTables()
  if (!tables.length) {
    throw new Error('No tables configured')
  }

  const tableArrayLiteral = `{${tables.join(',')}}`
  const sql = `
    select table_name, column_name, data_type, is_nullable, udt_name, ordinal_position
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any ($1::text[])
    order by table_name asc, ordinal_position asc
  `
  const { data, error } = await supabase.rpc('sql_template_query', {
    sql,
    params: [tableArrayLiteral],
  })

  if (error) {
    throw new Error(error.message)
  }

  const grouped = groupColumns(Array.isArray(data) ? data : [])
  let ddl = '-- Auto-generated business schema (public)\n\n'
  for (const table of tables) {
    const cols = grouped.get(table)
    if (!cols || !cols.length) continue
    ddl += buildCreateTable(table, cols) + '\n'
  }

  const outPath = `${process.cwd()}/docs/status/BUSINESS_SCHEMA_DDL.sql`
  await writeFile(outPath, ddl, 'utf8')
  console.log(`Wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
