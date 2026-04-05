import crypto from 'crypto'
import { verifyMessage } from 'ethers'

import { supabase } from '@/lib/supabase'
import type { HybridIdentityRecord } from '@/lib/auth/identity-registry'

const AUTH_CHALLENGE_TABLE = 'auth_verification_challenges_op'
const AUTH_EVENT_TABLE = 'auth_identity_events_op'
const EMAIL_CODE_TTL_MINUTES = 10
const WALLET_NONCE_TTL_MINUTES = 10

export type AuthMethod = 'email' | 'wallet'
export type VerificationMethod = 'email_code' | 'wallet_signature'

type AuthChallengeStatus = 'issued' | 'verified' | 'consumed' | 'expired' | 'failed'

type PersistAuthEventParams = {
  identity_id: string | null
  customer_id: string | null
  operator_id: string | null
  auth_method: AuthMethod
  verification_method: VerificationMethod | null
  outcome: 'issued' | 'verified' | 'failed'
  challenge_id: string | null
  reason?: string | null
  email?: string | null
  wallet_address?: string | null
  meta?: Record<string, unknown>
}

export type EmailChallengeResult = {
  challenge_id: string
  identity_id: string
  customer_id: string | null
  delivery_mode: 'manual_preview'
  email: string
  code_preview: string
  expires_at: string
}

export type WalletChallengeResult = {
  challenge_id: string
  identity_id: string
  customer_id: string | null
  wallet_address: string
  nonce: string
  message: string
  expires_at: string
}

export type IdentitySessionPayload = {
  identity_id: string
  customer_id: string | null
  display_name: string
  role: string
  operator_id: string | null
  email: string | null
  wallet_address: string | null
  auth_method: AuthMethod
  verification_method: VerificationMethod
  linked_methods: Array<'email' | 'wallet'>
  token: string
  timestamp: number
}

function buildSession(identity: HybridIdentityRecord, authMethod: AuthMethod, verificationMethod: VerificationMethod): IdentitySessionPayload {
  return {
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    display_name: identity.display_name,
    role: identity.role,
    operator_id: identity.operator_id,
    email: identity.email,
    wallet_address: identity.wallet_address,
    auth_method: authMethod,
    verification_method: verificationMethod,
    linked_methods: identity.auth_methods,
    token: `${identity.identity_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  }
}

function isoAfterMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
}

function randomDigits(length: number): string {
  const max = 10 ** length
  return String(crypto.randomInt(0, max)).padStart(length, '0')
}

function normalizeWallet(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized || null
}

async function persistAuthEvent(params: PersistAuthEventParams): Promise<void> {
  const payload = {
    event_id: randomId('auth-event'),
    identity_id: params.identity_id,
    customer_id: params.customer_id,
    operator_id: params.operator_id,
    auth_method: params.auth_method,
    verification_method: params.verification_method,
    outcome: params.outcome,
    challenge_id: params.challenge_id,
    reason: params.reason || null,
    email: params.email || null,
    wallet_address: normalizeWallet(params.wallet_address),
    meta: params.meta || {},
    created_at: new Date().toISOString(),
  }
  try {
    await supabase.from(AUTH_EVENT_TABLE).insert(payload)
  } catch (error) {
    console.warn('[auth-runtime] failed to persist auth event', error)
  }
}

export async function issueEmailChallenge(identity: HybridIdentityRecord): Promise<EmailChallengeResult | null> {
  const code = randomDigits(6)
  const challengeId = randomId('email-auth')
  const expiresAt = isoAfterMinutes(EMAIL_CODE_TTL_MINUTES)
  const payload = {
    challenge_id: challengeId,
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    operator_id: identity.operator_id,
    auth_method: 'email',
    verification_method: 'email_code',
    challenge_status: 'issued' as AuthChallengeStatus,
    email: identity.email,
    wallet_address: normalizeWallet(identity.wallet_address),
    code_hash: sha256(code),
    challenge_nonce: null,
    challenge_message: null,
    expires_at: expiresAt,
    verified_at: null,
    consumed_at: null,
    meta: {
      delivery_mode: 'manual_preview',
      linked_methods: identity.auth_methods,
    },
    created_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from(AUTH_CHALLENGE_TABLE).insert(payload)
    if (error) throw error
    await persistAuthEvent({
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      operator_id: identity.operator_id,
      auth_method: 'email',
      verification_method: 'email_code',
      outcome: 'issued',
      challenge_id: challengeId,
      email: identity.email,
      wallet_address: identity.wallet_address,
      meta: { delivery_mode: 'manual_preview' },
    })
    return {
      challenge_id: challengeId,
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      delivery_mode: 'manual_preview',
      email: identity.email || '',
      code_preview: code,
      expires_at: expiresAt,
    }
  } catch (error) {
    console.warn('[auth-runtime] failed to issue email challenge', error)
    return null
  }
}

export async function issueWalletChallenge(identity: HybridIdentityRecord): Promise<WalletChallengeResult | null> {
  const nonce = crypto.randomBytes(16).toString('hex')
  const challengeId = randomId('wallet-auth')
  const expiresAt = isoAfterMinutes(WALLET_NONCE_TTL_MINUTES)
  const message = [
    'Sign in to Nexa',
    `Identity: ${identity.identity_id}`,
    `Customer: ${identity.customer_id || 'platform'}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n')

  const payload = {
    challenge_id: challengeId,
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    operator_id: identity.operator_id,
    auth_method: 'wallet',
    verification_method: 'wallet_signature',
    challenge_status: 'issued' as AuthChallengeStatus,
    email: identity.email,
    wallet_address: normalizeWallet(identity.wallet_address),
    code_hash: null,
    challenge_nonce: nonce,
    challenge_message: message,
    expires_at: expiresAt,
    verified_at: null,
    consumed_at: null,
    meta: {
      linked_methods: identity.auth_methods,
    },
    created_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from(AUTH_CHALLENGE_TABLE).insert(payload)
    if (error) throw error
    await persistAuthEvent({
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      operator_id: identity.operator_id,
      auth_method: 'wallet',
      verification_method: 'wallet_signature',
      outcome: 'issued',
      challenge_id: challengeId,
      email: identity.email,
      wallet_address: identity.wallet_address,
    })
    return {
      challenge_id: challengeId,
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      wallet_address: identity.wallet_address || '',
      nonce,
      message,
      expires_at: expiresAt,
    }
  } catch (error) {
    console.warn('[auth-runtime] failed to issue wallet challenge', error)
    return null
  }
}

async function loadChallenge(challengeId: string) {
  const { data, error } = await supabase
    .from(AUTH_CHALLENGE_TABLE)
    .select('*')
    .eq('challenge_id', challengeId)
    .maybeSingle()
  if (error) throw error
  return data as Record<string, unknown> | null
}

async function updateChallengeStatus(challengeId: string, status: AuthChallengeStatus, extra?: Record<string, unknown>) {
  const { error } = await supabase
    .from(AUTH_CHALLENGE_TABLE)
    .update({ challenge_status: status, ...extra })
    .eq('challenge_id', challengeId)
  if (error) throw error
}

function ensureChallengeUsable(row: Record<string, unknown>, expectedMethod: VerificationMethod) {
  if (!row) throw new Error('challenge_not_found')
  if (String(row.verification_method || '') !== expectedMethod) throw new Error('challenge_method_mismatch')
  if (String(row.challenge_status || '') !== 'issued') throw new Error('challenge_not_issued')
  const expiresAt = Date.parse(String(row.expires_at || ''))
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) throw new Error('challenge_expired')
}

