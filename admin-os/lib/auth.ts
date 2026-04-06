'use client'

import type { CustomerAuthDefaultExperience, CustomerRuntimePolicyMeta } from '@/lib/customers/runtime-policy'

export interface IdentitySession {
  identity_id: string
  customer_id: string | null
  display_name: string
  role: string
  operator_id: string | null
  email: string | null
  wallet_address: string | null
  auth_method: 'email' | 'wallet'
  verification_method: 'email_code' | 'wallet_signature'
  linked_methods: Array<'email' | 'wallet'>
  token: string
  timestamp: number
}

export interface IdentitySessionResult extends IdentitySession {
  auth_posture?: AuthPostureMeta | null
  auth_default_experience?: CustomerAuthDefaultExperience | null
  customer_runtime_policy?: CustomerRuntimePolicyMeta | null
}

export interface AuthPostureMeta {
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

export interface EmailChallenge {
  challenge_id: string
  identity_id: string
  customer_id: string | null
  delivery_mode: 'manual_preview'
  email: string
  code_preview: string
  expires_at: string
  auth_posture?: AuthPostureMeta | null
  auth_default_experience?: CustomerAuthDefaultExperience | null
  customer_runtime_policy?: CustomerRuntimePolicyMeta | null
}

export interface WalletChallenge {
  challenge_id: string
  identity_id: string
  customer_id: string | null
  wallet_address: string
  nonce: string
  message: string
  expires_at: string
  auth_posture?: AuthPostureMeta | null
  auth_default_experience?: CustomerAuthDefaultExperience | null
  customer_runtime_policy?: CustomerRuntimePolicyMeta | null
}

const TOKEN_KEY = 'nexa_identity_session'
const TOKEN_EXPIRY_HOURS = 24

function isValidSession(value: unknown): value is IdentitySession {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.identity_id === 'string' && typeof item.token === 'string' && typeof item.timestamp === 'number'
}

async function parseJson(res: Response) {
  return res.json().catch(() => ({}))
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
    const expiry = data.timestamp + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    if (Date.now() > expiry) {
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

export async function requestEmailChallenge(email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return { success: false as const, error: 'Please enter your email address' }
  const res = await fetch('/api/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'email', email: normalizedEmail }),
  })
  const data = await parseJson(res)
  if (!res.ok || data.success !== true) return { success: false as const, error: String(data.error || 'challenge_failed') }
  return { success: true as const, challenge: data.challenge as EmailChallenge, customer_runtime_policy: (data.challenge?.customer_runtime_policy as CustomerRuntimePolicyMeta | null | undefined) || null, auth_default_experience: (data.challenge?.auth_default_experience as CustomerAuthDefaultExperience | null | undefined) || null }
}

export async function verifyEmailCode(email: string, challengeId: string, code: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedCode = String(code || '').trim()
  if (!normalizedCode) return { success: false as const, error: 'Please enter the verification code' }
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'email', email: normalizedEmail, challenge_id: challengeId, code: normalizedCode }),
  })
  const data = await parseJson(res)
  if (!res.ok || data.success !== true || !isValidSession(data.session)) {
    return { success: false as const, error: String(data.error || 'email_verification_failed') }
  }
  setStoredSession(data.session)
  return { success: true as const, session: { ...(data.session as IdentitySession), auth_posture: (data.auth_posture as AuthPostureMeta | null | undefined) || null, auth_default_experience: (data.auth_default_experience as CustomerAuthDefaultExperience | null | undefined) || null, customer_runtime_policy: (data.customer_runtime_policy as CustomerRuntimePolicyMeta | null | undefined) || null } as IdentitySessionResult }
}

export async function requestWalletChallenge(walletAddress: string) {
  const normalized = String(walletAddress || '').trim()
  if (!normalized) return { success: false as const, error: 'Please enter your wallet address' }
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return { success: false as const, error: 'Please enter a valid EVM wallet address' }
  const res = await fetch('/api/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'wallet', wallet_address: normalized }),
  })
  const data = await parseJson(res)
  if (!res.ok || data.success !== true) return { success: false as const, error: String(data.error || 'challenge_failed') }
  return { success: true as const, challenge: data.challenge as WalletChallenge, customer_runtime_policy: (data.challenge?.customer_runtime_policy as CustomerRuntimePolicyMeta | null | undefined) || null, auth_default_experience: (data.challenge?.auth_default_experience as CustomerAuthDefaultExperience | null | undefined) || null }
}

async function signWalletMessage(walletAddress: string, message: string): Promise<string> {
  if (typeof window === 'undefined') throw new Error('wallet_provider_unavailable')
  const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
  if (!ethereum) throw new Error('wallet_provider_unavailable')
  await ethereum.request({ method: 'eth_requestAccounts' })
  const signature = await ethereum.request({ method: 'personal_sign', params: [message, walletAddress] })
  if (typeof signature !== 'string') throw new Error('wallet_signature_failed')
  return signature
}

export async function verifyWalletSignature(walletAddress: string, challenge: WalletChallenge) {
  try {
    const signature = await signWalletMessage(walletAddress, challenge.message)
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'wallet', wallet_address: walletAddress, challenge_id: challenge.challenge_id, signature }),
    })
    const data = await parseJson(res)
    if (!res.ok || data.success !== true || !isValidSession(data.session)) {
      return { success: false as const, error: String(data.error || 'wallet_verification_failed') }
    }
    setStoredSession(data.session)
    return { success: true as const, session: { ...(data.session as IdentitySession), auth_posture: (data.auth_posture as AuthPostureMeta | null | undefined) || null, auth_default_experience: (data.auth_default_experience as CustomerAuthDefaultExperience | null | undefined) || null, customer_runtime_policy: (data.customer_runtime_policy as CustomerRuntimePolicyMeta | null | undefined) || null } as IdentitySessionResult, signature }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'wallet_verification_failed' }
  }
}

export function isAuthenticated(): boolean {
  return getStoredSession() !== null
}
