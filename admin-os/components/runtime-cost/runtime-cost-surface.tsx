
'use client'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerPolicyEvidenceCard } from '@/components/customers/customer-policy-evidence-card'
import type { RuntimeCostEventRow } from '@/lib/runtime-cost/runtime'

type CustomerPolicyEvidence = {
  customer_id: string
  policy_version: string
  summary: string
  primary_plane: string | null
  default_entry_path: string | null
  auth_primary_method: string | null
  auth_verification_posture: string | null
  delivery_summary_style: string | null
  review_escalation_style: string | null
  clarification_style: string | null
  focused_surfaces: string[]
  recommended_route_order: string[]
  preferred_capability_count: number
}

type RuntimeCostSurfaceRow = RuntimeCostEventRow & {
  customer_policy_evidence?: CustomerPolicyEvidence | null
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky' }) {
  const styles = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  }[tone]
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles}`}>{children}</span>
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  )
}

export function RuntimeCostSurface({ source, items }: { source: 'supabase' | 'empty'; items: RuntimeCostSurfaceRow[] }) {
  const totalCost = items.reduce((sum, item) => sum + item.estimated_cost_usd, 0)
  const totalTokens = items.reduce((sum, item) => sum + item.tokens_used, 0)
  const avgLatency = items.length ? Math.round(items.reduce((sum, item) => sum + item.duration_ms, 0) / items.length) : 0
  const reviewCount = items.filter((item) => item.verification_outcome === 'review').length
  const planeMix = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.source_plane || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <AuthGuard requiredSurface="costs">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#f8fafc_36%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Runtime Cost</h1>
              <div className="mt-1 text-sm text-slate-500">Configurable token and cost accounting across runtime planes, verification outcomes, and customer-scoped chat traffic.</div>
            </div>
            <AppNav current="costs" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Events" value={String(items.length)} />
            <Metric label="Total Tokens" value={String(totalTokens)} />
            <Metric label="Est. Cost" value={`$${totalCost.toFixed(4)}`} hint="Configured internal estimate" />
            <Metric label="Avg Latency" value={`${avgLatency}ms`} hint={`review outcomes: ${reviewCount}`} />
          </section>

          <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">Runtime Snapshot</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={source === 'supabase' ? 'emerald' : 'amber'}>{`source: ${source}`}</Pill>
                  {Object.entries(planeMix).map(([plane, count]) => (
                    <Pill key={plane} tone="sky">{`${plane}: ${count}`}</Pill>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
                  No runtime cost events yet. Execute chat traffic after the runtime cost table is created.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.event_id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.event_id}</div>
                        <div className="text-xl font-semibold tracking-tight text-slate-950">{item.raw_query}</div>
                        <div className="flex flex-wrap gap-2">
                          <Pill tone={item.success ? 'emerald' : 'rose'}>{item.success ? 'success' : 'failure'}</Pill>
                          <Pill tone={item.verification_outcome === 'review' ? 'amber' : item.verification_outcome === 'block' ? 'rose' : 'sky'}>{item.verification_outcome || 'unknown'}</Pill>
                          {item.source_plane && <Pill>{item.source_plane}</Pill>}
                          {item.primary_capability_id && <Pill>{item.primary_capability_id}</Pill>}
                          {item.customer_id && <Pill>{`customer: ${item.customer_id}`}</Pill>}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">created_at</div>
                        <div className="mt-1 font-medium text-slate-800">{new Date(item.created_at).toLocaleString('zh-CN', { hour12: false })}</div>
                        <div className="mt-2 text-xs text-slate-500">status {item.status_code}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Cost Profile</div>
                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">tokens</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">{item.tokens_used}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">est. cost</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">${item.estimated_cost_usd.toFixed(6)}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">duration</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">{item.duration_ms}ms</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">model source</div>
                            <div className="mt-1 text-sm font-medium text-slate-800">{item.model_source || 'n/a'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Control Signals</div>
                        <div className="flex flex-wrap gap-2">
                          {item.fallback_required && <Pill tone="amber">fallback_required</Pill>}
                          {item.review_required && <Pill tone="amber">review_required</Pill>}
                          {item.intent_type && <Pill>{`intent: ${item.intent_type}`}</Pill>}
                          {item.intent_type_canonical && <Pill>{`canonical: ${item.intent_type_canonical}`}</Pill>}
                          {item.entry_channel && <Pill>{`channel: ${item.entry_channel}`}</Pill>}
                          {item.session_id && <Pill>{`session: ${item.session_id}`}</Pill>}
                        </div>
                        <CustomerPolicyEvidenceCard
                          evidence={item.customer_policy_evidence}
                          title="customer_policy_evidence"
                          compact
                        />
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">matched capabilities</div>
                          <div className="mt-1 break-all">{item.matched_capability_ids.join(', ') || 'none'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
