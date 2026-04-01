import fs from 'fs'
import path from 'path'

type FaqKbManifestDocument = {
  id: string
  title: string
  kb_scope?: string | null
  path: string
  keywords?: string[]
}

type FaqKbManifest = {
  registry_id: string
  version: string
  documents: FaqKbManifestDocument[]
}

type FaqSection = {
  heading: string
  body: string
}

export type FaqKbMatch = {
  source_id: string
  title: string
  kb_scope: string | null
  heading: string | null
  snippet: string
  score: number
}

const DEFAULT_MANIFEST_PATH = 'app/configs/faq-kb/faq_kb_manifest_v1.json'
const STOP_TOKENS = new Set([
  'how', 'what', 'when', 'where', 'why', 'does', 'do', 'can', 'via', 'the', 'and', 'for', 'with', 'your', 'my',
  'you', 'are', 'from', 'that', 'this', 'into', 'have', 'has', 'had', 'will', 'would', 'should', 'could',
])

function loadManifest(manifestPath = DEFAULT_MANIFEST_PATH): FaqKbManifest {
  const absPath = path.isAbsolute(manifestPath) ? manifestPath : path.join(process.cwd(), manifestPath)
  const raw = fs.readFileSync(absPath, 'utf8')
  return JSON.parse(raw) as FaqKbManifest
}

function normalizeText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim()
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_TOKENS.has(token))
}

function parseSections(content: string): FaqSection[] {
  const lines = String(content || '').split(/\r?\n/)
  const sections: FaqSection[] = []
  let currentHeading = 'Document Summary'
  let buffer: string[] = []

  const pushCurrent = () => {
    const body = buffer.join(' ').trim()
    if (body) {
      sections.push({ heading: currentHeading, body })
    }
    buffer = []
  }

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      pushCurrent()
      currentHeading = line.replace(/^##\s+/, '').trim()
      continue
    }
    if (/^#\s+/.test(line)) continue
    if (!line.trim()) continue
    buffer.push(line.trim())
  }
  pushCurrent()
  return sections
}

function scoreText(params: { query: string; keywords: string[]; title: string; heading: string; body: string }): number {
  const { query, keywords, title, heading, body } = params
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)
  let score = 0

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword)
    if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) score += 6
  }

  const titleText = normalizeText(title)
  const headingText = normalizeText(heading)
  const bodyText = normalizeText(body)

  for (const token of queryTokens) {
    if (titleText.includes(token)) score += 4
    if (headingText.includes(token)) score += 5
    if (bodyText.includes(token)) score += 1
  }

  return score
}

function buildSnippet(body: string, maxLength = 240): string {
  const text = String(body || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}…`
}

export function searchFaqKb(params: {
  question: string
  kb_scope?: string | null
  top_k?: number | null
  manifestPath?: string
}): FaqKbMatch[] {
  const { question, kb_scope = null, top_k = 3, manifestPath } = params
  const manifest = loadManifest(manifestPath)
  const requestedScope = String(kb_scope || '').trim().toLowerCase()
  const matches: FaqKbMatch[] = []

  for (const doc of manifest.documents || []) {
    const docScope = String(doc.kb_scope || '').trim().toLowerCase()
    if (requestedScope && docScope && requestedScope !== docScope) continue

    const absDocPath = path.isAbsolute(doc.path) ? doc.path : path.join(process.cwd(), doc.path)
    const content = fs.readFileSync(absDocPath, 'utf8')
    const sections = parseSections(content)

    for (const section of sections) {
      const score = scoreText({
        query: question,
        keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
        title: doc.title,
        heading: section.heading,
        body: section.body,
      })
      if (score <= 0) continue
      matches.push({
        source_id: doc.id,
        title: doc.title,
        kb_scope: doc.kb_scope || null,
        heading: section.heading || null,
        snippet: buildSnippet(section.body),
        score,
      })
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(Number(top_k || 3), 10)))
}