export async function verifyEmailChallenge(identity: HybridIdentityRecord, challengeId: string, code: string): Promise<IdentitySessionPayload> {
  const row = await loadChallenge(challengeId)
  ensureChallengeUsable(row || {}, 'email_code')
  if (String(row?.identity_id || '') !== identity.identity_id) throw new Error('identity_mismatch')
  if (sha256(code) !== String(row?.code_hash || '')) {
    await updateChallengeStatus(challengeId, 'failed')
    await persistAuthEvent({
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      operator_id: identity.operator_id,
      auth_method: 'email',
      verification_method: 'email_code',
      outcome: 'failed',
      challenge_id: challengeId,
      email: identity.email,
      reason: 'invalid_code',
    })
    throw new Error('invalid_code')
  }
  const now = new Date().toISOString()
  await updateChallengeStatus(challengeId, 'consumed', { verified_at: now, consumed_at: now })
  await persistAuthEvent({
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    operator_id: identity.operator_id,
    auth_method: 'email',
    verification_method: 'email_code',
    outcome: 'verified',
    challenge_id: challengeId,
    email: identity.email,
  })
  return buildSession(identity, 'email', 'email_code')
}

export async function verifyWalletChallenge(identity: HybridIdentityRecord, challengeId: string, signature: string): Promise<IdentitySessionPayload> {
  const row = await loadChallenge(challengeId)
  ensureChallengeUsable(row || {}, 'wallet_signature')
  if (String(row?.identity_id || '') !== identity.identity_id) throw new Error('identity_mismatch')
  const message = String(row?.challenge_message || '')
  const recovered = normalizeWallet(verifyMessage(message, signature))
  const expected = normalizeWallet(identity.wallet_address)
  if (!recovered || !expected || recovered !== expected) {
    await updateChallengeStatus(challengeId, 'failed')
    await persistAuthEvent({
      identity_id: identity.identity_id,
      customer_id: identity.customer_id,
      operator_id: identity.operator_id,
      auth_method: 'wallet',
      verification_method: 'wallet_signature',
      outcome: 'failed',
      challenge_id: challengeId,
      wallet_address: identity.wallet_address,
      reason: 'invalid_signature',
    })
    throw new Error('invalid_signature')
  }
  const now = new Date().toISOString()
  await updateChallengeStatus(challengeId, 'consumed', { verified_at: now, consumed_at: now })
  await persistAuthEvent({
    identity_id: identity.identity_id,
    customer_id: identity.customer_id,
    operator_id: identity.operator_id,
    auth_method: 'wallet',
    verification_method: 'wallet_signature',
    outcome: 'verified',
    challenge_id: challengeId,
    wallet_address: identity.wallet_address,
  })
  return buildSession(identity, 'wallet', 'wallet_signature')
}
