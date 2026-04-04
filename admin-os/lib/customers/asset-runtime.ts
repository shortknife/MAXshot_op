import fs from 'fs/promises'
import path from 'path'

export type CustomerMemoryAsset = {
  customer_id: string
  memory_version: string
  language_preferences: string[]
  response_style: string | null
  preferred_planes: string[]
  preferred_capabilities: string[]
  preferred_query_modes: string[]
  preferred_scopes: string[]
  summary: string | null
  guardrails: string[]
  file_path: string
}

export type CustomerWalletAsset = {
  customer_id: string
  wallet_mode: 'disabled' | 'manual_review' | 'agent_ready'
  status: 'active' | 'inactive'
  provider: string | null
  settlement_asset: string | null
  preferred_network: string | null
  execution_enabled: boolean
  payment_enabled: boolean
  supported_actions: string[]
  summary: string | null
  notes: string[]
  file_path: string
}

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

type ParsedMarkdown = {
  meta: Record<string, string>
  sections: Record<string, string>
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
  if (first && first.trim()) sections['__body__'] = first.trim()
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

async function readMarkdown(filePath: string): Promise<ParsedMarkdown | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return parseMarkdown(raw)
  } catch {
    return null
  }
}

export async function loadCustomerMemoryAsset(customerId: string): Promise<CustomerMemoryAsset | null> {
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'memory.md')
  const parsed = await readMarkdown(filePath)
  if (!parsed) return null
  return {
    customer_id: parsed.meta.customer_id || customerId,
    memory_version: parsed.meta.memory_version || '1',
    language_preferences: listValue(parsed.meta.language_preferences),
    response_style: parsed.meta.response_style || null,
    preferred_planes: listValue(parsed.meta.preferred_planes),
    preferred_capabilities: listValue(parsed.meta.preferred_capabilities),
    preferred_query_modes: listValue(parsed.meta.preferred_query_modes),
    preferred_scopes: listValue(parsed.meta.preferred_scopes),
    summary: parsed.sections['Summary'] || null,
    guardrails: lines(parsed.sections['Guardrails']),
    file_path: path.relative(process.cwd(), filePath),
  }
}

export async function loadCustomerWalletAsset(customerId: string): Promise<CustomerWalletAsset | null> {
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'wallet.md')
  const parsed = await readMarkdown(filePath)
  if (!parsed) return null
  const walletMode = parsed.meta.wallet_mode === 'agent_ready' ? 'agent_ready' : parsed.meta.wallet_mode === 'manual_review' ? 'manual_review' : 'disabled'
  const status = parsed.meta.status === 'active' ? 'active' : 'inactive'
  return {
    customer_id: parsed.meta.customer_id || customerId,
    wallet_mode: walletMode,
    status,
    provider: parsed.meta.provider || null,
    settlement_asset: parsed.meta.settlement_asset || null,
    preferred_network: parsed.meta.preferred_network || null,
    execution_enabled: parsed.meta.execution_enabled === 'true',
    payment_enabled: parsed.meta.payment_enabled === 'true',
    supported_actions: listValue(parsed.meta.supported_actions),
    summary: parsed.sections['Summary'] || null,
    notes: lines(parsed.sections['Notes']),
    file_path: path.relative(process.cwd(), filePath),
  }
}
