'use client'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PromptPolicySummary = {
  outcome?: string | null
  reason?: string | null
  checks?: string[] | null
}

type PromptRuntimeSummary = {
  assembly_mode?: string | null
  primary_prompt_slug?: string | null
  prompt_count?: number | null
  prompt_sources?: string[] | null
}

type SessionKernelSummary = {
  kernel_id?: string | null
  thread_action?: string | null
  turn_relation_type?: string | null
  previous_turns?: number | null
  memory_policy?: string | null
  memory_ref_count?: number | null
  learning_ref_count?: number | null
  customer_ref_count?: number | null
  recall_triggered?: boolean
  verification_outcome?: string | null
  source_plane?: string | null
  workspace_primary_plane?: string | null
  workspace_default_entry_path?: string | null
  workspace_capability_count?: number | null
  workspace_focus_count?: number | null
}

type InteractionLogItem = {
  log_id: string
  created_at: string
  session_id: string | null
  requester_id: string | null
  entry_channel: string | null
  customer_id: string | null
  raw_query: string
  effective_query: string | null
  intent_type: string | null
  intent_type_canonical: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  source_plane: string | null
  answer_type: string | null
  success: boolean
  status_code: number
  fallback_required: boolean
  review_required: boolean
  clarification_required: boolean
  confidence: number | null
  summary: string | null
  query_mode: string | null
  scope: string | null
  meta: Record<string, unknown>
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


function asPromptPolicySummary(meta: Record<string, unknown>): PromptPolicySummary | null {
  const value = meta.prompt_policy
  return value && typeof value === 'object' ? (value as PromptPolicySummary) : null
}

function asPromptRuntimeSummary(meta: Record<string, unknown>): PromptRuntimeSummary | null {
  const value = meta.prompt_runtime
  return value && typeof value === 'object' ? (value as PromptRuntimeSummary) : null
}

function asSessionKernelSummary(meta: Record<string, unknown>): SessionKernelSummary | null {
  const value = meta.session_kernel
  return value && typeof value === 'object' ? (value as SessionKernelSummary) : null
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  )
}

