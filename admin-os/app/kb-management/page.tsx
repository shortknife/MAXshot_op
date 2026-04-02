import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { AppNav } from '@/components/app-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadFaqKbManifest } from '@/lib/faq-kb/loaders'
import { loadKbQcRuntimePreview } from '@/lib/faq-kb/qc-runtime'

export const dynamic = 'force-dynamic'

type ManifestDoc = {
  id: string
  title: string
  kb_scope?: string | null
  path: string
  keywords?: string[]
}

type QcFlag = {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
}

type QcItem = {
  source_id: string
  title: string
  kb_scope: string
  source_type: string
  ingest_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number
  chunk_count: number
  qc_flags: QcFlag[]
}

function TonePill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' }) {
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

export default async function KbManagementPage() {
  const manifest = loadFaqKbManifest()
  const docs = manifest.documents as ManifestDoc[]
  const qcPreview = await loadKbQcRuntimePreview()
  const qcItems = qcPreview.items as QcItem[]
  const acceptedCount = qcItems.filter((item) => item.ingest_status === 'accepted').length
  const reviewCount = qcItems.filter((item) => item.ingest_status === 'needs_review').length
  const totalChunks = qcItems.reduce((sum, item) => sum + item.chunk_count, 0)
  const scopeCounts = docs.reduce<Record<string, number>>((acc, doc) => {
    const scope = String(doc.kb_scope || 'unscoped')
    acc[scope] = (acc[scope] || 0) + 1
    return acc
  }, {})
  const sourceTypeCounts = qcItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.source_type] = (acc[item.source_type] || 0) + 1
    return acc
  }, {})

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef7ff_0%,#f8fafc_40%,#fff7ed_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">KB Management</h1>
              <div className="mt-1 text-sm text-slate-500">只读管理面，展示 FAQ / KB Plane 当前受控知识资产与 QC readiness。</div>
            </div>
            <AppNav current="kb_management" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatPanel label="Approved Sources" value={String(acceptedCount)} note="当前已接受的受控 KB 来源。" tone="emerald" />
            <StatPanel label="Needs Review" value={String(reviewCount)} note="仍需人工处理或后续能力支持的来源。" tone="amber" />
            <StatPanel label="Chunk Inventory" value={String(totalChunks)} note="运行态快照优先，必要时回退到即时计算的内容块总数。" tone="blue" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base font-semibold">Manifest Sources</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scopeCounts).map(([scope, count]) => (
                      <TonePill key={scope} tone="blue">{`${scope}: ${count}`}</TonePill>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {docs.map((doc) => (
                  <div key={doc.id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{doc.id}</div>
                        <div className="text-xl font-semibold tracking-tight text-slate-950">{doc.title}</div>
                        <div className="flex flex-wrap gap-2">
                          <TonePill tone="blue">{`scope: ${doc.kb_scope || 'unscoped'}`}</TonePill>
                          <TonePill>{doc.path}</TonePill>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(doc.keywords || []).map((keyword) => (
                        <TonePill key={`${doc.id}-${keyword}`} tone="slate">
                          {keyword}
                        </TonePill>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/70 bg-white/82 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-base font-semibold">QC Readiness</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(sourceTypeCounts).map(([sourceType, count]) => (
                      <TonePill key={sourceType}>{`${sourceType}: ${count}`}</TonePill>
                    ))}
                    <TonePill tone="amber">{`generated: ${new Date(qcPreview.generated_at).toLocaleString('zh-CN', { hour12: false })}`}</TonePill>
                    <TonePill tone={qcPreview.source === 'supabase' ? 'emerald' : 'amber'}>{`source: ${qcPreview.source}`}</TonePill>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                {qcItems.map((item) => {
                  const tone = item.ingest_status === 'accepted' ? 'emerald' : item.ingest_status === 'needs_review' ? 'amber' : 'rose'
                  return (
                    <div key={item.source_id} className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.source_id}</div>
                        <div className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</div>
                        <div className="flex flex-wrap gap-2">
                          <TonePill tone={tone}>{item.ingest_status}</TonePill>
                          <TonePill>{`type: ${item.source_type}`}</TonePill>
                          <TonePill>{`scope: ${item.kb_scope}`}</TonePill>
                          <TonePill>{`docs: ${item.document_count}`}</TonePill>
                          <TonePill>{`chunks: ${item.chunk_count}`}</TonePill>
                        </div>
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
                      ) : (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          No QC blockers in the current bounded source slice.
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
