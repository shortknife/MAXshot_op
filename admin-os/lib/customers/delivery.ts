import fs from 'fs/promises'
import path from 'path'

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

type ParsedMarkdown = {
  meta: Record<string, string>
  sections: Record<string, string>
}

export type CustomerDeliveryPosture = {
  customer_id: string
  delivery_version: string
  summary_style: 'compact' | 'explainer' | 'observer'
  next_action_style: 'ops' | 'guided' | 'audit'
  review_copy_style: 'operator' | 'customer' | 'observer'
  citation_density: 'compact' | 'balanced' | 'dense'
  default_next_actions: string[]
  review_next_actions: string[]
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

function asSummaryStyle(value: string | undefined): CustomerDeliveryPosture['summary_style'] {
  return value === 'explainer' || value === 'observer' ? value : 'compact'
}

function asNextActionStyle(value: string | undefined): CustomerDeliveryPosture['next_action_style'] {
  return value === 'guided' || value === 'audit' ? value : 'ops'
}

function asReviewCopyStyle(value: string | undefined): CustomerDeliveryPosture['review_copy_style'] {
  return value === 'customer' || value === 'observer' ? value : 'operator'
}

function asCitationDensity(value: string | undefined): CustomerDeliveryPosture['citation_density'] {
  return value === 'balanced' || value === 'dense' ? value : 'compact'
}

export async function loadCustomerDeliveryPosture(customerId: string | null | undefined): Promise<CustomerDeliveryPosture | null> {
  if (!customerId) return null
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'delivery.md')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = parseMarkdown(raw)
    return {
      customer_id: parsed.meta.customer_id || customerId,
      delivery_version: parsed.meta.delivery_version || '1',
      summary_style: asSummaryStyle(parsed.meta.summary_style),
      next_action_style: asNextActionStyle(parsed.meta.next_action_style),
      review_copy_style: asReviewCopyStyle(parsed.meta.review_copy_style),
      citation_density: asCitationDensity(parsed.meta.citation_density),
      default_next_actions: lines(parsed.sections['Default Next Actions']),
      review_next_actions: lines(parsed.sections['Review Next Actions']),
      file_path: path.relative(process.cwd(), filePath),
    }
  } catch {
    return null
  }
}
