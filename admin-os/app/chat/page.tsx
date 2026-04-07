'use client'

import Link from 'next/link'
import { CustomerPolicyEvidenceCard } from '@/components/customers/customer-policy-evidence-card'
import type { CustomerDefaultExperience, CustomerPolicyEvidence, CustomerRuntimePolicyMeta } from '@/lib/customers/runtime-policy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { getStoredSession } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AppNav } from '@/components/app-nav'

type ChatData = {
  type: 'ops' | 'marketing' | 'qna'
  summary: string
  rows?: Array<Record<string, unknown>>
  draft?: string | null
  error?: string | null
  meta?: Record<string, unknown>
}

type Highlight = { label: string; value: string }
type ChatMeta = {
  highlights?: Highlight[]
  next_actions?: string[]
  data_plane?: string
  scope?: string
  row_count?: number
  rows_preview_count?: number
  evidence?: Array<{ evidence_summary?: string }>
  interpretation?: string | null
  reason_breakdown_zh?: {
    main_reason?: string
    secondary_reasons?: string[]
    evidence_count?: number
  }
  quality_alert?: {
    level?: string
    title?: string
    message?: string
    examples?: string[]
  } | null
  delivery_posture?: {
    customer_id?: string
    summary_style?: string
    next_action_style?: string
    review_copy_style?: string
    citation_density?: string
  } | null
  clarification_posture?: {
    customer_id?: string
    clarification_style?: string
    option_style?: string
  } | null
  answer_meta?: {
    capability_id?: string
    citations?: Array<{ source_id?: string; title?: string; snippet?: string; score?: number }>
    confidence?: number | null
    fallback_required?: boolean
    review_required?: boolean
    reason?: string | null
    review_payload?: {
      question?: string
      reason?: string
      priority?: string
      kb_scope?: string | null
      channel?: string | null
      review_id?: string
      queue_source?: string
    } | null
  } | null
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  query?: string
  data?: ChatData | null
  error?: string | null
  loading?: boolean
}

const ROW_PREVIEW_LIMIT = 10
const MAX_CHAT_MESSAGES = 80

const pickBusinessColumns = (rows: Array<Record<string, unknown>>): string[] => {
  const sample = rows[0] || {}
  if ('avg_apy_pct' in sample) {
    const yieldAverageColumns = [
      'chain',
      'protocol',
      'market_name',
      'avg_apy_pct',
      'max_apy_pct',
      'min_apy_pct',
      'sample_count',
      'tvl',
      'created_at',
    ]
    return yieldAverageColumns.filter((key) => key in sample).slice(0, 8)
  }
  const preferred = [
    'vault_name',
    'asset',
    'chain_name',
    'chain',
    'protocol_name',
    'protocol',
    'market',
    'market_name',
    'status',
    'net_apy',
    'base_apy',
    'tvl',
    'updated_at',
    'created_at',
    'execution_id',
  ]
  return preferred.filter((key) => key in sample).slice(0, 6)
}

function MetaBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">{label}</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{children}</div>
}

