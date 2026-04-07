'use client'

import type { ReactNode } from 'react'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PromptGovernanceSnapshot } from '@/lib/prompts/governance'

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

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'amber' | 'sky' }) {
  const toneClass = {
    slate: 'from-white to-slate-50',
    emerald: 'from-white to-emerald-50',
    amber: 'from-white to-amber-50',
    sky: 'from-white to-sky-50',
  }[tone]
  return (
    <div className={`rounded-3xl border border-white/70 bg-gradient-to-b ${toneClass} px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  )
}

export function PromptGovernanceSurface({ snapshot }: { snapshot: PromptGovernanceSnapshot }) {
  return (
    <AuthGuard requiredSurface="prompts">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#f8fafc_40%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Prompt Governance</h1>
              <div className="mt-1 text-sm text-slate-500">Filesystem-first prompt inventory, policy evidence, and Git-managed change boundary.</div>
            </div>
            <AppNav current="prompts" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Inventory" value={String(snapshot.prompts.length)} tone="sky" />
            <Metric label="Source" value={snapshot.source} tone="emerald" />
            <Metric label="Policy Reviews" value={String(snapshot.runtime.policy_review)} tone="amber" />
            <Metric label="Runtime Uses" value={String(snapshot.runtime.filesystem_prompt_count)} tone="slate" />
          </section>

          <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Architecture Boundary</CardTitle>
              <CardDescription>Prompt content lives in markdown files under `admin-os/prompts/`. Runtime evidence can go to Supabase, but prompt source of truth cannot.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Pill tone="emerald">filesystem_first</Pill>
              <Pill tone="sky">git_managed_release</Pill>
              <Pill tone="amber">supabase_not_allowed_for_prompt_content</Pill>
              <Pill tone="rose">ui_edit_disabled</Pill>
            </CardContent>
          </Card>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Prompt Inventory</CardTitle>
                <CardDescription>Active prompt documents by family, version, file path, and runtime source.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.prompts.map((prompt) => (
                  <div key={prompt.slug} className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-slate-950">{prompt.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{prompt.slug}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone="emerald">{prompt.source}</Pill>
                        <Pill tone="sky">{prompt.family || 'untyped'}</Pill>
                        <Pill>{`v${prompt.version}`}</Pill>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Description</div>
                        <div className="mt-2">{prompt.description || 'No description.'}</div>
                        <div className="mt-3 text-xs text-slate-500">{prompt.file_path || 'n/a'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Model Config</div>
                        <pre className="mt-2 overflow-auto rounded-2xl bg-white p-3 text-xs text-slate-600">{JSON.stringify(prompt.model_config, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Policy Summary</CardTitle>
                  <CardDescription>Allowed prompt sources and required execution prompt coverage by customer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.policy.map((item) => (
                    <div key={item.customer_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-sm font-semibold text-slate-950">{item.customer_id}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.allowed_intent_sources.map((source) => <Pill key={`${item.customer_id}-intent-${source}`} tone="sky">{`intent:${source}`}</Pill>)}
                        {item.allowed_execution_sources.map((source) => <Pill key={`${item.customer_id}-exec-${source}`} tone="emerald">{`exec:${source}`}</Pill>)}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">required execution capabilities: {item.execution_prompt_required_capabilities.join(', ') || 'none'}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Runtime Evidence</CardTitle>
                  <CardDescription>Observed prompt usage and policy review reasons from recent interaction logs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Primary Prompt Mix</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {snapshot.runtime.primary_prompt_mix.length > 0
                          ? snapshot.runtime.primary_prompt_mix.map((item) => <Pill key={item.slug}>{`${item.slug} × ${item.count}`}</Pill>)
                          : <span className="text-xs text-slate-400">no runtime evidence</span>}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Policy Reason Mix</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {snapshot.runtime.policy_reason_mix.length > 0
                          ? snapshot.runtime.policy_reason_mix.map((item) => <Pill key={item.reason} tone="amber">{`${item.reason} × ${item.count}`}</Pill>)
                          : <span className="text-xs text-slate-400">no review reasons</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                  <CardDescription>File-backed version lanes. Release and rollback happen by switching active markdown documents in Git, not by mutating tables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(snapshot.histories).map(([slug, versions]) => (
                    <div key={slug} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-sm font-semibold text-slate-950">{slug}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {versions.map((version) => (
                          <Pill key={`${slug}-${version.version}`} tone={version.is_active ? 'emerald' : 'slate'}>
                            {version.is_active ? `active:v${version.version}` : `history:v${version.version}`}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  )
}
