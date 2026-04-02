'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { READ_ONLY_DEMO, WRITE_ENABLED } from '@/lib/utils'

type ManifestDoc = {
  id: string
  title: string
  kb_scope?: string | null
  path: string
  keywords?: string[]
}

type CustomerItem = {
  customer_id: string
  name: string
}

type InventoryItem = {
  source_id: string
  title: string
  customer_id: string | null
  kb_scope: string | null
  source_type: 'markdown' | 'text' | 'url' | 'pdf'
  source_ref: string
  source_status: 'draft' | 'accepted' | 'rejected'
  qc_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number
  chunk_count: number
  qc_flags: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
  uploaded_by: string | null
  customer_context: string | null
  created_at: string
  updated_at: string
}

function TonePill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone]

  return <span className={`rounded-full border px-3 py-1 text-xs ${toneClass}`}>{children}</span>
}

function StatPanel({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'blue' | 'amber' | 'emerald' }) {
  const toneClass = {
    blue: 'from-sky-500/15 via-blue-500/10 to-indigo-500/15 border-sky-200',
    amber: 'from-amber-500/15 via-orange-500/10 to-yellow-500/15 border-amber-200',
    emerald: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-emerald-200',
  }[tone]

  return (
    <div className={`rounded-[28px] border bg-gradient-to-br px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{note}</div>
    </div>
  )
}

function availableActions(status: InventoryItem['source_status']) {
  if (status === 'draft') {
    return [
      { action: 'accept' as const, label: 'Accept', variant: 'default' as const },
      { action: 'reject' as const, label: 'Reject', variant: 'outline' as const },
    ]
  }
  return []
}

export function KbManagementSurface({
  manifestDocuments,
  customers,
  inventorySource,
  inventoryItems,
}: {
  manifestDocuments: ManifestDoc[]
  customers: CustomerItem[]
  inventorySource: 'supabase' | 'computed'
  inventoryItems: InventoryItem[]
}) {
  const router = useRouter()
  const [operatorId, setOperatorId] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [approved, setApproved] = useState(false)
  const [title, setTitle] = useState('')
  const [customerId, setCustomerId] = useState(customers[0]?.customer_id || '')
  const [sourceType, setSourceType] = useState<InventoryItem['source_type']>('markdown')
  const [sourceRef, setSourceRef] = useState('')
  const [kbScope, setKbScope] = useState('general')
  const [customerContext, setCustomerContext] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success')
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  const acceptedCount = inventoryItems.filter((item) => item.source_status === 'accepted').length
  const draftCount = inventoryItems.filter((item) => item.source_status === 'draft').length
  const totalChunks = inventoryItems.reduce((sum, item) => sum + item.chunk_count, 0)
  const scopeCounts = useMemo(() => inventoryItems.reduce<Record<string, number>>((acc, item) => {
    const scope = item.kb_scope || 'unscoped'
    acc[scope] = (acc[scope] || 0) + 1
    return acc
  }, {}), [inventoryItems])
  const customerCounts = useMemo(() => inventoryItems.reduce<Record<string, number>>((acc, item) => {
    const customer = item.customer_id || 'unbound'
    acc[customer] = (acc[customer] || 0) + 1
    return acc
  }, {}), [inventoryItems])

  async function mutate(action: 'register' | 'accept' | 'reject', payload: Record<string, unknown>) {
    if (READ_ONLY_DEMO) {
      setMessageTone('error')
      setMessage('Read-only demo mode: actions are disabled.')
      return
    }
    if (!WRITE_ENABLED) {
      setMessageTone('error')
      setMessage('Write mode disabled. Set NEXT_PUBLIC_WRITE_ENABLE=true and provide confirm token to enable actions.')
      return
    }
    if (!approved) {
      setMessageTone('error')
      setMessage('Approval checkbox is required before mutating KB source state.')
      return
    }
    if (!operatorId.trim() || !confirmToken.trim()) {
      setMessageTone('error')
      setMessage('Missing operator_id or confirm_token.')
      return
    }

    const submitKey = action === 'register' ? 'register' : String(payload.source_id || action)
    setSubmittingKey(submitKey)
    setMessage(null)

    try {
      const res = await fetch('/api/kb-source/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
          approved,
          ...payload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'kb_source_action_failed')
      setMessageTone('success')
      setMessage(action === 'register' ? `Draft source created: ${data.source_id}` : `${data.source_id}: ${data.previous_status} -> ${data.source_status}`)
      if (action === 'register') {
        setTitle('')
        setSourceRef('')
        setCustomerContext('')
      }
      router.refresh()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'kb_source_action_failed')
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef7ff_0%,#f8fafc_40%,#fff7ed_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">KB Management</h1>
              <div className="mt-1 text-sm text-slate-500">Runtime-backed inventory, QC signals, and bounded source lifecycle actions for the FAQ / KB Plane.</div>
            </div>
            <AppNav current="kb_management" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatPanel label="Accepted Sources" value={String(acceptedCount)} note="Current runtime-backed inventory accepted for active use." tone="emerald" />
            <StatPanel label="Draft Sources" value={String(draftCount)} note="Pending KB source lifecycle decisions." tone="amber" />
            <StatPanel label="Chunk Inventory" value={String(totalChunks)} note="Chunk total across runtime inventory." tone="blue" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base font-semibold">KB Source Inventory</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <TonePill tone={inventorySource === 'supabase' ? 'emerald' : 'amber'}>{`source: ${inventorySource}`}</TonePill>
                    {Object.entries(customerCounts).map(([customer, count]) => (
                      <TonePill key={customer}>{`${customer}: ${count}`}</TonePill>
                    ))}
                    {Object.entries(scopeCounts).map(([scope, count]) => (
                      <TonePill key={scope} tone="blue">{`${scope}: ${count}`}</TonePill>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {inventoryItems.map((item) => (
                  <div key={item.source_id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.source_id}</div>
                        <div className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</div>
                        <div className="flex flex-wrap gap-2">
                          <TonePill tone={item.source_status === 'accepted' ? 'emerald' : item.source_status === 'draft' ? 'amber' : 'rose'}>{item.source_status}</TonePill>
                          <TonePill tone={item.qc_status === 'accepted' ? 'emerald' : item.qc_status === 'needs_review' ? 'amber' : 'rose'}>{`qc: ${item.qc_status}`}</TonePill>
                          <TonePill>{`type: ${item.source_type}`}</TonePill>
                          <TonePill>{`customer: ${item.customer_id || 'unbound'}`}</TonePill>
                          <TonePill>{`scope: ${item.kb_scope || 'unscoped'}`}</TonePill>
                          <TonePill>{`docs: ${item.document_count}`}</TonePill>
                          <TonePill>{`chunks: ${item.chunk_count}`}</TonePill>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">updated_at</div>
                        <div className="mt-1 font-medium text-slate-800">{new Date(item.updated_at).toLocaleString('zh-CN', { hour12: false })}</div>
                        <div className="mt-2 text-xs text-slate-500">{item.uploaded_by || 'system'}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Source Ref</div>
                      <div className="mt-2 break-all text-sm leading-6 text-slate-700">{item.source_ref}</div>
                      {item.customer_context ? <div className="mt-3 text-sm text-slate-500">customer_context: {item.customer_context}</div> : null}
                    </div>

                    {item.qc_flags.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {item.qc_flags.map((flag) => (
                          <div key={`${item.source_id}-${flag.code}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <div className="text-sm font-medium text-amber-900">{flag.code}</div>
                            <div className="mt-1 text-sm text-amber-900">{flag.message}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                      {availableActions(item.source_status).length > 0 ? availableActions(item.source_status).map((candidate) => (
                        <Button
                          key={`${item.source_id}-${candidate.action}`}
                          size="sm"
                          variant={candidate.variant}
                          disabled={submittingKey === item.source_id}
                          onClick={() => void mutate(candidate.action, { source_id: item.source_id })}
                        >
                          {submittingKey === item.source_id ? '处理中...' : candidate.label}
                        </Button>
                      )) : <div className="text-sm text-slate-500">No further bounded action is available for this source.</div>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-base font-semibold">Register Draft Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-6">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="kb-source-title">Title</Label>
                      <Input id="kb-source-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New KB Source" className="mt-2" />
                    </div>
                    <div>
                      <Label>Customer</Label>
                      <div className="mt-2">
                        <Select value={customerId || '__none__'} onValueChange={(value) => setCustomerId(value === '__none__' ? '' : value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">unbound</SelectItem>
                            {customers.map((customer) => (
                              <SelectItem key={customer.customer_id} value={customer.customer_id}>{customer.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Source Type</Label>
                      <div className="mt-2">
                        <Select value={sourceType} onValueChange={(value) => setSourceType(value as InventoryItem['source_type'])}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="markdown">markdown</SelectItem>
                            <SelectItem value="text">text</SelectItem>
                            <SelectItem value="url">url</SelectItem>
                            <SelectItem value="pdf">pdf</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="kb-source-scope">KB Scope</Label>
                      <Input id="kb-source-scope" value={kbScope} onChange={(e) => setKbScope(e.target.value)} placeholder="general" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="kb-source-ref">Source Ref</Label>
                      {sourceType === 'text' ? (
                        <Textarea id="kb-source-ref" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="Paste inline text content" className="mt-2 min-h-28" />
                      ) : (
                        <Input id="kb-source-ref" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder={sourceType === 'url' ? 'https://example.com/help' : 'app/configs/faq-kb/new-source.md'} className="mt-2" />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="kb-source-context">Customer Context</Label>
                      <Textarea id="kb-source-context" value={customerContext} onChange={(e) => setCustomerContext(e.target.value)} placeholder="Optional customer or solution context" className="mt-2 min-h-20" />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Manifest Baseline</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {manifestDocuments.map((doc) => (
                        <TonePill key={doc.id} tone="blue">{doc.id}</TonePill>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => void mutate('register', { title, customer_id: customerId || null, source_type: sourceType, source_ref: sourceRef, kb_scope: kbScope, customer_context: customerContext })}
                    disabled={submittingKey === 'register'}
                  >
                    {submittingKey === 'register' ? 'Creating Draft...' : 'Register Draft Source'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-base font-semibold">Operator Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div>
                    <Label htmlFor="kb-operator-id">Operator ID</Label>
                    <Input id="kb-operator-id" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="operator_id" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="kb-confirm-token">Confirm Token</Label>
                    <Input id="kb-confirm-token" type="password" value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="WRITE_CONFIRM_TOKEN" className="mt-2" />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="size-4 rounded border-slate-300" />
                    I acknowledge this is a bounded KB mutation action.
                  </label>
                  {message ? (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      {message}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
