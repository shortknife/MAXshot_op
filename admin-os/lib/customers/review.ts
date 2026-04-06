import fs from 'fs/promises'
import path from 'path'

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

type ParsedMarkdown = {
  meta: Record<string, string>
  sections: Record<string, string>
}

export type CustomerReviewPosture = {
  customer_id: string
  review_version: string
  escalation_style: 'operator' | 'guided' | 'observer'
  default_priority: 'high' | 'normal'
  review_queue_label: string | null
  operator_hint: string | null
  suggested_actions: string[]
  file_path: string
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '').replace(/^\s+/, '')
  if (!normalized.startsWith('---\n')) return { meta: {}, body: normalized }
  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) return { meta: {}, body: normalized }
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

function parseSections(body: string): Record<string, string> {
  const normalized = body.startsWith('## ') ? `\n${body}` : body
  const parts = normalized.split(/\n## /)
  const sections: Record<string, string> = {}
  const first = parts.shift()
  if (first && first.trim()) sections.__body__ = first.trim()
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n')
    sections[heading.trim()] = rest.join('\n').trim()
  }
  return sections
}

function parseMarkdown(raw: string): ParsedMarkdown {
  const { meta, body } = parseFrontmatter(raw)
  return { meta, sections: parseSections(body) }
}

function lines(section: string | undefined): string[] {
  return String(section || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function asEscalationStyle(value: string | undefined): CustomerReviewPosture['escalation_style'] {
  return value === 'guided' || value === 'observer' ? value : 'operator'
}

function asPriority(value: string | undefined): CustomerReviewPosture['default_priority'] {
  return value === 'normal' ? 'normal' : 'high'
}

export async function loadCustomerReviewPosture(customerId: string | null | undefined): Promise<CustomerReviewPosture | null> {
  if (!customerId) return null
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'review.md')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = parseMarkdown(raw)
    return {
      customer_id: parsed.meta.customer_id || customerId,
      review_version: parsed.meta.review_version || '1',
      escalation_style: asEscalationStyle(parsed.meta.escalation_style),
      default_priority: asPriority(parsed.meta.default_priority),
      review_queue_label: parsed.sections['Queue Label'] || null,
      operator_hint: parsed.sections['Operator Hint'] || null,
      suggested_actions: lines(parsed.sections['Suggested Actions']),
      file_path: path.relative(process.cwd(), filePath),
    }
  } catch {
    return null
  }
}
