import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type EvaluatorFeedbackStatus = 'draft' | 'accepted' | 'superseded'
export type EvaluatorVerdict = 'freeze' | 'continue' | 'reopen'

export type EvaluatorFeedback = {
  slug: string
  contract_slug: string
  title: string
  status: EvaluatorFeedbackStatus
  evaluator: string
  created_at: string
  updated_at: string
  verdict: EvaluatorVerdict
  evidence: string[]
  next_action: string[]
  file_path: string
  body: string
  sections: Record<string, string>
}

const REQUIRED_FRONTMATTER = [
  'slug',
  'contract_slug',
  'title',
  'status',
  'evaluator',
  'created_at',
  'updated_at',
  'verdict',
  'evidence',
  'next_action',
] as const

const REQUIRED_SECTIONS = ['Summary', 'Findings', 'Evidence', 'Closure Recommendation'] as const
const VALID_STATUSES = new Set<EvaluatorFeedbackStatus>(['draft', 'accepted', 'superseded'])
const VALID_VERDICTS = new Set<EvaluatorVerdict>(['freeze', 'continue', 'reopen'])

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

export function getEvaluatorFeedbackDir(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'dev-harness', 'eval-feedback')
}

export function parseEvaluatorFeedbackFile(filePath: string, raw: string): EvaluatorFeedback {
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
  const verdict = String(frontmatter.verdict)
  if (!VALID_STATUSES.has(status as EvaluatorFeedbackStatus)) {
    throw new Error(`${filePath}: invalid status '${status}'`)
  }
  if (!VALID_VERDICTS.has(verdict as EvaluatorVerdict)) {
    throw new Error(`${filePath}: invalid verdict '${verdict}'`)
  }

  const evidence = frontmatter.evidence
  const nextAction = frontmatter.next_action
  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new Error(`${filePath}: 'evidence' must be a non-empty list`)
  }
  if (!Array.isArray(nextAction) || nextAction.length === 0) {
    throw new Error(`${filePath}: 'next_action' must be a non-empty list`)
  }

  return {
    slug: String(frontmatter.slug),
    contract_slug: String(frontmatter.contract_slug),
    title: String(frontmatter.title),
    status: status as EvaluatorFeedbackStatus,
    evaluator: String(frontmatter.evaluator),
    created_at: String(frontmatter.created_at),
    updated_at: String(frontmatter.updated_at),
    verdict: verdict as EvaluatorVerdict,
    evidence: evidence.map((item) => String(item)),
    next_action: nextAction.map((item) => String(item)),
    file_path: filePath,
    body,
    sections,
  }
}

export function loadEvaluatorFeedback(repoRoot: string): EvaluatorFeedback[] {
  const dir = getEvaluatorFeedbackDir(repoRoot)
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.startsWith('_') && file !== 'README.md')
    .sort()

  return files.map((file) => {
    const filePath = path.join(dir, file)
    const raw = readFileSync(filePath, 'utf8')
    return parseEvaluatorFeedbackFile(path.relative(repoRoot, filePath), raw)
  })
}

export function validateEvaluatorFeedback(repoRoot: string, contractSlugs?: Iterable<string>): { ok: true; count: number; slugs: string[] } {
  const items = loadEvaluatorFeedback(repoRoot)
  const slugSet = new Set<string>()
  const contractSet = contractSlugs ? new Set(contractSlugs) : null

  for (const item of items) {
    if (slugSet.has(item.slug)) throw new Error(`Duplicate evaluator feedback slug '${item.slug}'`)
    slugSet.add(item.slug)
    if (contractSet && !contractSet.has(item.contract_slug)) {
      throw new Error(`${item.file_path}: unknown contract_slug '${item.contract_slug}'`)
    }
  }

  return { ok: true, count: items.length, slugs: items.map((item) => item.slug) }
}
