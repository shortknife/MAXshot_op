import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { AppNav } from '@/components/app-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import reviewQueue from '@/app/configs/faq-kb/review_queue_seed_v1.json'

type ReviewItem = {
  review_id: string
  question: string
  reason: string
  priority: 'high' | 'normal'
  queue_status: string
  kb_scope: string | null
  channel: string | null
  confidence: number | null
  created_at: string
  draft_answer: string | null
  citations: Array<{ source_id?: string; title?: string; snippet?: string }>
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

function QueueBadge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'amber' | 'rose' | 'emerald' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone]

  return <span className={`rounded-full border px-3 py-1 text-xs ${toneClass}`}>{children}</span>
}

export default function FaqReviewPage() {
  const items = reviewQueue.items as ReviewItem[]
  const highPriority = items.filter((item) => item.priority === 'high').length
  const withEvidence = items.filter((item) => item.citations.length > 0).length

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff4e8_0%,#f8fafc_40%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">FAQ Review Queue</h1>
              <div className="mt-1 text-sm text-slate-500">只读 review visibility，用于验证 FAQ / KB Plane 的人工兜底链路。</div>
            </div>
            <AppNav current="faq_review" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Prepared Cases" value={String(items.length)} tone="blue" />
            <StatCard label="High Priority" value={String(highPriority)} tone="amber" />
            <StatCard label="With Citations" value={String(withEvidence)} tone="emerald" />
          </section>

          <Card className="overflow-hidden border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Queue Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {items.map((item) => (
                <div key={item.review_id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.review_id}</div>
                      <div className="text-xl font-semibold tracking-tight text-slate-950">{item.question}</div>
                      <div className="flex flex-wrap gap-2">
                        <QueueBadge tone={item.priority === 'high' ? 'amber' : 'slate'}>{item.priority}</QueueBadge>
                        <QueueBadge tone="rose">{item.reason}</QueueBadge>
                        <QueueBadge tone="emerald">{item.queue_status}</QueueBadge>
                        {item.kb_scope && <QueueBadge>{`scope: ${item.kb_scope}`}</QueueBadge>}
                        {item.channel && <QueueBadge>{`channel: ${item.channel}`}</QueueBadge>}
                        {typeof item.confidence === 'number' && <QueueBadge>{`confidence: ${item.confidence.toFixed(2)}`}</QueueBadge>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">created_at</div>
                      <div className="mt-1 font-medium text-slate-800">{item.created_at}</div>
                    </div>
                  </div>

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
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
