'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { READ_ONLY_DEMO, getDemoExecutionById, getDemoAuditSteps } from '@/lib/demo-data'

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

function AuditContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const execIdFromUrl = searchParams.get('exec_id')
  const [execIdInput, setExecIdInput] = useState(execIdFromUrl ?? '')
  const [execution, setExecution] = useState<ExecutionRow | null>(null)
  const [auditSteps, setAuditSteps] = useState<AuditEvent[]>([])
  const [lineage, setLineage] = useState<{ nodes: unknown[]; edges: unknown[] } | null>(null)
  const [causality, setCausality] = useState<AuditEvent[]>([])
  const [delta, setDelta] = useState<{ deltas: unknown[]; direction?: string; counterpart_execution_id?: string } | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (execIdFromUrl) {
      setExecIdInput(execIdFromUrl)
      fetchExecution(execIdFromUrl)
    }
  }, [execIdFromUrl])

  const fetchExecution = async (id: string) => {
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
  }

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
      idempotency_key: execution?.idempotency_key ?? (data as any)?.idempotency_key ?? '—',
    }
  }, [auditSteps, execution])

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
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">MAXshot Admin OS</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/ops')}>Ops</Button>
              <Button variant="outline" onClick={() => router.push('/marketing')}>Marketing</Button>
              <Button variant="outline" onClick={() => router.push('/confirmations')}>Confirmations</Button>
              <Button variant="outline" onClick={() => router.push('/outcome')}>Outcome Snapshot</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
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

              {auditSteps.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Audit Events</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {auditSteps.map((step, i) => (
                      <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                            {step.event_type ?? '—'}
                          </span>
                          <span className="text-xs text-gray-500">{step.timestamp ?? '—'}</span>
                        </div>
                        <div className="text-xs font-mono break-all mt-1">
                          {JSON.stringify(step.data ?? {})}
                        </div>
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
                            {node.status && <span className={statusBadge(String(node.status))}>{String(node.status)}</span>}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 mb-2">Before</div>
                        <pre className="font-mono break-all whitespace-pre-wrap">
                          {JSON.stringify(delta.deltas ?? [], null, 2)}
                        </pre>
                      </div>
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="text-gray-500 mb-2">After</div>
                        <pre className="font-mono break-all whitespace-pre-wrap">
                          {JSON.stringify(delta.deltas ?? [], null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {auditSteps.length === 0 && (
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
