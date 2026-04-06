import fs from 'fs/promises'
import path from 'path'

const CUSTOMER_ASSETS_ROOT = path.join(process.cwd(), 'customer-assets')

export type CustomerAuthPosture = {
  customer_id: string
  auth_version: string
  primary_auth_method: 'email' | 'wallet'
  verification_posture: 'operator' | 'guided' | 'audit'
  wallet_posture: 'identity_only' | 'identity_preferred' | 'disabled'
  summary: string | null
  entry_hint: string | null
  recovery_actions: string[]
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

function asPrimaryMethod(value: string | undefined): CustomerAuthPosture['primary_auth_method'] {
  return value === 'wallet' ? 'wallet' : 'email'
}

function asVerificationPosture(value: string | undefined): CustomerAuthPosture['verification_posture'] {
  return value === 'guided' || value === 'audit' ? value : 'operator'
}

function asWalletPosture(value: string | undefined): CustomerAuthPosture['wallet_posture'] {
  return value === 'identity_preferred' || value === 'disabled' ? value : 'identity_only'
}

export async function loadCustomerAuthPosture(customerId: string | null | undefined): Promise<CustomerAuthPosture | null> {
  if (!customerId) return null
  const filePath = path.join(CUSTOMER_ASSETS_ROOT, customerId, 'auth.md')
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const sections = parseSections(body)
    return {
      customer_id: meta.customer_id || customerId,
      auth_version: meta.auth_version || '1',
      primary_auth_method: asPrimaryMethod(meta.primary_auth_method),
      verification_posture: asVerificationPosture(meta.verification_posture),
      wallet_posture: asWalletPosture(meta.wallet_posture),
      summary: sections['Summary'] || null,
      entry_hint: sections['Entry Hint'] || null,
      recovery_actions: lines(sections['Recovery Actions']),
      file_path: path.relative(process.cwd(), filePath),
    }
  } catch {
    return null
  }
}

export function buildAuthPostureMeta(posture: CustomerAuthPosture | null | undefined): Record<string, unknown> | null {
  if (!posture) return null
  return {
    customer_id: posture.customer_id,
    auth_version: posture.auth_version,
    primary_auth_method: posture.primary_auth_method,
    verification_posture: posture.verification_posture,
    wallet_posture: posture.wallet_posture,
    summary: posture.summary,
    entry_hint: posture.entry_hint,
    recovery_actions: posture.recovery_actions,
    file_path: posture.file_path,
  }
}
