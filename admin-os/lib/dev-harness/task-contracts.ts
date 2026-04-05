import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type TaskContractStatus = 'draft' | 'active' | 'accepted' | 'frozen'

export type TaskContract = {
  slug: string
  title: string
  status: TaskContractStatus
  owner: string
  created_at: string
  updated_at: string
  category: string
  scope_paths: string[]
  verification: string[]
  freeze_when: string[]
  file_path: string
  body: string
  sections: Record<string, string>
}

const REQUIRED_FRONTMATTER = [
  'slug',
  'title',
  'status',
  'owner',
  'created_at',
  'updated_at',
  'category',
  'scope_paths',
  'verification',
  'freeze_when',
] as const

const REQUIRED_SECTIONS = ['Goal', 'In Scope', 'Out Of Scope', 'Acceptance', 'Evidence'] as const
const VALID_STATUSES = new Set<TaskContractStatus>(['draft', 'active', 'accepted', 'frozen'])

function parseScalar(raw: string): string | boolean {
  const value = raw.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

function parseFrontmatterBlock(input: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  let currentKey: string | null = null

  for (const line of input.split('\n')) {
    if (!line.trim()) continue
    if (/^\s+-\s+/.test(line)) {
      if (!currentKey) throw new Error(`List item found before key: ${line}`)
      const existing = result[currentKey]
      if (!Array.isArray(existing)) result[currentKey] = []
      ;(result[currentKey] as unknown[]).push(line.replace(/^\s+-\s+/, '').trim())
      continue
    }

    const idx = line.indexOf(':')
    if (idx === -1) throw new Error(`Invalid frontmatter line: ${line}`)
    const key = line.slice(0, idx).trim()
    const rawValue = line.slice(idx + 1).trim()
    currentKey = key
    if (!rawValue) {
      result[key] = []
      continue
    }
    result[key] = parseScalar(rawValue)
  }

  return result
}

function parseSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const matches = [...body.matchAll(/^##\s+(.+)$/gm)]
  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index]?.[1]?.trim()
    if (!heading) continue
    const start = (matches[index]?.index ?? 0) + (matches[index]?.[0]?.length ?? 0)
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? body.length) : body.length
    sections[heading] = body.slice(start, end).trim()
  }
  return sections
}

export function parseTaskContractFile(filePath: string, raw: string): TaskContract {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${filePath}: missing frontmatter block`)

  const frontmatter = parseFrontmatterBlock(match[1] ?? '')
  const body = (match[2] ?? '').trim()
  const sections = parseSections(body)

  for (const key of REQUIRED_FRONTMATTER) {
    if (!(key in frontmatter)) throw new Error(`${filePath}: missing frontmatter field '${key}'`)
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!sections[section]) throw new Error(`${filePath}: missing section '## ${section}'`)
  }

  const status = String(frontmatter.status)
  if (!VALID_STATUSES.has(status as TaskContractStatus)) {
    throw new Error(`${filePath}: invalid status '${status}'`)
  }

  const scopePaths = frontmatter.scope_paths
  const verification = frontmatter.verification
  const freezeWhen = frontmatter.freeze_when
  if (!Array.isArray(scopePaths) || scopePaths.length === 0) {
    throw new Error(`${filePath}: 'scope_paths' must be a non-empty list`)
  }
  if (!Array.isArray(verification) || verification.length === 0) {
    throw new Error(`${filePath}: 'verification' must be a non-empty list`)
  }
  if (!Array.isArray(freezeWhen) || freezeWhen.length === 0) {
    throw new Error(`${filePath}: 'freeze_when' must be a non-empty list`)
  }

  return {
    slug: String(frontmatter.slug),
    title: String(frontmatter.title),
    status: status as TaskContractStatus,
    owner: String(frontmatter.owner),
    created_at: String(frontmatter.created_at),
    updated_at: String(frontmatter.updated_at),
    category: String(frontmatter.category),
    scope_paths: scopePaths.map((item) => String(item)),
    verification: verification.map((item) => String(item)),
    freeze_when: freezeWhen.map((item) => String(item)),
    file_path: filePath,
    body,
    sections,
  }
}

export function getTaskContractsDir(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'dev-harness', 'contracts')
}

export function loadTaskContracts(repoRoot: string): TaskContract[] {
  const dir = getTaskContractsDir(repoRoot)
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.startsWith('_') && file !== 'README.md')
    .sort()

  return files.map((file) => {
    const filePath = path.join(dir, file)
    const raw = readFileSync(filePath, 'utf8')
    return parseTaskContractFile(path.relative(repoRoot, filePath), raw)
  })
}

export function validateTaskContracts(repoRoot: string): { ok: true; count: number; slugs: string[] } {
  const items = loadTaskContracts(repoRoot)
  const slugSet = new Set<string>()
  for (const item of items) {
    if (slugSet.has(item.slug)) throw new Error(`Duplicate task contract slug '${item.slug}'`)
    slugSet.add(item.slug)
  }
  return { ok: true, count: items.length, slugs: items.map((item) => item.slug) }
}
