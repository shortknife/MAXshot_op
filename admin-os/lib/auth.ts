'use client'

export interface IdentitySession {
  identity_id: string
  customer_id: string | null
  display_name: string
  role: string
  operator_id: string | null
  email: string | null
  wallet_address: string | null
  auth_method: 'email' | 'wallet'
  linked_methods: Array<'email' | 'wallet'>
  token: string
  timestamp: number
}

const TOKEN_KEY = 'nexa_identity_session'
const TOKEN_EXPIRY_HOURS = 24

function isValidSession(value: unknown): value is IdentitySession {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.identity_id === 'string' && typeof item.token === 'string' && typeof item.timestamp === 'number'
}

export function getStoredSession(): IdentitySession | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(TOKEN_KEY)
  if (!stored) return null
  try {
    const data = JSON.parse(stored)
    if (!isValidSession(data)) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    const now = Date.now()
    const expiry = data.timestamp + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    if (now > expiry) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export function getStoredToken(): { email: string; token: string; timestamp: number } | null {
  const session = getStoredSession()
  if (!session || !session.email) return null
  return { email: session.email, token: session.token, timestamp: session.timestamp }
}

export function setStoredSession(session: IdentitySession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

async function loginWithMode(mode: 'email' | 'wallet', payload: Record<string, string>) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success !== true || !isValidSession(data.session)) {
    return { success: false as const, error: String(data.error || 'login_failed') }
  }
  setStoredSession(data.session)
  return { success: true as const, session: data.session as IdentitySession }
}

export async function login(email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return { success: false as const, error: 'Please enter your email address' }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalizedEmail) && normalizedEmail !== 'admin') {
    return { success: false as const, error: 'Please enter a valid email address' }
  }
  return loginWithMode('email', { email: normalizedEmail })
}

export async function loginWithWallet(walletAddress: string) {
  const normalized = String(walletAddress || '').trim()
  if (!normalized) return { success: false as const, error: 'Please enter your wallet address' }
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    return { success: false as const, error: 'Please enter a valid EVM wallet address' }
  }
  return loginWithMode('wallet', { wallet_address: normalized })
}

export function isAuthenticated(): boolean {
  return getStoredSession() !== null
}
