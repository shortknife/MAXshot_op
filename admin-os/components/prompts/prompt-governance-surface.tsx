'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { AppNav } from '@/components/app-nav'
import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { PromptGovernanceSnapshot } from '@/lib/prompts/governance'

type PromptGovernancePrompt = PromptGovernanceSnapshot['prompts'][number]

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
  const router = useRouter()
  const [prompts, setPrompts] = useState(snapshot.prompts)
  const [selectedSlug, setSelectedSlug] = useState(snapshot.prompts[0]?.slug || '')
  const [saving, setSaving] = useState(false)
  const selectedPrompt = useMemo(() => prompts.find((prompt) => prompt.slug === selectedSlug) || null, [prompts, selectedSlug])
  const [editSystemPrompt, setEditSystemPrompt] = useState(selectedPrompt?.system_prompt || '')
  const [editUserPrompt, setEditUserPrompt] = useState(selectedPrompt?.user_prompt_template || '')

  useEffect(() => {
    if (!selectedPrompt) return
    setEditSystemPrompt(selectedPrompt.system_prompt)
    setEditUserPrompt(selectedPrompt.user_prompt_template || '')
  }, [selectedPrompt])

  const refreshSelection = (prompt: PromptGovernancePrompt) => {
    setSelectedSlug(prompt.slug)
    setEditSystemPrompt(prompt.system_prompt)
    setEditUserPrompt(prompt.user_prompt_template || '')
  }

  const handleSave = async () => {
    if (!selectedPrompt || !selectedPrompt.editable) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('prompt_library')
        .update({
          system_prompt: editSystemPrompt,
          user_prompt_template: editUserPrompt || null,
        })
        .eq('slug', selectedPrompt.slug)
      if (error) throw error
      setPrompts((current) => current.map((prompt) => prompt.slug === selectedPrompt.slug ? {
        ...prompt,
        system_prompt: editSystemPrompt,
        user_prompt_template: editUserPrompt || null,
      } : prompt))
      router.refresh()
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('Save failed, please try again later')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0%,#f8fafc_40%,#eef2ff_100%)] text-slate-950">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Prompt Governance</h1>
              <div className="mt-1 text-sm text-slate-500">Inventory, policy, runtime evidence, and bounded editing for the Nexa prompt layer.</div>
            </div>
            <AppNav current="prompts" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Inventory" value={String(prompts.length)} tone="sky" />
            <Metric label="Source" value={snapshot.source} tone={snapshot.source === 'supabase' ? 'emerald' : 'amber'} />
            <Metric label="Recent Reviews" value={String(snapshot.runtime.policy_review)} tone="amber" />
            <Metric label="Local Stub Turns" value={String(snapshot.runtime.local_stub_intent_count)} tone="slate" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Prompt Inventory</CardTitle>
                <CardDescription>Active prompt stock with source, edit boundary, and current model payload.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt.slug}
                      type="button"
                      onClick={() => refreshSelection(prompt)}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${selectedPrompt?.slug === prompt.slug ? 'border-sky-300 bg-sky-50 shadow-[0_16px_40px_rgba(14,165,233,0.12)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="text-sm font-semibold text-slate-950">{prompt.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{prompt.slug}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill tone={prompt.source === 'supabase' ? 'emerald' : 'amber'}>{prompt.source}</Pill>
                        <Pill>{`v${prompt.version}`}</Pill>
                        <Pill tone={prompt.editable ? 'sky' : 'rose'}>{prompt.editable ? 'editable' : 'read_only'}</Pill>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedPrompt ? (
                  <div className="space-y-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-semibold tracking-tight text-slate-950">{selectedPrompt.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{selectedPrompt.description || selectedPrompt.slug}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={selectedPrompt.source === 'supabase' ? 'emerald' : 'amber'}>{selectedPrompt.source}</Pill>
                        <Pill tone={selectedPrompt.editable ? 'sky' : 'rose'}>{selectedPrompt.editable ? 'editable_in_supabase' : 'config_locked'}</Pill>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Edit Boundary</div>
                        <div className="mt-2 text-sm leading-7 text-slate-700">
                          {selectedPrompt.editable
                            ? 'This prompt is currently backed by Supabase and can be edited from this surface.'
                            : 'This prompt is currently sourced from local config fallback. It is visible here for governance, but not editable from the UI.'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Model Config</div>
                        <pre className="mt-2 overflow-auto rounded-2xl bg-white p-3 text-xs text-slate-600">{JSON.stringify(selectedPrompt.model_config, null, 2)}</pre>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={editSystemPrompt}
                        onChange={(event) => setEditSystemPrompt(event.target.value)}
                        className="mt-2 min-h-[220px] font-mono text-xs leading-6"
                        disabled={!selectedPrompt.editable}
                      />
                    </div>

                    <div>
                      <Label htmlFor="user-prompt">User Prompt Template</Label>
                      <Textarea
                        id="user-prompt"
                        value={editUserPrompt}
                        onChange={(event) => setEditUserPrompt(event.target.value)}
                        className="mt-2 min-h-[160px] font-mono text-xs leading-6"
                        disabled={!selectedPrompt.editable}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={!selectedPrompt.editable || saving}>
                        {saving ? 'Saving...' : 'Save Prompt'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => refreshSelection(selectedPrompt)}
                        disabled={saving}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Prompt Policy</CardTitle>
                  <CardDescription>Customer-bound source policy and execution-prompt requirement summary.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot.policy.map((item) => (
                    <div key={item.customer_id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{item.customer_id}</div>
                        <Pill tone={item.allow_local_stub_intent ? 'amber' : 'rose'}>
                          {item.allow_local_stub_intent ? 'local_stub_allowed' : 'local_stub_blocked'}
                        </Pill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.allowed_intent_sources.map((source) => <Pill key={`${item.customer_id}-intent-${source}`}>{`intent:${source}`}</Pill>)}
                        {item.allowed_execution_sources.map((source) => <Pill key={`${item.customer_id}-exec-${source}`}>{`exec:${source}`}</Pill>)}
                      </div>
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                        required execution capabilities: {item.execution_prompt_required_capabilities.join(', ') || 'none'}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/80 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Runtime Signals</CardTitle>
                  <CardDescription>Recent prompt usage and policy outcomes from interaction logs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label="Recent Logs" value={String(snapshot.runtime.recent_logs)} />
                    <Metric label="Policy Allow" value={String(snapshot.runtime.policy_allow)} tone="emerald" />
                    <Metric label="Policy Review" value={String(snapshot.runtime.policy_review)} tone="amber" />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Primary Prompt Mix</div>
                      <div className="mt-3 space-y-2">
                        {snapshot.runtime.primary_prompt_mix.length > 0 ? snapshot.runtime.primary_prompt_mix.map((item) => (
                          <div key={item.slug} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <span>{item.slug}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        )) : <div className="text-sm text-slate-500">No recent runtime prompt usage.</div>}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Policy Reason Mix</div>
                      <div className="mt-3 space-y-2">
                        {snapshot.runtime.policy_reason_mix.length > 0 ? snapshot.runtime.policy_reason_mix.map((item) => (
                          <div key={item.reason} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <span>{item.reason}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        )) : <div className="text-sm text-slate-500">No recent prompt-policy escalations.</div>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  )
}