export default function ChatPage() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [defaultExperience, setDefaultExperience] = useState<CustomerDefaultExperience | null>(null)
  const [customerRuntimePolicy, setCustomerRuntimePolicy] = useState<CustomerRuntimePolicyMeta | null>(null)
  const [customerPolicyEvidence, setCustomerPolicyEvidence] = useState<CustomerPolicyEvidence | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const quickQueries = useMemo(
    () => defaultExperience?.quick_queries?.length
      ? defaultExperience.quick_queries
      : [
          'MAXshot 有哪些 vault 可以用？',
          '当前 vault APY 怎么样？',
          '给我最近一笔 execution 详情',
          '写一条关于新品发布的帖子',
        ],
    [defaultExperience]
  )

  useEffect(() => {
    const key = 'chat_session_id'
    let id = window.localStorage.getItem(key) || ''
    if (!id) {
      id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(key, id)
    }
    setSessionId(id)
  }, [])

  useEffect(() => {
    const current = getStoredSession()
    if (!current?.customer_id) return
    void fetch(`/api/customers/workspace?customer_id=${encodeURIComponent(current.customer_id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success === true) {
          setDefaultExperience(data.default_experience || null)
          setCustomerRuntimePolicy(data.runtime_policy || null)
          setCustomerPolicyEvidence(data.customer_policy_evidence || null)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const applyExample = (value: string) => {
    setQuery(value)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const sendQuery = async (inputRaw: string) => {
    const input = String(inputRaw || '').trim()
    if (!input) return
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      query: input,
    }
    const assistantMessageId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const assistantPending: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      loading: true,
    }

    setMessages((prev) => [...prev, userMessage, assistantPending].slice(-MAX_CHAT_MESSAGES))
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_query: input, session_id: sessionId, requester_id: getStoredSession()?.identity_id || null, customer_id: getStoredSession()?.customer_id || null, entry_channel: 'web_app' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || '请求失败')
      }
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                loading: false,
                data: data.data || null,
                error: null,
              }
            : item
        )
      )
      setQuery('')
    } catch (e) {
      const errText = e instanceof Error ? e.message : '请求失败'
      setError(errText)
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                loading: false,
                error: errText,
              }
            : item
        )
      )
    } finally {
      setLoading(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  const rewrite = async (messageId: string, action: string) => {
    const target = messages.find(
      (item) => item.id === messageId && item.role === 'assistant' && item.data?.type === 'marketing' && item.data?.draft
    )
    if (!target?.data?.draft) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewrite_action: action, draft: target.data.draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || '改写失败')
      setMessages((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                data: data.data || null,
                error: null,
              }
            : item
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '改写失败')
    } finally {
      setLoading(false)
    }
  }

  const conversationStarted = messages.length > 0

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f4f8ff_0%,#f7f7f8_45%,#eef2f7_100%)] text-slate-900">
        <header className="border-b border-white/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Chat MVP</h1>
              <div className="mt-1 text-sm text-slate-500">registry-first chat for business query, product qna, and content generation</div>
            </div>
            <AppNav current="chat" />
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 space-y-4">
            {!conversationStarted && (
              <Card className="overflow-hidden border-slate-200 bg-white/85 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
                <CardContent className="space-y-5 p-6">
                  <div className="space-y-2">
                    <SectionTitle>Start Here</SectionTitle>
                    <div className="text-2xl font-semibold tracking-tight">
                      {defaultExperience?.customer_id ? `${defaultExperience.customer_id} workspace` : '先直接问自然语言问题。'}
                    </div>
                    <div className="max-w-2xl text-sm leading-6 text-slate-600">
                      {defaultExperience?.summary || '当前入口已经支持业务查询、产品问答、营销文案。需要澄清时会继续追问，但输入框始终保留，不会覆盖已有对话。'}
                    </div>
                    {(defaultExperience?.focused_surfaces?.length || defaultExperience?.preferred_capabilities?.length) ? (
                      <div className="flex flex-wrap gap-2">
                        {defaultExperience?.primary_plane ? <MetaBadge label={`primary: ${defaultExperience.primary_plane}`} /> : null}
                        {customerRuntimePolicy?.policy_version ? <MetaBadge label={`policy: ${customerRuntimePolicy.policy_version}`} /> : null}
                        {customerRuntimePolicy?.auth_primary_method ? <MetaBadge label={`auth: ${customerRuntimePolicy.auth_primary_method}`} /> : null}
                        {(defaultExperience?.focused_surfaces || []).map((surface) => <MetaBadge key={`surface-${surface}`} label={`surface: ${surface}`} />)}
                        {(defaultExperience?.preferred_capabilities || []).slice(0, 4).map((capabilityId) => (
                          <MetaBadge key={capabilityId} label={capabilityId.replace('capability.', '')} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quickQueries.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => applyExample(item)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {conversationStarted && (
              <Card className="border-slate-200 bg-white/82 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-base font-semibold">对话记录</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-6">
                  {messages.map((message) => {
                    if (message.role === 'user') {
                      return (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-[24px] rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">你</div>
                            <div className="whitespace-pre-wrap">{message.query}</div>
                          </div>
                        </div>
                      )
                    }

                    if (message.loading) {
                      return (
                        <div key={message.id} className="flex justify-start">
                          <div className="max-w-[88%] rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">助手</div>
                            系统处理中...
                          </div>
                        </div>
                      )
                    }

                    if (message.error) {
                      return (
                        <div key={message.id} className="flex justify-start">
                          <div className="max-w-[88%] rounded-[24px] rounded-bl-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-rose-400">助手</div>
                            {message.error}
                          </div>
                        </div>
                      )
                    }

                    const result = message.data
                    if (!result) return null
                    const meta = (result.meta || {}) as ChatMeta
                    const rows = Array.isArray(result.rows) ? result.rows : []
                    const rowsPreview = rows.slice(0, ROW_PREVIEW_LIMIT)
                    const columns = pickBusinessColumns(rowsPreview)

                    return (
                      <div key={message.id} className="flex justify-start">
                        <div className="max-w-[92%] space-y-4 rounded-[28px] rounded-bl-md border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:px-5">
                          <div className="space-y-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">助手</div>
                            <div className="text-[15px] leading-7 text-slate-900">{result.summary}</div>
                            {meta.interpretation && <div className="text-sm text-slate-600">{meta.interpretation}</div>}
                            <div className="flex flex-wrap gap-2">
                              <MetaBadge label={`类型：${result.type}`} />
                              {meta.data_plane && <MetaBadge label={`data_plane: ${meta.data_plane}`} />}
                              {meta.scope && <MetaBadge label={`scope: ${meta.scope}`} />}
                              {typeof meta.row_count === 'number' && <MetaBadge label={`rows: ${meta.row_count}`} />}
                              {meta.answer_meta?.capability_id && <MetaBadge label={`capability: ${meta.answer_meta.capability_id}`} />}
                              {typeof meta.answer_meta?.confidence === 'number' && (
                                <MetaBadge label={`confidence: ${meta.answer_meta.confidence.toFixed(2)}`} />
                              )}
                              {meta.answer_meta?.fallback_required && <MetaBadge label="fallback" />}
                              {meta.answer_meta?.review_required && <MetaBadge label="review required" />}
                              {meta.delivery_posture?.summary_style && <MetaBadge label={`delivery: ${meta.delivery_posture.summary_style}`} />}
                              {meta.delivery_posture?.next_action_style && <MetaBadge label={`actions: ${meta.delivery_posture.next_action_style}`} />}
                              {meta.clarification_posture?.clarification_style && <MetaBadge label={`clarify: ${meta.clarification_posture.clarification_style}`} />}
                            </div>
                          </div>

                          {Array.isArray(meta.highlights) && meta.highlights.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {meta.highlights.map((item) => (
                                <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <div className="text-xs text-slate-500">{item.label}</div>
                                  <div className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{item.value}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {result.type === 'ops' && rows.length > 0 && columns.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full min-w-[720px] text-sm">
                                  <thead className="bg-slate-50 text-left">
                                    <tr>
                                      {columns.map((col) => (
                                        <th key={col} className="px-4 py-3 font-medium text-slate-600">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rowsPreview.map((row, idx) => (
                                      <tr key={idx} className="border-t border-slate-100">
                                        {columns.map((col) => (
                                          <td key={`${idx}-${col}`} className="whitespace-nowrap px-4 py-3 text-slate-800">
                                            {String(row[col] ?? '—')}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {rows.length > ROW_PREVIEW_LIMIT && (
                                <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                                  仅展示前 {ROW_PREVIEW_LIMIT} 条（总计 {rows.length} 条）
                                </div>
                              )}
                            </div>
                          )}

                          {result.type === 'marketing' && result.draft && (
                            <div className="space-y-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800 whitespace-pre-wrap">
                                {result.draft}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => rewrite(message.id, 'shorter')} disabled={loading}>
                                  缩短
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => rewrite(message.id, 'stronger_cta')} disabled={loading}>
                                  强化 CTA
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => rewrite(message.id, 'casual')} disabled={loading}>
                                  更口语
                                </Button>
                              </div>
                            </div>
                          )}

                          {Array.isArray(meta.next_actions) && meta.next_actions.length > 0 && (
                            <div className="space-y-2">
                              <SectionTitle>继续追问示例</SectionTitle>
                              <div className="text-sm text-slate-600">这些只是示例，你仍然可以直接输入自己的自然语言问题。</div>
                              <div className="flex flex-wrap gap-2">
                                {meta.next_actions.map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => applyExample(item.replace(/^例如：/, '').trim())}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(meta.evidence) && meta.evidence.length > 0 && (
                            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <SectionTitle>证据摘要</SectionTitle>
                              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                                {meta.evidence
                                  .map((item) => item.evidence_summary)
                                  .filter(Boolean)
                                  .slice(0, 3)
                                  .map((item, idx) => (
                                    <li key={`${item}-${idx}`}>{item}</li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(meta.answer_meta?.citations) && meta.answer_meta.citations.length > 0 && (
                            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <SectionTitle>FAQ Citations</SectionTitle>
                              <div className="space-y-3">
                                {meta.answer_meta.citations.slice(0, 3).map((item, idx) => (
                                  <div key={`${item.source_id || item.title || 'citation'}-${idx}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <div className="text-sm font-medium text-slate-800">{item.title || item.source_id || 'Untitled source'}</div>
                                    {item.snippet && <div className="mt-1 text-sm leading-6 text-slate-600">{item.snippet}</div>}
                                  </div>
                                ))}
                              </div>
                              {meta.answer_meta.reason && (
                                <div className="text-xs text-slate-500">reason: {meta.answer_meta.reason}</div>
                              )}
                            </div>
                          )}

                          {meta.answer_meta?.review_payload && (
                            <div className="space-y-3 rounded-2xl border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,247,237,0.92))] p-4">
                              <SectionTitle>Review Payload</SectionTitle>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {meta.answer_meta.review_payload.priority && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">priority</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.priority}</div>
                                  </div>
                                )}
                                {meta.answer_meta.review_payload.reason && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">reason</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.reason}</div>
                                  </div>
                                )}
                                {meta.answer_meta.review_payload.kb_scope && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">kb scope</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.kb_scope}</div>
                                  </div>
                                )}
                                {meta.answer_meta.review_payload.channel && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">channel</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.channel}</div>
                                  </div>
                                )}
                                {meta.answer_meta.review_payload.review_id && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">review id</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.review_id}</div>
                                  </div>
                                )}
                                {meta.answer_meta.review_payload.queue_source && (
                                  <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <div className="text-xs text-slate-500">queue source</div>
                                    <div className="mt-1 font-medium text-slate-900">{meta.answer_meta.review_payload.queue_source}</div>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end">
                                <Link
                                  href="/faq-review"
                                  className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm text-amber-900 transition hover:bg-amber-50"
                                >
                                  打开 Review Queue
                                </Link>
                              </div>
                            </div>
                          )}

                          {meta.quality_alert?.title && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                              <SectionTitle>质量提示</SectionTitle>
                              <div className="mt-2 text-sm font-medium text-amber-900">{meta.quality_alert.title}</div>
                              <div className="mt-1 text-sm text-amber-900">{meta.quality_alert.message}</div>
                              {Array.isArray(meta.quality_alert.examples) && meta.quality_alert.examples.length > 0 && (
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                                  {meta.quality_alert.examples.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {meta.reason_breakdown_zh?.main_reason && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <SectionTitle>原因拆解</SectionTitle>
                              <div className="mt-2 text-sm text-slate-700">主因：{meta.reason_breakdown_zh.main_reason}</div>
                              {Array.isArray(meta.reason_breakdown_zh.secondary_reasons) && meta.reason_breakdown_zh.secondary_reasons.length > 0 && (
                                <div className="mt-1 text-sm text-slate-700">次因：{meta.reason_breakdown_zh.secondary_reasons.join('、')}</div>
                              )}
                              <div className="mt-1 text-xs text-slate-500">叙事证据条数：{Number(meta.reason_breakdown_zh.evidence_count || 0)}</div>
                            </div>
                          )}

                          {rows.length > 0 && (
                            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                              <summary className="cursor-pointer font-medium text-slate-800">查看原始数据</summary>
                              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-6">{JSON.stringify(rows, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </CardContent>
              </Card>
            )}

            <div className="sticky bottom-4 z-10">
              <Card className="border-slate-200 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle>自然语言输入</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="例如：最近 7 天执行状态汇总；或 写一条关于新品发布的帖子"
                    className="min-h-[110px] border-slate-200 bg-slate-50/70 text-[15px] leading-7"
                  />
                  <div className="flex flex-wrap gap-2">
                    {quickQueries.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => applyExample(item)}
                        disabled={loading}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-500">
                      当前会话会保留上下文。澄清时直接继续输入，不需要重新开始。{defaultExperience?.composer_hint ? ` ${defaultExperience.composer_hint}` : ''}
                    </div>
                    <Button onClick={() => void sendQuery(query)} disabled={loading || !query.trim()} className="min-w-28">
                      {loading ? '处理中...' : '发送'}
                    </Button>
                  </div>
                  {error && <div className="text-sm text-rose-600">{error}</div>}
                </CardContent>
              </Card>
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="border-slate-200 bg-white/82 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="text-base">当前会话</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">session_id</div>
                  <div className="mt-1 break-all font-mono text-xs text-slate-700">{sessionId || 'initializing...'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">usage</div>
                  <div className="mt-1">messages: {messages.length}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white/82 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
              <CardHeader>
                <CardTitle className="text-base">Workspace Preset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {defaultExperience ? (
                  <>
                    <CustomerPolicyEvidenceCard evidence={customerPolicyEvidence} title="customer_policy_evidence" />
                    {defaultExperience.recommended_route_order.length > 0 ? <div>1. 推荐路径：{defaultExperience.recommended_route_order.join(' → ')}。</div> : null}
                    {defaultExperience.focused_surfaces.length > 0 ? <div>2. 重点 surface：{defaultExperience.focused_surfaces.join(' / ')}。</div> : null}
                    {(defaultExperience.workspace_notes.length > 0 ? defaultExperience.workspace_notes : []).slice(0, 2).map((note, index) => <div key={`workspace-note-${index}`}>{index + 3}. {note}。</div>)}
                  </>
                ) : (
                  <>
                    <div>1. 先问对象：vault / execution / APY / marketing。</div>
                    <div>2. 需要趋势时，直接带时间范围。</div>
                    <div>3. 如果系统追问，继续自然语言补充即可。</div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </AuthGuard>
  )
}
