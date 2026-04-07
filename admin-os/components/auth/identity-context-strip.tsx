'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { clearStoredToken, getStoredSession, type IdentitySession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import type { CustomerPolicyEvidence } from '@/lib/customers/runtime-policy'

type AuthEventItem = {
  event_id: string
  auth_method: 'email' | 'wallet'
  verification_method: 'email_code' | 'wallet_signature' | null
  outcome: 'issued' | 'verified' | 'failed'
  created_at: string
  customer_policy_evidence?: CustomerPolicyEvidence | null
}

function tone(outcome: AuthEventItem['outcome']) {
  if (outcome === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (outcome === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-amber-200 bg-amber-50 text-amber-800'
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs ${className || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{children}</span>
}

export function IdentityContextStrip() {
  const router = useRouter()
  const [session] = useState<IdentitySession | null>(() => getStoredSession())
  const [events, setEvents] = useState<AuthEventItem[]>([])

  useEffect(() => {
    if (!session?.identity_id) return
    void fetch(`/api/auth/events?identity_id=${encodeURIComponent(session.identity_id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success === true && Array.isArray(data.items)) setEvents(data.items)
      })
      .catch(() => {})
  }, [session?.identity_id])

  if (!session) return null

  const latest = events[0]

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Pill className="border-slate-300 bg-slate-900 text-white">identity: {session.identity_id}</Pill>
        {session.customer_id ? <Pill>customer: {session.customer_id}</Pill> : null}
        {session.operator_id ? <Pill>operator: {session.operator_id}</Pill> : null}
        <Pill className={session.auth_method === 'wallet' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-sky-200 bg-sky-50 text-sky-700'}>auth: {session.auth_method}</Pill>
        <Pill className={session.verification_method === 'wallet_signature' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}>verify: {session.verification_method}</Pill>
        {session.linked_methods.map((method) => <Pill key={method}>linked: {method}</Pill>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {latest ? (
          <Pill className={tone(latest.outcome)}>
            last auth: {latest.outcome} · {latest.verification_method || latest.auth_method}
          </Pill>
        ) : null}
        {latest?.customer_policy_evidence?.policy_version ? (
          <Pill>policy: {latest.customer_policy_evidence.policy_version}</Pill>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => { clearStoredToken(); router.push('/login') }}>Sign out</Button>
      </div>
    </div>
  )
}
