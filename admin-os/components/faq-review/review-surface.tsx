'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { READ_ONLY_DEMO, WRITE_ENABLED } from '@/lib/utils'

type ReviewItem = {
  review_id: string
  question: string
  reason: string
  priority: 'high' | 'normal'
  queue_status: string
  customer_id?: string | null
  kb_scope: string | null
  channel: string | null
  confidence: number | null
  created_at: string
  draft_answer: string | null
  citations: Array<{ source_id?: string; title?: string; snippet?: string }>
  review_queue_label?: string | null
  operator_hint?: string | null
  suggested_actions?: string[]
  escalation_style?: 'operator' | 'guided' | 'observer' | null
}

type ReviewSurfaceProps = {
  queueId: string
  queueSource: 'supabase' | 'seed'
  items: ReviewItem[]
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'emerald' }) {
  const toneClass = {
    blue: 'from-sky-500/15 via-blue-500/10 to-indigo-500/15 border-sky-200 text-sky-950',
    amber: 'from-amber-500/15 via-orange-500/10 to-yellow-500/15 border-amber-200 text-amber-950',
    emerald: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-emerald-200 text-emerald-950',
  }[tone]

  return (
    <div className={`rounded-3xl border bg-gradient-to-br px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function QueueBadge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'amber' | 'rose' | 'emerald' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone]

  return <span className={`rounded-full border px-3 py-1 text-xs ${toneClass}`}>{children}</span>
}

function getActionButtons(queueStatus: string): Array<{ action: 'approve' | 'reject' | 'resolve'; label: string; variant: 'default' | 'outline' }> {
  if (queueStatus === 'prepared') {
    return [
      { action: 'approve', label: 'Approve', variant: 'default' },
      { action: 'reject', label: 'Reject', variant: 'outline' },
    ]
  }
  if (queueStatus === 'approved') {
    return [{ action: 'resolve', label: 'Mark Resolved', variant: 'default' }]
  }
  return []
}

export function FaqReviewSurface({ queueId, queueSource, items }: ReviewSurfaceProps) {
  const router = useRouter()
  const [operatorId, setOperatorId] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [approved, setApproved] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('success')

  const highPriority = items.filter((item) => item.priority === 'high').length
  const withEvidence = items.filter((item) => item.citations.length > 0).length
  const lowConfidenceCount = items.filter((item) => typeof item.confidence === 'number' && item.confidence < 0.5).length
  const reasonCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1
    return acc
  }, {})
  const scopeCounts = items.reduce<Record<string, number>>((acc, item) => {
    const scope = item.kb_scope || 'unscoped'
    acc[scope] = (acc[scope] || 0) + 1
    return acc
  }, {})
  const actionableCount = useMemo(() => items.filter((item) => getActionButtons(item.queue_status).length > 0).length, [items])

  async function submitAction(reviewId: string, action: 'approve' | 'reject' | 'resolve') {
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
      setMessage('Approval checkbox is required before mutating review state.')
      return
    }
    if (!operatorId.trim() || !confirmToken.trim()) {
      setMessageTone('error')
      setMessage('Missing operator_id or confirm_token.')
      return
    }

    setSubmittingId(reviewId)
    setMessage(null)

    try {
      const res = await fetch('/api/faq-review/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: reviewId,
          action,
          approved_by: operatorId.trim(),
          approved,
          confirm_token: confirmToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'faq_review_action_failed')
      }
      setMessageTone('success')
      setMessage(`Review ${data.review_id}: ${data.previous_status} -> ${data.queue_status}`)
      router.refresh()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'faq_review_action_failed')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff4e8_0%,#f8fafc_40%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">FAQ Review Queue</h1>
              <div className="mt-1 text-sm text-slate-500">Review visibility + bounded operator actions for FAQ / KB manual fallback cases.</div>
            </div>
            <AppNav current="faq_review" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-5">
            <StatCard label="Prepared Cases" value={String(items.length)} tone="blue" />
            <StatCard label="High Priority" value={String(highPriority)} tone="amber" />
            <StatCard label="With Citations" value={String(withEvidence)} tone="emerald" />
            <StatCard label="Low Confidence" value={String(lowConfidenceCount)} tone="amber" />
            <StatCard label="Actionable" value={String(actionableCount)} tone="blue" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <Card className="overflow-hidden border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base font-semibold">Queue Snapshot</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <QueueBadge tone="slate">{queueId}</QueueBadge>
                    <QueueBadge tone={queueSource === 'supabase' ? 'emerald' : 'amber'}>{`source: ${queueSource}`}</QueueBadge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {items.map((item) => {
                  const actions = getActionButtons(item.queue_status)
                  return (
                    <div key={item.review_id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.review_id}</div>
                          <div className="text-xl font-semibold tracking-tight text-slate-950">{item.question}</div>
                          <div className="flex flex-wrap gap-2">
                            <QueueBadge tone={item.priority === 'high' ? 'amber' : 'slate'}>{item.priority}</QueueBadge>
                            <QueueBadge tone="rose">{item.reason}</QueueBadge>
                            <QueueBadge tone={item.queue_status === 'approved' ? 'emerald' : item.queue_status === 'resolved' ? 'slate' : item.queue_status === 'rejected' ? 'rose' : 'amber'}>{item.queue_status}</QueueBadge>
                            {item.customer_id && <QueueBadge>{`customer: ${item.customer_id}`}</QueueBadge>}
                            {item.review_queue_label && <QueueBadge tone="emerald">{item.review_queue_label}</QueueBadge>}
                            {item.escalation_style && <QueueBadge>{`style: ${item.escalation_style}`}</QueueBadge>}
                            {item.kb_scope && <QueueBadge>{`scope: ${item.kb_scope}`}</QueueBadge>}
                            {item.channel && <QueueBadge>{`channel: ${item.channel}`}</QueueBadge>}
                            {typeof item.confidence === 'number' && <QueueBadge>{`confidence: ${item.confidence.toFixed(2)}`}</QueueBadge>}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">created_at</div>
                          <div className="mt-1 font-medium text-slate-800">{new Date(item.created_at).toLocaleString('zh-CN', { hour12: false })}</div>
                        </div>
                      </div>

                      {item.operator_hint && (
                        <div className="mt-5 rounded-3xl border border-sky-200 bg-sky-50/80 p-4 text-sm leading-7 text-sky-900">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-600">Operator Hint</div>
                          <div className="mt-2">{item.operator_hint}</div>
                        </div>
                      )}

                      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Draft Answer</div>
                          <div className="text-sm leading-7 text-slate-700">{item.draft_answer || 'No draft answer was preserved for this case.'}</div>
                        </div>
                        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Citations</div>
                          {item.citations.length > 0 ? (
                            <div className="space-y-3">
                              {item.citations.map((citation, index) => (
                                <div key={`${citation.source_id || 'citation'}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                  <div className="text-sm font-medium text-slate-800">{citation.title || citation.source_id || 'Untitled source'}</div>
                                  {citation.snippet && <div className="mt-1 text-sm leading-6 text-slate-600">{citation.snippet}</div>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">This case entered review without retained citations.</div>
                          )}
                        </div>
                      </div>

                      {Array.isArray(item.suggested_actions) && item.suggested_actions.length > 0 && (
                        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Suggested Next Actions</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.suggested_actions.map((action) => (
                              <QueueBadge key={`${item.review_id}-${action}`}>{action}</QueueBadge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                        {actions.length > 0 ? (
                          actions.map((itemAction) => (
                            <Button
                              key={`${item.review_id}-${itemAction.action}`}
                              size="sm"
                              variant={itemAction.variant}
                              disabled={submittingId === item.review_id}
                              onClick={() => void submitAction(item.review_id, itemAction.action)}
                            >
                              {submittingId === item.review_id ? '处理中...' : itemAction.label}
                            </Button>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">No further bounded action is available for this status.</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base font-semibold">Operator Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="faq-review-operator">Operator ID</Label>
                    <Input id="faq-review-operator" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="operator_id" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="faq-review-token">Confirm Token</Label>
                    <Input id="faq-review-token" type="password" value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="confirm_token" className="mt-2" />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    I acknowledge this mutates runtime review state.
                  </label>
                  {READ_ONLY_DEMO && <div className="text-sm text-rose-600">Read-only demo mode: actions are disabled.</div>}
                  {!READ_ONLY_DEMO && !WRITE_ENABLED && <div className="text-sm text-rose-600">Write mode disabled. Enable write mode before applying actions.</div>}
                  {message && (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${messageTone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      {message}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Reason Mix</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(reasonCounts).map(([reason, count]) => (
                      <QueueBadge key={reason} tone="rose">{`${reason}: ${count}`}</QueueBadge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Scope Mix</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(scopeCounts).map(([scope, count]) => (
                      <QueueBadge key={scope}>{`${scope}: ${count}`}</QueueBadge>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,245,249,0.92))] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bounded Actions</div>
                  <div className="mt-3 text-sm leading-7 text-slate-700">
                    prepared {'->'} approved/rejected；approved {'->'} resolved。其余状态不提供进一步动作，避免越权修改 review 结果。
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
