import fs from 'fs/promises'
import path from 'path'

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

type ParsedMarkdown = {
  meta: Record<string, string>
  sections: Record<string, string>
}

export type CustomerWorkspacePreset = {
  customer_id: string
  workspace_version: string
  primary_plane: string | null
  default_entry_path: string | null
  preferred_capabilities: string[]
  focused_surfaces: string[]
  recommended_route_order: string[]
  summary: string | null
  quick_queries: string[]
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
  const parts = body.split(/\n## /)
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

function listValue(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function lines(section: string | undefined): string[] {
  return String(section || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

export async function loadCustomerWorkspacePreset(customerId: string | null | undefined): Promise<CustomerWorkspacePreset | null> {
  if (!customerId) return null
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'workspace.md')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = parseMarkdown(raw)
    return {
      customer_id: parsed.meta.customer_id || customerId,
      workspace_version: parsed.meta.workspace_version || '1',
      primary_plane: parsed.meta.primary_plane || null,
      default_entry_path: parsed.meta.default_entry_path || null,
      preferred_capabilities: listValue(parsed.meta.preferred_capabilities),
      focused_surfaces: listValue(parsed.meta.focused_surfaces),
      recommended_route_order: listValue(parsed.meta.recommended_route_order),
      summary: parsed.sections.Summary || null,
      quick_queries: lines(parsed.sections['Quick Queries']),
      file_path: path.relative(process.cwd(), filePath),
    }
  } catch {
    return null
  }
}
