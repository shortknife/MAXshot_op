'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerPolicyEvidenceCard } from '@/components/customers/customer-policy-evidence-card'
import type { CustomerAuthDefaultExperience, CustomerPolicyEvidence } from '@/lib/customers/runtime-policy'
import { getSessionDefaultEntryPath, requestEmailChallenge, requestWalletChallenge, verifyEmailCode, verifyWalletSignature, type AuthPostureMeta, type EmailChallenge, type WalletChallenge } from '@/lib/auth'

type EmailState = {
  email: string
  challenge: EmailChallenge | null
  code: string
}

type WalletState = {
  walletAddress: string
  challenge: WalletChallenge | null
}

export default function LoginPage() {
  const router = useRouter()
  const [emailState, setEmailState] = useState<EmailState>({ email: '', challenge: null, code: '' })
  const [walletState, setWalletState] = useState<WalletState>({ walletAddress: '', challenge: null })
  const [loadingMode, setLoadingMode] = useState<'email_issue' | 'email_verify' | 'wallet_issue' | 'wallet_verify' | null>(null)
  const [error, setError] = useState('')
  const [authPosture, setAuthPosture] = useState<AuthPostureMeta | null>(null)
  const [authExperience, setAuthExperience] = useState<CustomerAuthDefaultExperience | null>(null)
  const [policyEvidence, setPolicyEvidence] = useState<CustomerPolicyEvidence | null>(null)

  const emailStep = emailState.challenge ? 2 : 1
  const walletStep = walletState.challenge ? 2 : 1

  const emailExpiry = useMemo(() => {
    if (!emailState.challenge?.expires_at) return null
    return new Date(emailState.challenge.expires_at).toLocaleString('zh-CN')
  }, [emailState.challenge])

  const walletExpiry = useMemo(() => {
    if (!walletState.challenge?.expires_at) return null
    return new Date(walletState.challenge.expires_at).toLocaleString('zh-CN')
  }, [walletState.challenge])

  const postureTone = useMemo(() => {
    if (!authPosture) return 'border-slate-200 bg-slate-50/80 text-slate-700'
    if (authPosture.verification_posture === 'guided') return 'border-sky-200 bg-sky-50/80 text-sky-900'
    if (authPosture.verification_posture === 'audit') return 'border-violet-200 bg-violet-50/80 text-violet-900'
    return 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
  }, [authPosture])

  const handleEmailChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingMode('email_issue')
    try {
      const result = await requestEmailChallenge(emailState.email)
      if (!result.success) {
        setError(result.error || 'Email challenge failed')
        return
      }
      setEmailState((prev) => ({ ...prev, challenge: result.challenge }))
      setAuthPosture(result.challenge.auth_posture || null)
      setAuthExperience(result.auth_default_experience || result.challenge.auth_default_experience || null)
      setPolicyEvidence(result.customer_policy_evidence || result.challenge.customer_policy_evidence || null)
    } finally {
      setLoadingMode(null)
    }
  }

  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailState.challenge) return
    setError('')
    setLoadingMode('email_verify')
    try {
      const result = await verifyEmailCode(emailState.email, emailState.challenge.challenge_id, emailState.code)
      if (!result.success) {
        setError(result.error || 'Email verification failed')
        return
      }
      setAuthPosture(result.session.auth_posture || emailState.challenge?.auth_posture || null)
      setAuthExperience(result.session.auth_default_experience || emailState.challenge?.auth_default_experience || null)
      setPolicyEvidence(result.session.customer_policy_evidence || emailState.challenge?.customer_policy_evidence || null)
      router.push(getSessionDefaultEntryPath(result.session))
    } finally {
      setLoadingMode(null)
    }
  }

  const handleWalletChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingMode('wallet_issue')
    try {
      const result = await requestWalletChallenge(walletState.walletAddress)
      if (!result.success) {
        setError(result.error || 'Wallet challenge failed')
        return
      }
      setWalletState((prev) => ({ ...prev, challenge: result.challenge }))
      setAuthPosture(result.challenge.auth_posture || null)
      setAuthExperience(result.auth_default_experience || result.challenge.auth_default_experience || null)
      setPolicyEvidence(result.customer_policy_evidence || result.challenge.customer_policy_evidence || null)
    } finally {
      setLoadingMode(null)
    }
  }

  const handleWalletVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletState.challenge) return
    setError('')
    setLoadingMode('wallet_verify')
    try {
      const result = await verifyWalletSignature(walletState.walletAddress, walletState.challenge)
      if (!result.success) {
        setError(result.error || 'Wallet verification failed')
        return
      }
      setAuthPosture(result.session.auth_posture || walletState.challenge?.auth_posture || null)
      setAuthExperience(result.session.auth_default_experience || walletState.challenge?.auth_default_experience || null)
      setPolicyEvidence(result.session.customer_policy_evidence || walletState.challenge?.customer_policy_evidence || null)
      router.push(getSessionDefaultEntryPath(result.session))
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#f8fafc_38%,#fff7ed_100%)] px-4 py-12 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88))] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Nexa Access</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Verified hybrid identity for customer-aware operations</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Identity entry now includes verification. Email uses a bounded verification code flow. Wallet uses a nonce challenge and signature. Wallet remains identity binding only in this release.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Email verification</div>
              <div className="mt-1">Issue a short-lived code, verify it, then mint a local runtime session.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Wallet signature verification</div>
              <div className="mt-1">Issue a nonce-bound message and verify the recovered address against the linked customer identity.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Customer-aware session</div>
              <div className="mt-1">Verified session carries identity, customer, operator, and linked methods into runtime, audit, and learning layers.</div>
            </div>
          </div>
        </div>

        <Card className="border-white/70 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>Use email or wallet. Both resolve to one filesystem-managed identity record, but now verification is mandatory.</CardDescription>
            {authPosture ? (
              <div className={`mt-4 rounded-2xl border p-4 text-sm ${postureTone}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{authExperience?.customer_id || authPosture.customer_id}</span>
                  <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">primary: {authExperience?.primary_auth_method || authPosture.primary_auth_method}</span>
                  <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">verify: {authExperience?.verification_posture || authPosture.verification_posture}</span>
                  <span className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]">wallet: {authExperience?.wallet_posture || authPosture.wallet_posture}</span>
                </div>
                <div className="mt-3 leading-6">{authExperience?.summary || authPosture.summary}</div>
                {(authExperience?.entry_hint || authPosture.entry_hint) ? <div className="mt-2 text-xs opacity-80">{authExperience?.entry_hint || authPosture.entry_hint}</div> : null}
                <div className="mt-3">
                  <CustomerPolicyEvidenceCard evidence={policyEvidence} compact title="customer_policy_evidence" />
                </div>
                {(authExperience?.recovery_actions || authPosture.recovery_actions).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(authExperience?.recovery_actions || authPosture.recovery_actions).map((action) => (
                      <span key={action} className="rounded-full border border-current/15 px-3 py-1 text-xs">{action}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="wallet">Wallet</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  <span>Email verification flow</span>
                  <span className="font-medium text-slate-900">Step {emailStep} / 2</span>
                </div>
                {!emailState.challenge ? (
                  <form onSubmit={handleEmailChallenge} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input id="email" type="email" placeholder="ops@maxshot.ai" value={emailState.email} onChange={(e) => setEmailState((prev) => ({ ...prev, email: e.target.value }))} disabled={loadingMode !== null} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loadingMode !== null}>
                      {loadingMode === 'email_issue' ? 'Issuing code...' : 'Request verification code'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleEmailVerify} className="space-y-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
                      <div className="font-medium">Manual preview delivery</div>
                      <div className="mt-1">This version does not send live email yet. Use the preview code below to complete verification.</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-white px-3 py-1.5 font-mono text-base tracking-[0.22em] text-slate-950 shadow-sm">{emailState.challenge.code_preview}</span>
                        {emailExpiry ? <span className="text-xs text-amber-800">expires {emailExpiry}</span> : null}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-code">Verification code</Label>
                      <Input id="email-code" placeholder="6-digit code" value={emailState.code} onChange={(e) => setEmailState((prev) => ({ ...prev, code: e.target.value }))} disabled={loadingMode !== null} />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1" disabled={loadingMode !== null}>
                        {loadingMode === 'email_verify' ? 'Verifying...' : 'Verify and enter'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEmailState({ email: emailState.email, challenge: null, code: '' })} disabled={loadingMode !== null}>
                        Restart
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="wallet" className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  <span>Wallet signature flow</span>
                  <span className="font-medium text-slate-900">Step {walletStep} / 2</span>
                </div>
                {!walletState.challenge ? (
                  <form onSubmit={handleWalletChallenge} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wallet">Wallet address</Label>
                      <Input id="wallet" placeholder="0x..." value={walletState.walletAddress} onChange={(e) => setWalletState((prev) => ({ ...prev, walletAddress: e.target.value }))} disabled={loadingMode !== null} />
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3 text-sm text-sky-950">
                      Wallet is identity binding only. This flow verifies address ownership with a signature but does not enable payment or transfer execution.
                    </div>
                    <Button type="submit" className="w-full" disabled={loadingMode !== null}>
                      {loadingMode === 'wallet_issue' ? 'Preparing challenge...' : 'Request wallet challenge'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleWalletVerify} className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
                      <div className="font-medium">Wallet challenge ready</div>
                      <div className="mt-1">Use your injected wallet to sign the message below. The signature is verified server-side against the linked identity record.</div>
                      {walletExpiry ? <div className="mt-2 text-xs text-emerald-800">expires {walletExpiry}</div> : null}
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-white/90 p-3 text-xs leading-6 text-slate-800 shadow-inner">{walletState.challenge.message}</pre>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1" disabled={loadingMode !== null}>
                        {loadingMode === 'wallet_verify' ? 'Signing and verifying...' : 'Sign challenge and enter'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setWalletState({ walletAddress: walletState.walletAddress, challenge: null })} disabled={loadingMode !== null}>
                        Restart
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
