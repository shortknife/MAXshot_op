import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export type PromptSource = 'supabase' | 'fallback_csv'

export type PromptRecord = {
  slug: string
  name?: string
  system_prompt: string
  user_prompt_template: string
  model_config?: unknown
  description?: string
  version: string
  is_active?: boolean
  updated_at?: string
  updated_by?: string
}

export type PromptResolution = {
  prompt: PromptRecord
  source: PromptSource
  hash: string
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { expiresAt: number; value: PromptResolution }>()

function toHash(prompt: PromptRecord): string {
  const material = [prompt.slug, prompt.version, prompt.system_prompt, prompt.user_prompt_template].join('::')
  return createHash('sha256').update(material).digest('hex')
}

function parseModelConfig(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed)
  } catch {
    return { raw: trimmed }
  }
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i]
    const next = raw[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (ch === '\n') {
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row)
      }
      row = []
      continue
    }

    if (ch === '\r') {
      continue
    }

    field += ch
  }

  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row)
  }

  return rows
}

function rowToPrompt(headers: string[], values: string[]): PromptRecord | null {
  const record: Record<string, string> = {}
  for (let i = 0; i < headers.length; i += 1) {
    record[headers[i]] = values[i] ?? ''
  }

  const slug = (record.slug || '').trim()
  if (!slug) return null

  const isActive = ['true', 't', '1', 'yes'].includes((record.is_active || '').toLowerCase())
  const version = (record.version || '1').trim()

  return {
    slug,
    name: (record.name || '').trim(),
    system_prompt: record.system_prompt || '',
    user_prompt_template: record.user_prompt_template || '',
    model_config: parseModelConfig(record.model_config),
    description: (record.description || '').trim(),
    version,
    is_active: isActive,
    updated_at: (record.updated_at || '').trim(),
    updated_by: (record.updated_by || '').trim(),
  }
}

function compareVersionDesc(a: string, b: string): number {
  const an = Number(a)
  const bn = Number(b)
  if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an
  return b.localeCompare(a)
}

async function loadFromFallbackCsv(slug: string): Promise<PromptResolution | null> {
  const csvPath = process.env.PROMPT_LIBRARY_FALLBACK_CSV_PATH
    ? path.resolve(process.env.PROMPT_LIBRARY_FALLBACK_CSV_PATH)
    : path.resolve(process.cwd(), '../docs/reference/maxshot/prompts/prompt_library_rows0221.csv')

  const raw = await fs.readFile(csvPath, 'utf8')
  const rows = parseCsvRows(raw)
  if (!rows.length) return null

  const headers = rows[0]
  const prompts = rows
    .slice(1)
    .map((r) => rowToPrompt(headers, r))
    .filter((v): v is PromptRecord => Boolean(v))
    .filter((p) => p.slug === slug && p.is_active)
    .sort((a, b) => compareVersionDesc(a.version, b.version))

  if (!prompts.length) return null
  const prompt = prompts[0]
  return { prompt, source: 'fallback_csv', hash: toHash(prompt) }
}

async function loadFromSupabase(slug: string): Promise<PromptResolution | null> {
  const { data, error } = await supabase
    .from('prompt_library')
    .select('slug,name,system_prompt,user_prompt_template,model_config,description,version,is_active,updated_at,updated_by')
    .eq('slug', slug)
    .eq('is_active', true)

  if (error || !data || data.length === 0) {
    if (error) {
      throw new Error(error.message)
    }
    return null
  }

  const sorted = [...data].sort((a, b) => compareVersionDesc(String(a.version || ''), String(b.version || '')))
  const row = sorted[0] as Record<string, unknown>

  const prompt: PromptRecord = {
    slug: String(row.slug || slug),
    name: String(row.name || ''),
    system_prompt: String(row.system_prompt || ''),
    user_prompt_template: String(row.user_prompt_template || ''),
    model_config: parseModelConfig(row.model_config),
    description: String(row.description || ''),
    version: String(row.version || '1'),
    is_active: Boolean(row.is_active),
    updated_at: String(row.updated_at || ''),
    updated_by: String(row.updated_by || ''),
  }

  return { prompt, source: 'supabase', hash: toHash(prompt) }
}

export async function getPromptBySlug(slug: string): Promise<PromptResolution | null> {
  const key = slug.trim()
  if (!key) return null

  const forceFallback = String(process.env.PROMPT_REGISTRY_FORCE_FALLBACK || '').toLowerCase() === 'true'
  const cached = cache.get(key)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  let resolved: PromptResolution | null = null
  if (!forceFallback) {
    try {
      resolved = await loadFromSupabase(key)
    } catch {
      resolved = null
    }
  }

  if (!resolved) {
    try {
      resolved = await loadFromFallbackCsv(key)
    } catch {
      resolved = null
    }
  }

  if (resolved) {
    cache.set(key, { value: resolved, expiresAt: now + CACHE_TTL_MS })
  }

  return resolved
}

export function clearPromptCache() {
  cache.clear()
}
