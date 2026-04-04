'use client'

import type { ReactNode } from 'react'
import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LearningAssetSnapshot } from '@/lib/interaction-learning/derivation'

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'sky' | 'rose' }) {
  const styles = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }[tone]
  return <span className={`rounded-full border px-3 py-1 text-xs ${styles}`}>{children}</span>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  )
}

export function LearningAssetsSurface({ snapshot }: { snapshot: LearningAssetSnapshot }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0fdf4_0%,#f8fafc_35%,#eff6ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Learning Assets</h1>
              <div className="mt-1 text-sm text-slate-500">Derived learning assets from runtime interaction logs, organized for prompt, capability, and customer-level improvement.</div>
            </div>
            <AppNav current="learning_assets" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-5">
            <Metric label="Interactions" value={String(snapshot.totals.interactions)} />
            <Metric label="Hard Cases" value={String(snapshot.totals.hard_cases)} />
            <Metric label="Capability Patterns" value={String(snapshot.totals.capability_candidates)} />
            <Metric label="Customers" value={String(snapshot.totals.customers)} />
            <Metric label="Policy Issues" value={String(snapshot.totals.prompt_policy_issues)} />
          </section>

          <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Snapshot</CardTitle>
              <CardDescription>Runtime-first derivation. Export markdown from `/api/learning-assets/export` if you want to checkpoint this into docs or review it externally.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Pill tone={snapshot.source === 'supabase' ? 'emerald' : 'amber'}>{`source: ${snapshot.source}`}</Pill>
              <Pill tone="sky">{`generated: ${new Date(snapshot.generated_at).toLocaleString('zh-CN', { hour12: false })}`}</Pill>
              <Pill>markdown_export_ready</Pill>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Hard Cases</CardTitle>
                  <CardDescription>Cases that should feed clarification tuning, review routing, and prompt improvement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.hard_cases.length > 0 ? snapshot.hard_cases.map((item) => (
                    <div key={item.log_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-sm font-semibold text-slate-950">{item.raw_query}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill tone={item.issue_type === 'failure' ? 'rose' : item.issue_type === 'clarification' ? 'amber' : 'sky'}>{item.issue_type}</Pill>
                        {item.primary_capability_id ? <Pill>{item.primary_capability_id}</Pill> : null}
                        {item.source_plane ? <Pill>{item.source_plane}</Pill> : null}
                        {item.customer_id ? <Pill>{`customer: ${item.customer_id}`}</Pill> : null}
                        {item.issue_reason ? <Pill tone="amber">{item.issue_reason}</Pill> : null}
                      </div>
                      {item.summary ? <div className="mt-3 text-sm text-slate-600">{item.summary}</div> : null}
                    </div>
                  )) : <div className="text-sm text-slate-500">No hard cases captured yet.</div>}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Prompt Policy Issues</CardTitle>
                  <CardDescription>Prompt-related review reasons worth turning into policy or prompt fixes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.prompt_policy_issues.length > 0 ? snapshot.prompt_policy_issues.map((issue) => (
                    <div key={issue.reason} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{issue.reason}</div>
                        <Pill tone="amber">{`count: ${issue.count}`}</Pill>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {issue.sample_queries.map((sample) => <div key={sample}>- {sample}</div>)}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No prompt policy issues recorded.</div>}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Capability Candidates</CardTitle>
                  <CardDescription>Observed successful patterns that can become templates, planner examples, or routing priors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.capability_candidates.length > 0 ? snapshot.capability_candidates.map((item) => (
                    <div key={item.key} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-sm font-semibold text-slate-950">{item.primary_capability_id}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.source_plane ? <Pill>{item.source_plane}</Pill> : null}
                        {item.scope ? <Pill>{`scope: ${item.scope}`}</Pill> : null}
                        {item.query_mode ? <Pill>{`mode: ${item.query_mode}`}</Pill> : null}
                        <Pill tone="emerald">{`success: ${item.success_count}`}</Pill>
                        <Pill tone="amber">{`review: ${item.review_count}`}</Pill>
                        <Pill tone="rose">{`clarify: ${item.clarification_count}`}</Pill>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {item.sample_queries.map((sample) => <div key={sample}>- {sample}</div>)}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No capability candidates derived yet.</div>}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Customer Profiles</CardTitle>
                  <CardDescription>Early customer-level query preference profiles derived from actual runtime usage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.customer_profiles.length > 0 ? snapshot.customer_profiles.map((profile) => (
                    <div key={profile.customer_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{profile.customer_id}</div>
                        <Pill tone="sky">{`interactions: ${profile.total_interactions}`}</Pill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.top_planes.map((plane) => <Pill key={`${profile.customer_id}-${plane.plane}`}>{`${plane.plane} × ${plane.count}`}</Pill>)}
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        {profile.top_capabilities.map((cap) => <div key={`${profile.customer_id}-${cap.capability_id}`}>capability: {cap.capability_id} × {cap.count}</div>)}
                        {profile.top_issue_reasons.map((reason) => <div key={`${profile.customer_id}-${reason.reason}`}>issue: {reason.reason} × {reason.count}</div>)}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No customer profiles derived yet.</div>}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  )
}
