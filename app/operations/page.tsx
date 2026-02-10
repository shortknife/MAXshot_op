'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { READ_ONLY_DEMO, WRITE_ENABLED, demoExecutions, getDemoSnapshotById, validateDemoDataset } from '@/lib/demo-data'
import { formatDateTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface ExecutionRow {
  execution_id: string
  task_id: string
  intent_name: string
  requester_id: string
  status: string
  created_at: string
  updated_at: string
}

export default function OperationsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ExecutionRow[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [intentFilter, setIntentFilter] = useState('')
  const [requesterFilter, setRequesterFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [operatorId, setOperatorId] = useState('admin')
  const [confirmToken, setConfirmToken] = useState('')
  const [writeApproved, setWriteApproved] = useState(false)
  const [snapshotA, setSnapshotA] = useState<unknown>(null)
  const [snapshotB, setSnapshotB] = useState<unknown>(null)
  const [demoErrors] = useState<string[]>(READ_ONLY_DEMO ? validateDemoDataset() : [])

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

  const grouped = useMemo(() => {
    const groups: Record<string, ExecutionRow[]> = {}
    for (const row of rows) {
      const key = row.status || 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    }
    return groups
  }, [rows])

  const groupOrder = ['pending_confirmation', 'confirmed', 'in_progress', 'failed', 'completed', 'rejected', 'expired', 'unknown']

  useEffect(() => {
    loadExecutions()
  }, [statusFilter, intentFilter, requesterFilter, dateFilter])

  const loadExecutions = async () => {
    try {
      setLoading(true)
      setError(null)
      if (READ_ONLY_DEMO) {
        const data = demoExecutions
          .filter((row) => (statusFilter === 'all' ? true : row.status === statusFilter))
          .filter((row) => (intentFilter.trim() ? row.intent_name.includes(intentFilter.trim()) : true))
          .filter((row) => (requesterFilter.trim() ? row.requester_id.includes(requesterFilter.trim()) : true))
          .filter((row) => (dateFilter.trim() ? row.created_at >= dateFilter.trim() : true))
          .map((row) => ({
            execution_id: row.execution_id,
            task_id: row.task_id,
            intent_name: row.intent_name,
            requester_id: row.requester_id,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }))
        setRows(data)
        return
      }
      let query = supabase
        .from('task_executions_op')
        .select('execution_id, task_id, intent_name, requester_id, status, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (intentFilter.trim()) {
        query = query.ilike('intent_name', `%${intentFilter.trim()}%`)
      }
      if (requesterFilter.trim()) {
        query = query.ilike('requester_id', `%${requesterFilter.trim()}%`)
      }
      if (dateFilter.trim()) {
        query = query.gte('created_at', dateFilter.trim())
      }

      const { data, error: dbError } = await query
      if (dbError) throw dbError
      setRows(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load executions')
    } finally {
      setLoading(false)
    }
  }


  const runExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    await fetch('/api/execution/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, operator_id: operatorId.trim(), confirm_token: confirmToken.trim() }),
    })
  }

  const confirmExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    await fetch('/api/execution/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, decision: 'confirm', actor_id: operatorId.trim(), actor_role: 'admin', confirm_token: confirmToken.trim() }),
    })
    await loadExecutions()
  }

  const rejectExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    await fetch('/api/execution/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, decision: 'reject', actor_id: operatorId.trim(), actor_role: 'admin', confirm_token: confirmToken.trim() }),
    })
    await loadExecutions()
  }

  const loadSnapshot = async (executionId: string) => {
    if (READ_ONLY_DEMO) {
      const demoSnapshot = getDemoSnapshotById(executionId)
      if (!demoSnapshot) throw new Error('Demo snapshot not found')
      return demoSnapshot
    }
    const res = await fetch('/api/execution/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, operator_id: operatorId.trim(), confirm_token: confirmToken.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.details || 'Snapshot failed')
    return data.execution
  }

  const handleCompare = async () => {
    setError(null)
    try {
      const [a, b] = await Promise.all([loadSnapshot(compareA), loadSnapshot(compareB)])
      setSnapshotA(a)
      setSnapshotB(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed')
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Operations Console</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/ops')}>Ops</Button>
              <Button variant="outline" onClick={() => router.push('/marketing')}>Marketing</Button>
              <Button variant="outline" onClick={() => router.push('/confirmations')}>Confirmations</Button>
              <Button variant="outline" onClick={() => router.push('/audit')}>Audit</Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {READ_ONLY_DEMO && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-800">
                【严格 Read-only】不写入数据 / 不触发 Execution / 无自动确认（仅展示）
              </CardContent>
            </Card>
          )}

          {!READ_ONLY_DEMO && !WRITE_ENABLED && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-sm text-red-800">
                Write mode disabled. Set NEXT_PUBLIC_WRITE_ENABLE=true and provide confirm token to enable actions.
              </CardContent>
            </Card>
          )}
          {demoErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-sm text-red-700">
                Demo data validation errors: {demoErrors.join('; ')}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Write Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">operator_id</label>
                  <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">confirm_token</label>
                  <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="WRITE_CONFIRM_TOKEN" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={writeApproved} onChange={(e) => setWriteApproved(e.target.checked)} />
                <span>I confirm this is an approved write action</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Execution Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant={statusFilter === 'pending_confirmation' ? 'default' : 'outline'} onClick={() => setStatusFilter('pending_confirmation')}>
                  Pending
                </Button>
                <Button variant={statusFilter === 'failed' ? 'default' : 'outline'} onClick={() => setStatusFilter('failed')}>
                  Failed
                </Button>
                <Button variant={statusFilter === 'completed' ? 'default' : 'outline'} onClick={() => setStatusFilter('completed')}>
                  Completed
                </Button>
                <Button variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
                  All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all</SelectItem>
                    <SelectItem value="pending_confirmation">pending_confirmation</SelectItem>
                    <SelectItem value="confirmed">confirmed</SelectItem>
                    <SelectItem value="in_progress">in_progress</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="rejected">rejected</SelectItem>
                    <SelectItem value="expired">expired</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="intent_name filter" value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)} />
                <Input placeholder="requester_id filter" value={requesterFilter} onChange={(e) => setRequesterFilter(e.target.value)} />
                <Input placeholder="created_at >= (YYYY-MM-DD)" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              </div>

              {loading && <p className="text-gray-500">Loading...</p>}
              {error && <p className="text-red-600 text-sm">{error}</p>}

              {!loading && rows.length === 0 && <p className="text-gray-500">No executions found.</p>}

              <div className="space-y-6">
                {groupOrder.map((status) => {
                  const list = grouped[status] || []
                  if (list.length === 0) return null
                  return (
                    <div key={status} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={statusBadge(status)}>{status}</span>
                        <span className="text-xs text-gray-500">({list.length})</span>
                      </div>
                      {list.map((row) => (
                        <Card key={row.execution_id}>
                          <CardContent className="pt-6 space-y-2 text-sm">
                            <div className="grid grid-cols-[120px_1fr] gap-2">
                              <span className="text-gray-500">execution_id</span>
                              <span className="font-mono break-all">{row.execution_id}</span>
                              <span className="text-gray-500">intent</span>
                              <span>{row.intent_name}</span>
                              <span className="text-gray-500">status</span>
                              <span className={statusBadge(row.status)}>{row.status}</span>
                              <span className="text-gray-500">created_at</span>
                              <span>{formatDateTime(row.created_at)}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button variant="outline" onClick={() => router.push(`/audit?exec_id=${row.execution_id}`)}>Audit</Button>
                              <Button variant="outline" onClick={() => router.push(`/outcome?exec_id=${row.execution_id}`)}>Outcome</Button>
                              <Button variant="outline" onClick={() => router.push(`/insight-review?exec_id=${row.execution_id}`)}>Insight Review</Button>
                              <Button variant="outline" onClick={() => router.push(`/insight-candidate?exec_id=${row.execution_id}`)}>Insight Candidate</Button>
                              {!READ_ONLY_DEMO && WRITE_ENABLED && writeApproved && confirmToken.trim().length > 0 && operatorId.trim().length > 0 && row.status === 'pending_confirmation' && (
                                <>
                                  <Button onClick={() => confirmExecution(row.execution_id)}>Confirm</Button>
                                  <Button variant="outline" onClick={() => rejectExecution(row.execution_id)}>Reject</Button>
                                </>
                              )}
                              {!READ_ONLY_DEMO && WRITE_ENABLED && writeApproved && confirmToken.trim().length > 0 && operatorId.trim().length > 0 && row.status === 'confirmed' && (
                                <Button onClick={() => runExecution(row.execution_id)}>Run</Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compare Executions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="execution_id A" value={compareA} onChange={(e) => setCompareA(e.target.value)} />
                <Input placeholder="execution_id B" value={compareB} onChange={(e) => setCompareB(e.target.value)} />
                <Button onClick={handleCompare}>Compare</Button>
              </div>

              {(snapshotA || snapshotB) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Snapshot A</CardTitle></CardHeader>
                    <CardContent className="text-xs font-mono break-all whitespace-pre-wrap">
                      {JSON.stringify(snapshotA, null, 2)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Snapshot B</CardTitle></CardHeader>
                    <CardContent className="text-xs font-mono break-all whitespace-pre-wrap">
                      {JSON.stringify(snapshotB, null, 2)}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
