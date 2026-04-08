'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { READ_ONLY_DEMO, getDemoExecutionById, getDemoAuditSteps } from '@/lib/demo-data'
import { AppNav } from '@/components/app-nav'

interface ExecutionRow {
  execution_id: string
  task_id: string
  entry_type: string
  requester_id: string
  intent_name: string
  reason_for_pending: string | null
  status: string
  confirmation_request?: unknown
  confirmation_result?: unknown
  idempotency_key?: string | null
  result?: unknown
  created_at: string
  updated_at: string
}

interface AuditEvent {
  timestamp?: string
  event_type?: string
  data?: Record<string, unknown>
}

function summarizeEvent(step: AuditEvent): string {
  const type = step.event_type || 'unknown'
  const data = step.data || {}
  if (type === 'write_blocked') return `Write blocked: ${String(data.reason || 'unknown_reason')}`
  if (type === 'execution_confirmed') return `Confirmed by ${String(data.actor_id || 'unknown')}`
  if (type === 'execution_rejected') return `Rejected by ${String(data.actor_id || 'unknown')}`
  if (type === 'execution_replay_requested') return `Replay requested by ${String(data.actor_id || 'unknown')}`
  if (type === 'execution_expired') return `Execution expired (${String(data.status || 'unknown')})`
  if (type === 'sql_template_executed') {
    return `SQL ${String(data.template_id || '-')} executed, rows=${String(data.row_count ?? 0)}`
  }
  return type
}

function humanizeFailureReason(code: string): string {
  if (code.includes('write_blocked_invalid_token')) return '写入拦截：confirm_token 无效'
  if (code.includes('missing_topic')) return '内容生成失败：缺少主题'
  if (code.includes('missing_slot')) return '查询失败：缺少参数'
  if (code.includes('sql_template_explain')) return 'SQL 预检失败'
  return code
}

function AuditContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const execIdFromUrl = searchParams?.get('exec_id')
  const [execIdInput, setExecIdInput] = useState(execIdFromUrl ?? '')
  const [execution, setExecution] = useState<ExecutionRow | null>(null)
  const [auditSteps, setAuditSteps] = useState<AuditEvent[]>([])
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [eventSearch, setEventSearch] = useState('')
  const sortedAuditSteps = useMemo(() => {
    return [...auditSteps].sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0
      return ta - tb
    })
  }, [auditSteps])

  const filteredAuditSteps = useMemo(() => {
    return sortedAuditSteps.filter((step) => {
      if (eventTypeFilter !== 'all' && step.event_type !== eventTypeFilter) return false
      if (eventSearch.trim()) {
        const hay = `${step.event_type || ''} ${JSON.stringify(step.data || {})}`.toLowerCase()
        if (!hay.includes(eventSearch.trim().toLowerCase())) return false
      }
      return true
    })
  }, [sortedAuditSteps, eventTypeFilter, eventSearch])
  const [lineage, setLineage] = useState<{ nodes: unknown[]; edges: unknown[] } | null>(null)
  const [causality, setCausality] = useState<AuditEvent[]>([])
  const [delta, setDelta] = useState<{ deltas: unknown[]; direction?: string; counterpart_execution_id?: string } | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<{
    total: number
    status_counts: Record<string, number>
    event_counts: Record<string, number>
    failed_reason_counts: Record<string, number>
    business_counts: {
      total: number
      question_type_counts: Record<string, number>
      error_code_counts: Record<string, number>
    }
  } | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState<'200' | '500'>('200')
  const [sinceDays, setSinceDays] = useState<'7' | '30' | '90'>('7')

  const fetchMetrics = useCallback(async () => {
    try {
      const metricsRes = await fetch(`/api/audit/metrics?limit=${timeWindow}&days=${sinceDays}`)
      const metricsData = await metricsRes.json()
      if (metricsRes.ok && metricsData?.success) {
        setMetrics({
          total: metricsData.total ?? 0,
          status_counts: metricsData.status_counts ?? {},
          event_counts: metricsData.event_counts ?? {},
          failed_reason_counts: metricsData.failed_reason_counts ?? {},
          business_counts: {
            total: metricsData.business_counts?.total ?? 0,
            question_type_counts: metricsData.business_counts?.question_type_counts ?? {},
            error_code_counts: metricsData.business_counts?.error_code_counts ?? {},
          },
        })
        setMetricsError(null)
      } else if (!metricsRes.ok) {
        setMetricsError(metricsData?.error || 'metrics_failed')
      }
    } catch (e) {
      setMetricsError(e instanceof Error ? e.message : 'metrics_failed')
    }
  }, [timeWindow, sinceDays])

  const fetchExecution = useCallback(async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (READ_ONLY_DEMO) {
        const demoExec = getDemoExecutionById(id.trim())
        if (!demoExec) {
          setExecution(null)
          setAuditSteps([])
          setLineage(null)
          setCausality([])
          setDelta(null)
          setError('Demo execution not found')
          return
        }
        const steps = getDemoAuditSteps(id.trim())
        setExecution({
          execution_id: demoExec.execution_id,
          task_id: demoExec.task_id,
          entry_type: demoExec.entry_type,
          requester_id: demoExec.requester_id,
          intent_name: demoExec.intent_name,
          reason_for_pending: demoExec.reason_for_pending ?? null,
          status: demoExec.status,
          confirmation_request: demoExec.confirmation_request ?? null,
          confirmation_result: demoExec.confirmation_result ?? null,
          idempotency_key: demoExec.idempotency_key ?? null,
          result: demoExec.result ?? null,
          created_at: demoExec.created_at,
          updated_at: demoExec.updated_at,
        })
        setAuditSteps(steps)
        setLineage({ nodes: [], edges: [] })
        setCausality(steps)
        setDelta(null)
        return
      }
      const res = await fetch(`/api/execution/${encodeURIComponent(id.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.details || 'Failed to load execution')
        setExecution(null)
        setAuditSteps([])
        return
      }
      setExecution(data.execution)
      setAuditSteps(data.audit_steps ?? [])

      const [lineageRes, causalityRes, deltaRes] = await Promise.all([
        fetch(`/api/lineage?execution_id=${encodeURIComponent(id.trim())}`),
        fetch(`/api/causality?execution_id=${encodeURIComponent(id.trim())}`),
        fetch(`/api/outcome-delta?execution_id=${encodeURIComponent(id.trim())}`),
      ])

      const lineageData = await lineageRes.json()
      const causalityData = await causalityRes.json()
      const deltaData = await deltaRes.json()

      if (lineageRes.ok) setLineage({ nodes: lineageData.nodes ?? [], edges: lineageData.edges ?? [] })
      if (causalityRes.ok) setCausality(causalityData.timeline ?? [])
      if (deltaRes.ok) setDelta({
        deltas: deltaData.deltas ?? [],
        direction: deltaData.direction,
        counterpart_execution_id: deltaData.counterpart_execution_id,
      })
      await fetchMetrics()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setExecution(null)
      setAuditSteps([])
      setLineage(null)
      setCausality([])
      setDelta(null)
    } finally {
      setLoading(false)
    }
  }, [fetchMetrics])

  useEffect(() => {
    if (execIdFromUrl) {
      setExecIdInput(execIdFromUrl)
      fetchExecution(execIdFromUrl)
    }
  }, [execIdFromUrl, fetchExecution])

  useEffect(() => {
    if (!execution || READ_ONLY_DEMO) return
    fetchMetrics()
  }, [execution, fetchMetrics])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (execIdInput.trim()) {
      router.push(`/audit?exec_id=${encodeURIComponent(execIdInput.trim())}`)
    }
  }

  const lineageNodes = useMemo(() => {
    if (!lineage) return []
    return (lineage.nodes || []) as Array<Record<string, unknown>>
  }, [lineage])

  const lineageEdges = useMemo(() => {
    if (!lineage) return []
    return (lineage.edges || []) as Array<Record<string, unknown>>
  }, [lineage])

  const statusBadge = (status?: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium'
    switch (status) {
      case 'completed':
        return `${base} bg-green-100 text-green-800`
      case 'failed':
      case 'rejected':
        return `${base} bg-red-100 text-red-800`
      case 'in_progress':
        return `${base} bg-blue-100 text-blue-800`
      case 'pending_confirmation':
        return `${base} bg-amber-100 text-amber-800`
      case 'confirmed':
        return `${base} bg-indigo-100 text-indigo-800`
      case 'expired':
        return `${base} bg-gray-200 text-gray-700`
      default:
        return `${base} bg-gray-100 text-gray-700`
    }
  }

  const entryTrace = useMemo(() => {
    const entryEvent = auditSteps.find((e) => e.event_type === 'entry_created')
    const data = entryEvent?.data || {}
    return {
      entry_id: execution?.task_id ?? (data as any)?.entry_id ?? '—',
      entry_type: (execution as any)?.entry_type ?? (data as any)?.entry_type ?? '—',
      entry_channel: (data as any)?.entry_channel ?? '—',
      correlation_id: (data as any)?.correlation_id ?? '—',
      idempotency_key: execution?.idempotency_key ?? (data as any)?.idempotency_key ?? '—',
    }
  }, [auditSteps, execution])

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const step of sortedAuditSteps) {
      const key = step.event_type || 'unknown'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [sortedAuditSteps])

  const routerPath = useMemo(() => {
    return auditSteps
      .filter((e) => e.event_type === 'capability_executed')
      .map((e) => ({
        capability_id: (e.data as any)?.capability_id,
        used_skills: Array.isArray((e.data as any)?.used_skills) ? (e.data as any).used_skills : [],
      }))
      .filter((item) => Boolean(item.capability_id))
  }, [auditSteps])

  return (
    <AuthGuard requiredSurface="audit">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">MAXshot Admin OS</h1>
            <AppNav current="audit" />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-6">Execution Audit (Minimal)</h2>

          <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-end">
            <div className="flex-1 max-w-md">
              <Label htmlFor="exec_id">execution_id</Label>
              <Input
                id="exec_id"
                value={execIdInput}
                onChange={(e) => setExecIdInput(e.target.value)}
                placeholder="e.g. uuid from task/create response"
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit">Load</Button>
          </form>

          {loading && <div className="text-center py-8 text-gray-500">Loading...</div>}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && execution && (
            <>
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle>Entry Fact (Immutable)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-[160px_1fr] gap-2 text-sm">
                  <span className="text-gray-500">entry_id</span>
                  <span className="font-mono break-all">{entryTrace.entry_id}</span>
                  <span className="text-gray-500">type</span>
                  <span>{entryTrace.entry_type}</span>
                  <span className="text-gray-500">channel</span>
                  <span>{entryTrace.entry_channel}</span>
                  <span className="text-gray-500">idempotency_key</span>
                  <span className="font-mono break-all">{entryTrace.idempotency_key}</span>
                </CardContent>
              </Card>

              {/* 执行摘要 — FSD 02.3、09 审计责任 */}

              {metrics && (
                <>
                  <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Audit KPI (Recent {timeWindow})</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Button variant={timeWindow === '200' ? 'default' : 'outline'} size="sm" onClick={() => setTimeWindow('200')}>Last 200</Button>
                        <Button variant={timeWindow === '500' ? 'default' : 'outline'} size="sm" onClick={() => setTimeWindow('500')}>Last 500</Button>
                        <Button variant={sinceDays === '7' ? 'default' : 'outline'} size="sm" onClick={() => setSinceDays('7')}>7d</Button>
                        <Button variant={sinceDays === '30' ? 'default' : 'outline'} size="sm" onClick={() => setSinceDays('30')}>30d</Button>
                        <Button variant={sinceDays === '90' ? 'default' : 'outline'} size="sm" onClick={() => setSinceDays('90')}>90d</Button>
                        <Button variant="outline" size="sm" onClick={fetchMetrics}>Refresh</Button>
                      </div>
                    </CardContent>
                    <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 text-xs">Total Executions</div>
                        <div className="text-lg font-semibold">{metrics.total}</div>
                      </div>
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 text-xs">Completed</div>
                        <div className="text-lg font-semibold">{metrics.status_counts?.completed || 0}</div>
                      </div>
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 text-xs">Failed</div>
                        <div className="text-lg font-semibold">{metrics.status_counts?.failed || 0}</div>
                      </div>
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 text-xs">Write Blocked</div>
                        <div className="text-lg font-semibold">{metrics.event_counts?.write_blocked || 0}</div>
                      </div>
                      <div className="border rounded p-3 bg-blue-50">
                        <div className="text-gray-500 text-xs">Business Queries</div>
                        <div className="text-lg font-semibold">{metrics.business_counts?.total || 0}</div>
                      </div>
                      <div className="border rounded p-3 bg-orange-50">
                        <div className="text-gray-500 text-xs">Business Rejected</div>
                        <div className="text-lg font-semibold">
                          {Object.values(metrics.business_counts?.error_code_counts || {}).reduce((acc, n) => acc + n, 0)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Audit Metrics (Recent {timeWindow})</CardTitle>
                    </CardHeader>
                    {metrics.status_counts?.failed > metrics.status_counts?.completed && (
                      <CardContent className="pt-0">
                        <div className="text-red-600 text-xs">Anomaly: failed &gt; completed</div>
                      </CardContent>
                    )}
                    <CardContent className="space-y-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">total: {metrics.total}</span>
                        {Object.entries(metrics.status_counts).map(([key, count]) => (
                          <span key={key} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">status.{key}: {count}</span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(metrics.event_counts).slice(0, 12).map(([key, count]) => (
                          <span key={key} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{key}: {count}</span>
                        ))}
                      </div>
                      {Object.keys(metrics.failed_reason_counts || {}).length > 0 && (
                        <div>
                          <div className="text-[11px] text-gray-500 mb-1">Failure Reasons</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(metrics.failed_reason_counts).slice(0, 8).map(([key, count]) => (
                              <span key={key} className="px-2 py-0.5 rounded bg-red-50 text-red-700">{humanizeFailureReason(key)}: {count}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(metrics.business_counts?.question_type_counts || {}).length > 0 && (
                        <div>
                          <div className="text-[11px] text-gray-500 mb-1">Business Query Types</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(metrics.business_counts.question_type_counts).map(([key, count]) => (
                              <span key={key} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">{key}: {count}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(metrics.business_counts?.error_code_counts || {}).length > 0 && (
                        <div>
                          <div className="text-[11px] text-gray-500 mb-1">Business Rejection Reasons</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(metrics.business_counts.error_code_counts).map(([key, count]) => (
                              <span key={key} className="px-2 py-0.5 rounded bg-orange-50 text-orange-700">{key}: {count}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {metricsError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-700">Metrics error: {metricsError}</p>
                  </CardContent>
                </Card>
              )}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Execution Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-gray-500">execution_id</span>
                    <span className="font-mono break-all">{execution.execution_id}</span>
                    <span className="text-gray-500">status</span>
                    <span className={statusBadge(execution.status)}>{execution.status}</span>
                    <span className="text-gray-500">started_at</span>
                    <span>{formatDateTime(execution.created_at)}</span>
                    <span className="text-gray-500">intent</span>
                    <span>{execution.intent_name}</span>
                    <span className="text-gray-500">task_id</span>
                    <span className="font-mono">{execution.task_id}</span>
                    <span className="text-gray-500">entry_type</span>
                    <span>{execution.entry_type}</span>
                    <span className="text-gray-500">requester_id</span>
                    <span>{execution.requester_id}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Execution Result</CardTitle>
                    <Button variant="outline" onClick={() => setShowRaw((v) => !v)}>
                      {showRaw ? 'Hide Raw' : 'Show Raw'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-[180px_1fr] gap-2">
                    <span className="text-gray-500">confirmation_request</span>
                    <span className="font-mono break-all">{JSON.stringify(execution.confirmation_request ?? null)}</span>
                    <span className="text-gray-500">confirmation_result</span>
                    <span className="font-mono break-all">{JSON.stringify(execution.confirmation_result ?? null)}</span>
                    <span className="text-gray-500">result</span>
                    <span className="font-mono break-all">{JSON.stringify(execution.result ?? null)}</span>
                  </div>
                  {showRaw && (
                    <pre className="mt-4 text-xs bg-gray-100 rounded p-3 overflow-auto">
                      {JSON.stringify({ execution, audit_steps: auditSteps, lineage, causality, delta }, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Execution Trace</CardTitle>
                    <Button variant="outline" onClick={() => router.push(`/outcome?exec_id=${encodeURIComponent(execution.execution_id)}`)}>
                      Open Outcome Snapshot
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-[180px_1fr] gap-2 text-sm">
                  <span className="text-gray-500">entry_type</span>
                  <span>{entryTrace.entry_type}</span>
                  <span className="text-gray-500">entry_channel</span>
                  <span>{entryTrace.entry_channel}</span>
                  <span className="text-gray-500">correlation_id</span>
                  <span className="font-mono break-all">{entryTrace.correlation_id}</span>
                  <span className="text-gray-500">idempotency_key</span>
                  <span className="font-mono break-all">{entryTrace.idempotency_key}</span>
                </CardContent>
              </Card>

              {routerPath.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Router Path (Capability Order)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal list-inside space-y-2 text-sm font-mono">
                      {routerPath.map((step, i) => (
                        <li key={`${step.capability_id}-${i}`}>
                          <div>{step.capability_id}</div>
                          <div className="text-xs text-gray-500">
                            used_skills: {step.used_skills.length > 0 ? JSON.stringify(step.used_skills) : '—'}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {sortedAuditSteps.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Audit Events</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(eventCounts).map(([key, count]) => (
                        <span key={key} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{key}: {count}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant={eventTypeFilter === 'all' ? 'default' : 'outline'} onClick={() => setEventTypeFilter('all')}>all</Button>
                      <Button size="sm" variant={eventTypeFilter === 'write_blocked' ? 'default' : 'outline'} onClick={() => setEventTypeFilter('write_blocked')}>write_blocked</Button>
                      <Button size="sm" variant={eventTypeFilter === 'execution_confirmed' ? 'default' : 'outline'} onClick={() => setEventTypeFilter('execution_confirmed')}>execution_confirmed</Button>
                      <Button size="sm" variant={eventTypeFilter === 'sql_template_executed' ? 'default' : 'outline'} onClick={() => setEventTypeFilter('sql_template_executed')}>sql_template_executed</Button>
                      <Input
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="search event payload"
                        className="max-w-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => setEventSearch('')}>clear search</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>event_type filter</Label>
                        <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v || 'all')}>
                          <SelectTrigger>
                            <SelectValue placeholder="event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">all</SelectItem>
                            {Object.keys(eventCounts).map((key) => (
                              <SelectItem key={key} value={key}>{key}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>search</Label>
                        <Input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="search in event_type/data" />
                      </div>
                    </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setEventTypeFilter('failed')}>Filter: failed</Button>
                    <Button variant="outline" size="sm" onClick={() => setEventTypeFilter('execution_rejected')}>Filter: rejected</Button>
                    <Button variant="outline" size="sm" onClick={() => setEventTypeFilter('write_blocked')}>Filter: write_blocked</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const blob = new Blob([JSON.stringify(filteredAuditSteps, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `audit_${execIdInput || 'all'}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>Export JSON</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const header = ['timestamp','event_type','execution_id','status','reason']
                      const rows = filteredAuditSteps.map((step) => [
                        step.timestamp || '',
                        step.event_type || '',
                        (step.data as any)?.execution_id || '',
                        (step.data as any)?.status || '',
                        (step.data as any)?.reason || '',
                      ])
                      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'\"')}"`).join(',')).join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `audit_${execIdInput || 'all'}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>Export CSV</Button>
                  </div>
                    {filteredAuditSteps.map((step, i) => (
                      <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                            {step.event_type ?? '—'}
                          </span>
                          <span className="text-xs text-gray-500">{step.timestamp ?? '—'}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{summarizeEvent(step)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button variant="outline" size="sm" onClick={() => setShowRaw((v) => !v)}>Toggle JSON</Button>
                          <span className="text-xs text-gray-500">event data</span>
                        </div>
                        {showRaw && (
                          <div className="text-xs font-mono break-all mt-1">
                            {JSON.stringify(step.data ?? {})}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {lineage && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Lineage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Nodes</div>
                      <div className="space-y-2">
                        {lineageNodes.map((node, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-medium">
                              {String(node.type ?? 'node')}
                            </span>
                            <span className="font-mono text-xs break-all">{String(node.id ?? '—')}</span>
                            {Boolean(node.status) && <span className={statusBadge(String(node.status))}>{String(node.status)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Edges</div>
                      <div className="space-y-2 text-xs font-mono">
                        {lineageEdges.map((edge, idx) => (
                          <div key={idx}>
                            {String(edge.type ?? 'edge')}: {String(edge.from ?? '—')} → {String(edge.to ?? '—')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {causality.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Causality Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {causality.map((event, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-400 mt-1" />
                          {idx < causality.length - 1 && <div className="w-px flex-1 bg-gray-300" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                              {event.event_type ?? '—'}
                            </span>
                            <span className="text-gray-500">{event.timestamp ?? '—'}</span>
                          </div>
                          <div className="font-mono break-all mt-1">{JSON.stringify(event.data ?? {})}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {delta && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Outcome Delta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex flex-wrap gap-3">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        direction: {delta.direction ?? 'none'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        counterpart: {delta.counterpart_execution_id ?? '—'}
                      </span>
                    </div>
                    {delta.deltas?.length ? (
                      <div className="space-y-2">
                        {delta.deltas.map((item: any, idx: number) => (
                          <div key={idx} className="border rounded p-2 bg-gray-50">
                            <div className="font-mono text-[11px] text-gray-700">{item.path ?? '—'}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                              <div>
                                <div className="text-gray-500">before</div>
                                <pre className="font-mono break-all whitespace-pre-wrap">{JSON.stringify(item.before ?? null)}</pre>
                              </div>
                              <div>
                                <div className="text-gray-500">after</div>
                                <pre className="font-mono break-all whitespace-pre-wrap">{JSON.stringify(item.after ?? null)}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500">No delta available.</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {filteredAuditSteps.length === 0 && (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-amber-800">
                      No audit events for this execution. Audit log may not exist yet or Router/Capability has not written records.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!loading && !execution && !error && execIdFromUrl && (
            <p className="text-gray-500">No execution found for this ID.</p>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuditContent />
    </Suspense>
  )
}
