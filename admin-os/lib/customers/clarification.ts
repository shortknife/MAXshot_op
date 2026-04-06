import fs from 'fs/promises'
import path from 'path'

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

export type CustomerClarificationPosture = {
  customer_id: string
  clarification_version: string
  clarification_style: 'operator' | 'guided' | 'audit'
  option_style: 'explicit' | 'guided' | 'audit'
  summary: string | null
  question_prefix: string | null
  default_actions: string[]
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

function lines(section: string | undefined): string[] {
  return String(section || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function asClarificationStyle(value: string | undefined): CustomerClarificationPosture['clarification_style'] {
  return value === 'guided' || value === 'audit' ? value : 'operator'
}

function asOptionStyle(value: string | undefined): CustomerClarificationPosture['option_style'] {
  return value === 'guided' || value === 'audit' ? value : 'explicit'
}

export async function loadCustomerClarificationPosture(customerId: string | null | undefined): Promise<CustomerClarificationPosture | null> {
  if (!customerId) return null
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'clarification.md')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const sections = parseSections(body)
    return {
      customer_id: meta.customer_id || customerId,
      clarification_version: meta.clarification_version || '1',
      clarification_style: asClarificationStyle(meta.clarification_style),
      option_style: asOptionStyle(meta.option_style),
      summary: sections['Summary'] || null,
      question_prefix: sections['Question Prefix'] || null,
      default_actions: lines(sections['Default Actions']),
      file_path: path.relative(process.cwd(), filePath),
    }
  } catch {
    return null
  }
}

export function applyClarificationPosture(params: {
  question: string
  options: string[]
  posture?: CustomerClarificationPosture | null
}): { question: string; options: string[] } {
  const question = String(params.question || '').trim()
  const options = Array.isArray(params.options) ? params.options.filter(Boolean) : []
  const posture = params.posture || null
  if (!posture) return { question, options }

  const prefixValue = posture.question_prefix || ''
  const prefix = prefixValue ? `${prefixValue} ` : ''
  const nextQuestion = prefix && !question.startsWith(prefixValue)
    ? `${prefix}${question}`.trim()
    : question

  if (posture.option_style === 'guided' || posture.option_style === 'audit') {
    return { question: nextQuestion, options: posture.default_actions.length ? posture.default_actions : options }
  }

  return { question: nextQuestion, options: options.length ? options : posture.default_actions }
}
