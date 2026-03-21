'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { READ_ONLY_DEMO, getDemoSnapshotById } from '@/lib/demo-data'
import { AppNav } from '@/components/app-nav'
import { humanizeOutcomeError } from '@/lib/ui/error-messages'

const OUTCOME_STATE_KEY = 'maxshot_outcome_console_state_v1'

type Snapshot = {
  execution_id: string
  payload: unknown
  result: unknown
  audit_log: unknown
  created_at: string
  updated_at: string
}

function summarizeSnapshot(snapshot: Snapshot | null): { status: string; finalAnswer: string } {
  if (!snapshot || !snapshot.result || typeof snapshot.result !== 'object') {
    return { status: 'unknown', finalAnswer: '-' }
  }
  const resultObj = snapshot.result as Record<string, unknown>
  const status = resultObj.success === true ? 'success' : resultObj.success === false ? 'failed' : 'unknown'
  const finalAnswer = typeof resultObj.final_answer === 'string' ? resultObj.final_answer : '-'
  return { status, finalAnswer }
}

export default function OutcomeSnapshotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const execIdFromUrl = searchParams.get('exec_id') || ''
  const [execIdInput, setExecIdInput] = useState(execIdFromUrl)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)
  const [counterpartId, setCounterpartId] = useState('')
  const [compareTouched, setCompareTouched] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [delta, setDelta] = useState<{ deltas: Array<{ path: string; before: unknown; after: unknown }>; direction?: string; counterpart_execution_id?: string; truncated?: boolean; limit?: number } | null>(null)
  const [deltaError, setDeltaError] = useState<string | null>(null)
  const snapshotSummary = summarizeSnapshot(snapshot)
  const capabilitySummary = (() => {
    const result = (snapshot?.result && typeof snapshot.result === 'object') ? (snapshot.result as Record<string, unknown>) : null
    const outputs = Array.isArray(result?.capability_outputs) ? (result?.capability_outputs as Array<Record<string, unknown>>) : []
    const total = outputs.length
    const success = outputs.filter((x) => String(x.status || '') === 'success').length
    const failed = outputs.filter((x) => String(x.status || '') === 'failed').length
    return { total, success, failed }
  })()

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OUTCOME_STATE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (!execIdFromUrl && typeof saved.execIdInput === 'string') setExecIdInput(saved.execIdInput)
      if (typeof saved.counterpartId === 'string') setCounterpartId(saved.counterpartId)
    } catch {
      // ignore
    }
  }, [execIdFromUrl])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OUTCOME_STATE_KEY,
        JSON.stringify({
          execIdInput,
          counterpartId,
        })
      )
    } catch {
      // ignore
    }
  }, [execIdInput, counterpartId])

  const fetchDelta = useCallback(async (id: string, counterpart?: string) => {
    if (READ_ONLY_DEMO) {
      setDelta(null)
      setDeltaError(null)
      return
    }
    try {
      setCompareLoading(true)
      setDeltaError(null)
      const suffix = counterpart?.trim() ? `&counterpart_execution_id=${encodeURIComponent(counterpart.trim())}` : ''
      const res = await fetch(`/api/outcome-delta?execution_id=${encodeURIComponent(id.trim())}${suffix}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to load outcome delta')
      setDelta({
        deltas: data.deltas ?? [],
        direction: data.direction,
        counterpart_execution_id: data.counterpart_execution_id,
        truncated: data.truncated,
        limit: data.limit,
      })
    } catch (e) {
      setDelta(null)
      setDeltaError(humanizeOutcomeError(e instanceof Error ? e.message : 'Failed to load outcome delta'))
    } finally {
      setCompareLoading(false)
    }
  }, [])

  const fetchSnapshot = useCallback(async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (READ_ONLY_DEMO) {
        const demoSnapshot = getDemoSnapshotById(id.trim())
        if (!demoSnapshot) throw new Error('Demo snapshot not found')
        setSnapshot(demoSnapshot)
        await fetchDelta(id)
        return
      }
      const res = await fetch('/api/execution/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: id.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to load snapshot')
      }
      setSnapshot(data.execution || null)
      await fetchDelta(id)
    } catch (e) {
      setError(humanizeOutcomeError(e instanceof Error ? e.message : 'Failed to load snapshot'))
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [fetchDelta])

  useEffect(() => {
    if (execIdFromUrl) {
      fetchSnapshot(execIdFromUrl)
    }
  }, [execIdFromUrl, fetchSnapshot])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (execIdInput.trim()) {
      router.push(`/outcome?exec_id=${encodeURIComponent(execIdInput.trim())}`)
      if (counterpartId.trim()) {
        setCompareTouched(true)
      }
      await fetchDelta(execIdInput, counterpartId)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Execution Outcome Snapshot</h1>
            <AppNav current="outcome" />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="w-full">
            {compareTouched && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Compare Result</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  {compareLoading && <div className="text-gray-500">Loading compare...</div>}
                  {deltaError && <div className="text-red-600">{deltaError}</div>}
                  {!compareLoading && !deltaError && delta && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                      <span>delta_count: {delta.deltas?.length ?? 0}</span>
                      <span>direction: {delta.direction ?? 'none'}</span>
                      <span>counterpart: {delta.counterpart_execution_id ?? '—'}</span>
                      {delta.truncated && <span>truncated @ {delta.limit}</span>}
                    </div>
                  )}
                  {!compareLoading && !deltaError && !delta && (
                    <div className="text-gray-500">No delta loaded yet.</div>
                  )}
                  {!compareLoading && !deltaError && delta && delta.deltas?.length === 0 && (
                    <div className="text-gray-500">No delta available.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 max-w-md">
              <Label htmlFor="counterpart_id">counterpart_execution_id (optional)</Label>
              <Input
                id="counterpart_id"
                value={counterpartId}
                onChange={(e) => setCounterpartId(e.target.value)}
                placeholder="execution_id to compare"
                className="font-mono text-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCompareTouched(true)
                if (!execIdInput.trim()) {
                  setDeltaError('missing_execution_id')
                  return
                }
                fetchDelta(execIdInput, counterpartId)
              }}
            >
              {compareLoading ? 'Comparing...' : 'Compare With'}
            </Button>
            <div className="flex-1 max-w-md">
              <Label htmlFor="exec_id">execution_id</Label>
              <Input
                id="exec_id"
                value={execIdInput}
                onChange={(e) => setExecIdInput(e.target.value)}
                placeholder="execution_id"
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit">Load</Button>
          </form>

          {loading && <div className="text-center py-8 text-gray-500">Loading...</div>}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && snapshot && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Outcome Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">execution_status</div>
                    <div className="font-semibold">{snapshotSummary.status}</div>
                  </div>
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">delta_count</div>
                    <div className="font-semibold">{delta?.deltas?.length ?? 0}</div>
                  </div>
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500">counterpart</div>
                    <div className="font-mono break-all">{delta?.counterpart_execution_id ?? '-'}</div>
                  </div>
                </CardContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm pt-0">
                  <div className="border rounded p-3 bg-slate-50">
                    <div className="text-xs text-gray-500">capabilities_total</div>
                    <div className="font-semibold">{capabilitySummary.total}</div>
                  </div>
                  <div className="border rounded p-3 bg-emerald-50">
                    <div className="text-xs text-gray-500">capabilities_success</div>
                    <div className="font-semibold">{capabilitySummary.success}</div>
                  </div>
                  <div className="border rounded p-3 bg-rose-50">
                    <div className="text-xs text-gray-500">capabilities_failed</div>
                    <div className="font-semibold">{capabilitySummary.failed}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Snapshot Header</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-[180px_1fr] gap-2 text-sm">
                  <span className="text-gray-500">execution_id</span>
                  <span className="font-mono break-all">{snapshot.execution_id}</span>
                  <span className="text-gray-500">created_at</span>
                  <span>{formatDateTime(snapshot.created_at)}</span>
                  <span className="text-gray-500">updated_at</span>
                  <span>{formatDateTime(snapshot.updated_at)}</span>
                </CardContent>
                <CardContent className="pt-0 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(snapshot.execution_id)
                      } catch {
                        // ignore clipboard failures
                      }
                    }}
                  >
                    Copy execution_id
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/audit?exec_id=${encodeURIComponent(snapshot.execution_id)}`)}>
                    Open Audit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/operations')}>
                    Open Operations
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payload</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                    {JSON.stringify(snapshot.payload ?? null, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                    {JSON.stringify(snapshot.result ?? null, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {deltaError && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-700 text-sm">{deltaError}</p>
                  </CardContent>
                </Card>
              )}

              {delta && (
                <Card>
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
                      {delta.truncated && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                          truncated @ {delta.limit}
                        </span>
                      )}
                    </div>
                    {delta.deltas?.length ? (
                      <div className="space-y-2">
                        {delta.deltas.map((d, idx) => (
                          <div key={idx} className="border rounded p-2 bg-gray-50">
                            <div className="font-mono text-[11px] text-gray-700">{d.path}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                              <div>
                                <div className="text-gray-500">before</div>
                                <pre className="font-mono break-all whitespace-pre-wrap">{JSON.stringify(d.before ?? null)}</pre>
                              </div>
                              <div>
                                <div className="text-gray-500">after</div>
                                <pre className="font-mono break-all whitespace-pre-wrap">{JSON.stringify(d.after ?? null)}</pre>
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

              <Card>
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                    {JSON.stringify(snapshot.audit_log ?? null, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => router.push(`/insight-review?exec_id=${encodeURIComponent(snapshot.execution_id)}`)}>
                  Open Insight Review (Read-Only)
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
