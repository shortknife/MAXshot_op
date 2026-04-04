import fs from 'fs/promises'
import path from 'path'

export type HybridIdentityRecord = {
  identity_id: string
  customer_id: string | null
  display_name: string
  role: string
  status: 'active' | 'inactive'
  email: string | null
  wallet_address: string | null
  auth_methods: Array<'email' | 'wallet'>
  operator_id: string | null
  summary: string | null
  file_path: string
}

const IDENTITY_ROOT = path.join(process.cwd(), 'identity-assets')

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

function readSummary(body: string): string | null {
  const match = body.match(/(?:^|\n)## Summary\n\n([\s\S]*?)(?=\n## |$)/m)
  return match ? match[1].trim() : null
}

function normalizeAuthMethods(value: string | undefined): Array<'email' | 'wallet'> {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is 'email' | 'wallet' => item === 'email' || item === 'wallet')
}

function normalizeWallet(value: string | undefined): string | null {
  const trimmed = String(value || '').trim()
  return trimmed ? trimmed.toLowerCase() : null
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(fullPath))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      files.push(fullPath)
    }
  }
  return files
}

async function loadIdentityFile(filePath: string): Promise<HybridIdentityRecord | null> {
  const raw = await fs.readFile(filePath, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const identityId = String(meta.identity_id || '').trim()
  if (!identityId) return null
  return {
    identity_id: identityId,
    customer_id: String(meta.customer_id || '').trim() || null,
    display_name: String(meta.display_name || identityId).trim(),
    role: String(meta.role || 'customer_user').trim(),
    status: meta.status === 'inactive' ? 'inactive' : 'active',
    email: String(meta.email || '').trim().toLowerCase() || null,
    wallet_address: normalizeWallet(meta.wallet_address),
    auth_methods: normalizeAuthMethods(meta.auth_methods),
    operator_id: String(meta.operator_id || '').trim() || null,
    summary: readSummary(body),
    file_path: path.relative(process.cwd(), filePath),
  }
}

export async function loadHybridIdentityRegistry(): Promise<HybridIdentityRecord[]> {
  const files = await listMarkdownFiles(IDENTITY_ROOT)
  const items = await Promise.all(files.map((filePath) => loadIdentityFile(filePath)))
  return items.filter((item): item is HybridIdentityRecord => Boolean(item)).sort((a, b) => a.identity_id.localeCompare(b.identity_id))
}

export async function resolveIdentityByEmail(email: string): Promise<HybridIdentityRecord | null> {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null
  const registry = await loadHybridIdentityRegistry()
  return registry.find((item) => item.status === 'active' && item.email === normalized && item.auth_methods.includes('email')) || null
}

export async function resolveIdentityByWallet(walletAddress: string): Promise<HybridIdentityRecord | null> {
  const normalized = normalizeWallet(walletAddress)
  if (!normalized) return null
  const registry = await loadHybridIdentityRegistry()
  return registry.find((item) => item.status === 'active' && item.wallet_address === normalized && item.auth_methods.includes('wallet')) || null
}
