'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, loginWithWallet } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [loadingMode, setLoadingMode] = useState<'email' | 'wallet' | null>(null)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingMode('email')
    try {
      const result = await login(email)
      if (result.success) router.push('/chat')
      else setError(result.error || 'Login failed')
    } catch (err) {
      console.error('Email login error:', err)
      setError('Email login failed')
    } finally {
      setLoadingMode(null)
    }
  }

  const handleWalletLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingMode('wallet')
    try {
      const result = await loginWithWallet(walletAddress)
      if (result.success) router.push('/chat')
      else setError(result.error || 'Wallet login failed')
    } catch (err) {
      console.error('Wallet login error:', err)
      setError('Wallet login failed')
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#f8fafc_40%,#fff7ed_100%)] px-4 py-12 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Nexa Access</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Hybrid identity for customer-aware operations</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            This version supports lightweight identity binding. Email and wallet are both account-entry methods. Wallet is used here as identity and account binding, not as payment execution.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Email login</div>
              <div className="mt-1">Operator-friendly login path for current customer workspaces.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Wallet login</div>
              <div className="mt-1">Identity binding path for future agent commerce. No transfer or payment execution is enabled in this release.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="font-medium text-slate-900">Single runtime identity</div>
              <div className="mt-1">Session carries `identity_id`, `customer_id`, `operator_id`, email, and linked wallet metadata into the runtime.</div>
            </div>
          </div>
        </div>

        <Card className="border-white/70 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>Use email or wallet address. Both resolve to a single filesystem-managed identity record.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="wallet">Wallet</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" placeholder="ops@maxshot.ai" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loadingMode !== null} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingMode !== null}>
                    {loadingMode === 'email' ? 'Signing in...' : 'Sign in with email'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="wallet">
                <form onSubmit={handleWalletLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wallet">Wallet address</Label>
                    <Input id="wallet" placeholder="0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} disabled={loadingMode !== null} />
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
                    Wallet is currently used only for identity binding and future account readiness. Payment execution remains disabled.
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingMode !== null}>
                    {loadingMode === 'wallet' ? 'Resolving identity...' : 'Sign in with wallet'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
