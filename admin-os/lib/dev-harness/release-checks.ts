import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type ReleaseCheckStatus = 'draft' | 'accepted' | 'superseded'

export type ReleaseCheck = {
  slug: string
  title: string
  status: ReleaseCheckStatus
  owner: string
  created_at: string
  updated_at: string
  contract_slugs: string[]
  feedback_slugs: string[]
  required_commands: string[]
  required_artifacts: string[]
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
  'contract_slugs',
  'feedback_slugs',
  'required_commands',
  'required_artifacts',
] as const

const REQUIRED_SECTIONS = ['Goal', 'Checklist', 'Evidence', 'Blockers', 'Freeze Recommendation'] as const
const VALID_STATUSES = new Set<ReleaseCheckStatus>(['draft', 'accepted', 'superseded'])

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

export function getReleaseChecksDir(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'dev-harness', 'release-checks')
}

export function parseReleaseCheckFile(filePath: string, raw: string): ReleaseCheck {
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
  if (!VALID_STATUSES.has(status as ReleaseCheckStatus)) {
    throw new Error(`${filePath}: invalid status '${status}'`)
  }

  const contractSlugs = frontmatter.contract_slugs
  const feedbackSlugs = frontmatter.feedback_slugs
  const requiredCommands = frontmatter.required_commands
  const requiredArtifacts = frontmatter.required_artifacts

  for (const [key, value] of Object.entries({
    contract_slugs: contractSlugs,
    feedback_slugs: feedbackSlugs,
    required_commands: requiredCommands,
    required_artifacts: requiredArtifacts,
  })) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`${filePath}: '${key}' must be a non-empty list`)
    }
  }

  const contractSlugList = contractSlugs as unknown[]
  const feedbackSlugList = feedbackSlugs as unknown[]
  const requiredCommandList = requiredCommands as unknown[]
  const requiredArtifactList = requiredArtifacts as unknown[]

  return {
    slug: String(frontmatter.slug),
    title: String(frontmatter.title),
    status: status as ReleaseCheckStatus,
    owner: String(frontmatter.owner),
    created_at: String(frontmatter.created_at),
    updated_at: String(frontmatter.updated_at),
    contract_slugs: contractSlugList.map((item) => String(item)),
    feedback_slugs: feedbackSlugList.map((item) => String(item)),
    required_commands: requiredCommandList.map((item) => String(item)),
    required_artifacts: requiredArtifactList.map((item) => String(item)),
    file_path: filePath,
    body,
    sections,
  }
}

export function loadReleaseChecks(repoRoot: string): ReleaseCheck[] {
  const dir = getReleaseChecksDir(repoRoot)
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.startsWith('_') && file !== 'README.md')
    .sort()

  return files.map((file) => {
    const filePath = path.join(dir, file)
    const raw = readFileSync(filePath, 'utf8')
    return parseReleaseCheckFile(path.relative(repoRoot, filePath), raw)
  })
}

export function validateReleaseChecks(
  repoRoot: string,
  refs?: { contractSlugs?: Iterable<string>; feedbackSlugs?: Iterable<string> },
): { ok: true; count: number; slugs: string[] } {
  const items = loadReleaseChecks(repoRoot)
  const slugSet = new Set<string>()
  const contractSet = refs?.contractSlugs ? new Set(refs.contractSlugs) : null
  const feedbackSet = refs?.feedbackSlugs ? new Set(refs.feedbackSlugs) : null

  for (const item of items) {
    if (slugSet.has(item.slug)) throw new Error(`Duplicate release check slug '${item.slug}'`)
    slugSet.add(item.slug)

    if (contractSet) {
      for (const slug of item.contract_slugs) {
        if (!contractSet.has(slug)) throw new Error(`${item.file_path}: unknown contract_slug '${slug}'`)
      }
    }
    if (feedbackSet) {
      for (const slug of item.feedback_slugs) {
        if (!feedbackSet.has(slug)) throw new Error(`${item.file_path}: unknown feedback_slug '${slug}'`)
      }
    }
  }

  return { ok: true, count: items.length, slugs: items.map((item) => item.slug) }
}
