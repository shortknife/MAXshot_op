import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { SqlTemplateMeta, SqlTemplateRecord } from './types'

const cache = new Map<string, SqlTemplateRecord>()

function resolveTemplateDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'admin-os', 'sql-templates'),
    path.resolve(process.cwd(), 'sql-templates'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}

const TEMPLATE_DIR = resolveTemplateDir()

function ensureDefaults(meta: any) {
  if (!meta.category) meta.category = 'other'
  if (!meta.version) meta.version = '1.0'
  if (!meta.examples) meta.examples = []
  return meta
}

function assertSafeTemplateId(templateId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(templateId)) {
    throw new Error('invalid_template_id')
  }
}

function computeHash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function listSqlTemplates(): SqlTemplateMeta[] {
  if (!fs.existsSync(TEMPLATE_DIR)) return []
  const entries = fs.readdirSync(TEMPLATE_DIR)
  return entries
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const raw = fs.readFileSync(path.join(TEMPLATE_DIR, name), 'utf-8')
      return ensureDefaults(JSON.parse(raw)) as SqlTemplateMeta
    })
}

export function loadSqlTemplate(templateId: string): SqlTemplateRecord {
  assertSafeTemplateId(templateId)
  if (cache.has(templateId)) {
    return cache.get(templateId) as SqlTemplateRecord
  }
  const metaPath = path.join(TEMPLATE_DIR, `${templateId}.json`)
  const sqlPath = path.join(TEMPLATE_DIR, `${templateId}.sql`)
  if (!fs.existsSync(metaPath) || !fs.existsSync(sqlPath)) {
    throw new Error('template_not_found')
  }
  const metaRaw = fs.readFileSync(metaPath, 'utf-8')
  const sqlRaw = fs.readFileSync(sqlPath, 'utf-8')
  const meta = ensureDefaults(JSON.parse(metaRaw)) as SqlTemplateMeta
  const sql = sqlRaw.trim()
  const hash = computeHash(`${metaRaw}
${sql}`)
  const record = { meta, sql, path: sqlPath, hash }
  cache.set(templateId, record)
  return record
}