export function InteractionLogSurface({ source, items }: { source: 'supabase' | 'empty'; items: InteractionLogItem[] }) {
  const successCount = items.filter((item) => item.success).length
  const reviewCount = items.filter((item) => item.review_required).length
  const clarificationCount = items.filter((item) => item.clarification_required).length
  const planeMix = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.source_plane || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8f3ff_0%,#f8fafc_38%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Interaction Learning Log</h1>
              <div className="mt-1 text-sm text-slate-500">Runtime-first interaction telemetry for learning, QA, and future memory evolution.</div>
            </div>
            <AppNav current="interaction_log" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Captured" value={String(items.length)} />
            <Metric label="Success" value={String(successCount)} />
            <Metric label="Review" value={String(reviewCount)} />
            <Metric label="Clarification" value={String(clarificationCount)} />
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
                  No runtime interaction logs yet. Once chat traffic is captured, records will appear here.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.log_id} className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.log_id}</div>
                        <div className="text-xl font-semibold tracking-tight text-slate-950">{item.raw_query}</div>
                        <div className="flex flex-wrap gap-2">
                          <Pill tone={item.success ? 'emerald' : 'rose'}>{item.success ? 'success' : 'failure'}</Pill>
                          <Pill tone="sky">{item.source_plane || 'unknown'}</Pill>
                          {item.answer_type && <Pill tone={item.answer_type === 'review' ? 'amber' : item.answer_type === 'clarification' ? 'rose' : 'slate'}>{item.answer_type}</Pill>}
                          {item.primary_capability_id && <Pill>{item.primary_capability_id}</Pill>}
                          {item.scope && <Pill>{`scope: ${item.scope}`}</Pill>}
                          {item.query_mode && <Pill>{`mode: ${item.query_mode}`}</Pill>}
                          {typeof item.confidence === 'number' && <Pill>{`confidence: ${item.confidence.toFixed(2)}`}</Pill>}
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
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Summary</div>
                        <div className="text-sm leading-7 text-slate-700">{item.summary || 'No summary captured.'}</div>
                        {item.effective_query && item.effective_query !== item.raw_query ? (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">effective_query</div>
                            <div className="mt-1">{item.effective_query}</div>
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Learning Signals</div>
                        <div className="flex flex-wrap gap-2">
                          {item.review_required && <Pill tone="amber">review_required</Pill>}
                          {item.fallback_required && <Pill tone="amber">fallback_required</Pill>}
                          {item.clarification_required && <Pill tone="rose">clarification_required</Pill>}
                          {item.intent_type && <Pill>{`intent: ${item.intent_type}`}</Pill>}
                          {item.intent_type_canonical && <Pill>{`canonical: ${item.intent_type_canonical}`}</Pill>}
                          {item.entry_channel && <Pill>{`channel: ${item.entry_channel}`}</Pill>}
                          {item.customer_id && <Pill>{`customer: ${item.customer_id}`}</Pill>}
                          {item.requester_id && <Pill>{`requester: ${item.requester_id}`}</Pill>}
                          {item.session_id && <Pill>{`session: ${item.session_id}`}</Pill>}
                        </div>
                        {(() => {
                          const promptPolicy = asPromptPolicySummary(item.meta)
                          if (!promptPolicy) return null
                          return (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">prompt_policy</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {promptPolicy.outcome && <Pill tone={promptPolicy.outcome === 'allow' ? 'emerald' : 'amber'}>{`policy: ${promptPolicy.outcome}`}</Pill>}
                                {promptPolicy.reason && <Pill tone="amber">{promptPolicy.reason}</Pill>}
                                {Array.isArray(promptPolicy.checks)
                                  ? promptPolicy.checks.map((check) => <Pill key={check}>{check}</Pill>)
                                  : null}
                              </div>
                            </div>
                          )
                        })()}
                        {(() => {
                          const promptRuntime = asPromptRuntimeSummary(item.meta)
                          if (!promptRuntime) return null
                          return (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">prompt_runtime</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {promptRuntime.assembly_mode && <Pill tone="sky">{`assembly: ${promptRuntime.assembly_mode}`}</Pill>}
                                {promptRuntime.primary_prompt_slug && <Pill>{`primary: ${promptRuntime.primary_prompt_slug}`}</Pill>}
                                {typeof promptRuntime.prompt_count === 'number' && <Pill>{`prompts: ${promptRuntime.prompt_count}`}</Pill>}
                                {Array.isArray(promptRuntime.prompt_sources)
                                  ? promptRuntime.prompt_sources.map((source) => <Pill key={source}>{`source: ${source}`}</Pill>)
                                  : null}
                              </div>
                            </div>
                          )
                        })()}
                        {(() => {
                          const sessionKernel = asSessionKernelSummary(item.meta)
                          if (!sessionKernel) return null
                          return (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">session_kernel</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {sessionKernel.thread_action && <Pill tone="sky">{`thread: ${sessionKernel.thread_action}`}</Pill>}
                                {sessionKernel.turn_relation_type && <Pill>{`relation: ${sessionKernel.turn_relation_type}`}</Pill>}
                                {typeof sessionKernel.previous_turns === 'number' && <Pill>{`previous_turns: ${sessionKernel.previous_turns}`}</Pill>}
                                {sessionKernel.memory_policy && <Pill>{`memory: ${sessionKernel.memory_policy}`}</Pill>}
                                {typeof sessionKernel.memory_ref_count === 'number' && <Pill>{`refs: ${sessionKernel.memory_ref_count}`}</Pill>}
                                {typeof sessionKernel.learning_ref_count === 'number' && <Pill>{`learning_refs: ${sessionKernel.learning_ref_count}`}</Pill>}
                                {typeof sessionKernel.customer_ref_count === 'number' && <Pill>{`customer_refs: ${sessionKernel.customer_ref_count}`}</Pill>}
                                {sessionKernel.workspace_primary_plane && <Pill tone="sky">{`workspace: ${sessionKernel.workspace_primary_plane}`}</Pill>}
                                {sessionKernel.workspace_default_entry_path && <Pill>{`entry: ${sessionKernel.workspace_default_entry_path}`}</Pill>}
                                {typeof sessionKernel.workspace_capability_count === 'number' && <Pill>{`workspace_caps: ${sessionKernel.workspace_capability_count}`}</Pill>}
                                {typeof sessionKernel.workspace_focus_count === 'number' && <Pill>{`workspace_surfaces: ${sessionKernel.workspace_focus_count}`}</Pill>}
                                {sessionKernel.recall_triggered && <Pill tone="emerald">recall_triggered</Pill>}
                                {sessionKernel.verification_outcome && <Pill tone={sessionKernel.verification_outcome === 'pass' ? 'emerald' : sessionKernel.verification_outcome === 'review' ? 'amber' : 'rose'}>{`verify: ${sessionKernel.verification_outcome}`}</Pill>}
                              </div>
                              {sessionKernel.kernel_id ? <div className="mt-2 break-all text-xs text-slate-400">{sessionKernel.kernel_id}</div> : null}
                            </div>
                          )
                        })()}
                        {item.matched_capability_ids.length > 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">matched_capability_ids</div>
                            <div className="mt-1 break-all">{item.matched_capability_ids.join(', ')}</div>
                          </div>
                        ) : null}
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
