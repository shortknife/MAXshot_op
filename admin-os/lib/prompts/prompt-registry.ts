import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'

export type PromptSource = 'filesystem_md'

export type PromptRecord = {
  slug: string
  name?: string
  family?: string
  description?: string
  system_prompt: string
  user_prompt_template: string
  model_config?: unknown
  version: string
  status?: string
  aliases?: string[]
  file_path?: string
  is_active?: boolean
  updated_at?: string
  updated_by?: string
}

export type PromptResolution = {
  prompt: PromptRecord
  source: PromptSource
  hash: string
}

type PromptRegistrySnapshot = {
  bySlug: Map<string, PromptResolution>
  histories: Record<string, PromptRecord[]>
}

const PROMPTS_ROOT = path.join(process.cwd(), 'prompts')
const CACHE_TTL_MS = 60_000
let cache: { expiresAt: number; snapshot: PromptRegistrySnapshot } | null = null

function toHash(prompt: PromptRecord): string {
  const material = [
    prompt.slug,
    prompt.version,
    prompt.family || '',
    prompt.system_prompt,
    prompt.user_prompt_template,
    JSON.stringify(prompt.model_config || {}),
  ].join('::')
  return createHash('sha256').update(material).digest('hex')
}

function compareVersionDesc(a: string, b: string): number {
  const an = Number(a)
  const bn = Number(b)
  if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an
  return b.localeCompare(a)
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkMarkdownFiles(fullPath))
      continue
    }
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.md')) continue
    if (entry.name === 'README.md') continue
    files.push(fullPath)
  }
  return files
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '').replace(/^\s+/, '')
  if (!normalized.startsWith('---\n')) {
    return { meta: {}, body: normalized }
  }
  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) {
    return { meta: {}, body: normalized }
  }
  const header = normalized.slice(4, end)
  const body = normalized.slice(end + 5)
  const meta = Object.fromEntries(
    header
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(':')
        if (idx === -1) return [line, '']
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
      }),
  )
  return { meta, body }
}

function extractSection(body: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?:^|\\n)## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, 'm')
  const match = body.match(regex)
  return match ? match[1].trim() : ''
}

function parseModelConfig(section: string): unknown {
  const codeFence = section.match(/```json\n([\s\S]*?)\n```/)
  const source = (codeFence ? codeFence[1] : section).trim()
  if (!source) return {}
  try {
    return JSON.parse(source)
  } catch {
    return { raw: source }
  }
}

function parseAliases(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadPromptFile(filePath: string): Promise<PromptRecord | null> {
  const raw = await fs.readFile(filePath, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const slug = String(meta.slug || '').trim()
  if (!slug) return null
  const version = String(meta.version || '1').trim()
  const status = String(meta.status || 'active').trim() || 'active'
  const title = String(meta.title || slug).trim()
  const description = extractSection(body, 'Description') || undefined
  const systemPrompt = extractSection(body, 'System Prompt')
  const userPromptTemplate = extractSection(body, 'User Prompt Template')
  return {
    slug,
    name: title,
    family: String(meta.family || '').trim() || undefined,
    description,
    system_prompt: systemPrompt,
    user_prompt_template: userPromptTemplate,
    model_config: parseModelConfig(extractSection(body, 'Model Config')),
    version,
    status,
    aliases: parseAliases(meta.aliases),
    file_path: path.relative(process.cwd(), filePath),
    is_active: status === 'active',
  }
}

async function loadPromptRegistrySnapshot(): Promise<PromptRegistrySnapshot> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.snapshot

  const files = await walkMarkdownFiles(PROMPTS_ROOT)
  const records = (await Promise.all(files.map((filePath) => loadPromptFile(filePath))))
    .filter((item): item is PromptRecord => Boolean(item))

  const grouped = new Map<string, PromptRecord[]>()
  for (const record of records) {
    const current = grouped.get(record.slug) || []
    current.push(record)
    grouped.set(record.slug, current)
  }

  const histories: Record<string, PromptRecord[]> = {}
  const bySlug = new Map<string, PromptResolution>()

  for (const [slug, versions] of grouped.entries()) {
    versions.sort((a, b) => {
      if ((a.is_active === true) !== (b.is_active === true)) return a.is_active ? -1 : 1
      return compareVersionDesc(a.version, b.version)
    })
    histories[slug] = versions
    const active = versions.find((item) => item.is_active) || versions[0]
    if (!active) continue
    const resolved: PromptResolution = {
      prompt: active,
      source: 'filesystem_md',
      hash: toHash(active),
    }
    bySlug.set(slug, resolved)
    for (const alias of active.aliases || []) {
      bySlug.set(alias, resolved)
    }
  }

  const snapshot = { bySlug, histories }
  cache = { expiresAt: now + CACHE_TTL_MS, snapshot }
  return snapshot
}

export async function getPromptBySlug(slug: string): Promise<PromptResolution | null> {
  const key = slug.trim()
  if (!key) return null
  const snapshot = await loadPromptRegistrySnapshot()
  return snapshot.bySlug.get(key) || null
}

export async function loadPromptHistories(): Promise<Record<string, PromptRecord[]>> {
  return (await loadPromptRegistrySnapshot()).histories
}

export async function loadActivePromptInventory(): Promise<PromptRecord[]> {
  const snapshot = await loadPromptRegistrySnapshot()
  return Object.values(snapshot.histories)
    .map((versions) => versions.find((item) => item.is_active) || versions[0])
    .filter((item): item is PromptRecord => Boolean(item))
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

export function clearPromptCache() {
  cache = null
}
