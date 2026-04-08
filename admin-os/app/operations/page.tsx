'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { READ_ONLY_DEMO, WRITE_ENABLED, demoExecutions, getDemoSnapshotById, validateDemoDataset } from '@/lib/demo-data'
import { formatDateTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/app-nav'

interface ExecutionRow {
  execution_id: string
  task_id: string
  intent_name: string
  requester_id: string
  status: string
  created_at: string
  updated_at: string
}

type ActionKind = 'run' | 'confirm' | 'reject' | 'replay' | 'retry' | 'expire'

const OPS_STATE_KEY = 'maxshot_ops_console_state_v1'

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
  const [compareDelta, setCompareDelta] = useState<{ deltas: Array<{ path: string; before: unknown; after: unknown }>; direction?: string; counterpart_execution_id?: string; truncated?: boolean; limit?: number } | null>(null)
  const [compareDeltaError, setCompareDeltaError] = useState<string | null>(null)
  const [demoErrors] = useState<string[]>(READ_ONLY_DEMO ? validateDemoDataset() : [])
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionAt, setActionAt] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionBusy, setActionBusy] = useState<{ kind: ActionKind; executionId: string } | null>(null)
  const missingWriteReason = !WRITE_ENABLED
    ? 'WRITE_DISABLED'
    : !operatorId.trim()
      ? 'MISSING_OPERATOR'
      : !confirmToken.trim()
        ? 'MISSING_CONFIRM_TOKEN'
        : !writeApproved
          ? 'WRITE_NOT_APPROVED'
          : null

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

  const loadExecutions = useCallback(async () => {
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
  }, [dateFilter, intentFilter, requesterFilter, statusFilter])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OPS_STATE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (typeof saved.statusFilter === 'string') setStatusFilter(saved.statusFilter)
      if (typeof saved.intentFilter === 'string') setIntentFilter(saved.intentFilter)
      if (typeof saved.requesterFilter === 'string') setRequesterFilter(saved.requesterFilter)
      if (typeof saved.dateFilter === 'string') setDateFilter(saved.dateFilter)
      if (typeof saved.operatorId === 'string') setOperatorId(saved.operatorId)
      if (typeof saved.writeApproved === 'boolean') setWriteApproved(saved.writeApproved)
      if (typeof saved.actionReason === 'string') setActionReason(saved.actionReason)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OPS_STATE_KEY,
        JSON.stringify({
          statusFilter,
          intentFilter,
          requesterFilter,
          dateFilter,
          operatorId,
          writeApproved,
          actionReason,
        })
      )
    } catch {
      // ignore
    }
  }, [statusFilter, intentFilter, requesterFilter, dateFilter, operatorId, writeApproved, actionReason])

  const humanizeActionError = (raw: string) => {
    const text = String(raw || '')
    if (text.includes('write_blocked_invalid_token')) return '写入被拦截：confirm_token 无效'
    if (text.includes('write_blocked_missing_operator')) return '写入被拦截：缺少 operator_id'
    if (text.includes('Execution not eligible for retry')) return '当前状态不可 Retry'
    if (text.includes('Execution already terminal')) return '当前已是终态，无法 Expire'
    if (text.includes('Execution not confirmed')) return '执行尚未确认，无法 Run'
    if (text.includes('Confirmation already recorded')) return '该执行已确认/拒绝，不能重复确认'
    return text
  }

  const normalizeActionError = (data: Record<string, unknown>, fallback: string) =>
    humanizeActionError(String(data.error || data.details || data.message || fallback))

  const formatActionSuccess = (kind: ActionKind, executionId: string, data: Record<string, unknown>) => {
    const mode = typeof data.mode === 'string' ? data.mode : null
    const resolvedId =
      typeof data.execution_id === 'string'
        ? data.execution_id
        : typeof data.new_execution_id === 'string'
          ? data.new_execution_id
          : executionId
    const suffix = mode ? ` [mode=${mode}]` : ''
    if (kind === 'run') return `Run accepted: ${resolvedId}${suffix}`
    if (kind === 'confirm') return `Confirmed: ${resolvedId}${suffix}`
    if (kind === 'reject') return `Rejected: ${resolvedId}${suffix}`
    if (kind === 'replay') return `Replay accepted: ${resolvedId}${suffix}`
    if (kind === 'retry') return `Retry accepted: ${resolvedId}${suffix}`
    return `Expire accepted: ${resolvedId}${suffix}`
  }

  const markActionAt = () => setActionAt(new Date().toISOString())


  const runExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'run', executionId })
    try {
      const res = await fetch('/api/execution/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId, operator_id: operatorId.trim(), confirm_token: confirmToken.trim() }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setActionError(normalizeActionError(data, 'Run failed'))
        return
      }
      setActionMessage(formatActionSuccess('run', executionId, data))
      markActionAt()
      await loadExecutions()
    } finally {
      setActionBusy(null)
    }
  }

  const confirmExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'confirm', executionId })
    try {
      const res = await fetch('/api/execution/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId, decision: 'confirm', actor_id: operatorId.trim(), actor_role: 'admin', confirm_token: confirmToken.trim() }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setActionError(normalizeActionError(data, 'Confirm failed'))
        return
      }
      setActionMessage(formatActionSuccess('confirm', executionId, data))
      markActionAt()
      await loadExecutions()
    } finally {
      setActionBusy(null)
    }
  }

  const rejectExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'reject', executionId })
    try {
      const res = await fetch('/api/execution/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId, decision: 'reject', actor_id: operatorId.trim(), actor_role: 'admin', confirm_token: confirmToken.trim() }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setActionError(normalizeActionError(data, 'Reject failed'))
        return
      }
      setActionMessage(formatActionSuccess('reject', executionId, data))
      markActionAt()
      await loadExecutions()
    } finally {
      setActionBusy(null)
    }
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
    if (!res.ok) throw new Error(String(data.error || data.details || 'Snapshot failed'))
    return data.execution
  }

  const fetchCompareDelta = async (aId: string, bId: string) => {
    if (READ_ONLY_DEMO) return
    setCompareDeltaError(null)
    setCompareDelta(null)
    try {
      const res = await fetch(`/api/outcome-delta?execution_id=${encodeURIComponent(aId)}&counterpart_execution_id=${encodeURIComponent(bId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(String(data.error || data.details || 'Compare delta failed'))
      setCompareDelta({
        deltas: data.deltas ?? [],
        direction: data.direction,
        counterpart_execution_id: data.counterpart_execution_id,
        truncated: data.truncated,
        limit: data.limit,
      })
    } catch (e) {
      setCompareDeltaError(e instanceof Error ? e.message : 'Compare delta failed')
    }
  }

  const handleCompare = async () => {
    setError(null)
    try {
      const [a, b] = await Promise.all([loadSnapshot(compareA), loadSnapshot(compareB)])
      setSnapshotA(a)
      setSnapshotB(b)
      await fetchCompareDelta(compareA, compareB)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed')
    }
  }

  const replayExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'replay', executionId })
    try {
      const res = await fetch('/api/execution/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
          actor_role: 'admin',
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error || data.details || 'Replay failed'))
      const replayId = typeof data.execution_id === 'string' ? data.execution_id : executionId
      setActionMessage(formatActionSuccess('replay', executionId, data))
      markActionAt()
      router.push(`/audit?exec_id=${encodeURIComponent(replayId)}`)
    } catch (e) {
      setActionError(humanizeActionError(e instanceof Error ? e.message : 'Replay failed'))
    } finally {
      setActionBusy(null)
    }
  }

  const retryExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'retry', executionId })
    try {
      const res = await fetch('/api/execution/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          actor_id: operatorId.trim(),
          actor_role: 'admin',
          confirm_token: confirmToken.trim(),
          reason: actionReason.trim() || 'manual_retry',
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error || data.details || 'Retry failed'))
      const retryId = typeof data.execution_id === 'string' ? data.execution_id : executionId
      setActionMessage(formatActionSuccess('retry', executionId, data))
      markActionAt()
      await loadExecutions()
      if (retryId) {
        router.push(`/audit?exec_id=${encodeURIComponent(retryId)}`)
      }
    } catch (e) {
      setActionError(humanizeActionError(e instanceof Error ? e.message : 'Retry failed'))
    } finally {
      setActionBusy(null)
    }
  }

  const expireExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    setActionError(null)
    setActionMessage(null)
    setActionBusy({ kind: 'expire', executionId })
    try {
      const res = await fetch('/api/execution/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          actor_id: operatorId.trim(),
          actor_role: 'admin',
          confirm_token: confirmToken.trim(),
          reason: actionReason.trim() || 'manual_expire',
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error || data.details || 'Expire failed'))
      setActionMessage(formatActionSuccess('expire', executionId, data))
      markActionAt()
      await loadExecutions()
    } catch (e) {
      setActionError(humanizeActionError(e instanceof Error ? e.message : 'Expire failed'))
    } finally {
      setActionBusy(null)
    }
  }

  const getBaseActionBlockReason = () => {
    if (READ_ONLY_DEMO) return 'READ_ONLY_DEMO'
    if (!WRITE_ENABLED) return 'WRITE_DISABLED'
    if (!operatorId.trim()) return 'MISSING_OPERATOR'
    if (!confirmToken.trim()) return 'MISSING_CONFIRM_TOKEN'
    if (!writeApproved) return 'WRITE_NOT_APPROVED'
    return null
  }

  const getActionBlockedReason = (kind: ActionKind, status: string) => {
    const base = getBaseActionBlockReason()
    if (base) return base
    if (kind === 'run' && status !== 'confirmed') return 'STATUS_NOT_CONFIRMED'
    if (kind === 'confirm' && status !== 'pending_confirmation') return 'STATUS_NOT_PENDING'
    if (kind === 'reject' && status !== 'pending_confirmation') return 'STATUS_NOT_PENDING'
    if (kind === 'retry' && !['failed', 'rejected', 'expired'].includes(status)) return 'STATUS_NOT_RETRIABLE'
    if (kind === 'expire' && !['pending_confirmation', 'confirmed', 'in_progress'].includes(status)) return 'STATUS_NOT_EXPIRABLE'
    return null
  }

  const blockedReasonText = (reason: string | null) => {
    if (!reason) return ''
    if (reason === 'READ_ONLY_DEMO') return 'Read-only demo mode'
    if (reason === 'WRITE_DISABLED') return 'Write disabled'
    if (reason === 'MISSING_OPERATOR') return 'Missing operator_id'
    if (reason === 'MISSING_CONFIRM_TOKEN') return 'Missing confirm_token'
    if (reason === 'WRITE_NOT_APPROVED') return 'Write approval unchecked'
    if (reason === 'STATUS_NOT_CONFIRMED') return 'Only confirmed can run'
    if (reason === 'STATUS_NOT_PENDING') return 'Only pending_confirmation can confirm/reject'
    if (reason === 'STATUS_NOT_RETRIABLE') return 'Only failed/rejected/expired can retry'
    if (reason === 'STATUS_NOT_EXPIRABLE') return 'Only pending/confirmed/in_progress can expire'
    return reason
  }

  return (
    <AuthGuard requiredSurface="operations">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Operations Console</h1>
            <AppNav current="operations" />
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
          {!READ_ONLY_DEMO && WRITE_ENABLED && missingWriteReason && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-800">
                Write blocked: {missingWriteReason}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">operator_id</label>
                  <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">confirm_token</label>
                  <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="WRITE_CONFIRM_TOKEN" />
                </div>
                <div>
                  <label className="text-sm">reason (optional)</label>
                  <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="manual_retry / manual_expire" />
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
              <div className="text-xs text-gray-600">
                操作规则：Retry 仅用于 failed/rejected/expired；Expire 仅用于 pending/confirmed/in_progress；Run 仅用于 confirmed。
              </div>
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
              {actionError && <p className="text-red-600 text-sm">{actionError}</p>}
              {actionMessage && <p className="text-emerald-700 text-sm">{actionMessage}</p>}
              {actionAt && <p className="text-xs text-gray-500">last_action_at: {formatDateTime(actionAt)}</p>}
              {!READ_ONLY_DEMO && (
                <p className="text-xs text-gray-500">
                  Current write state: {getBaseActionBlockReason() ? `blocked (${blockedReasonText(getBaseActionBlockReason())})` : 'ready'}
                </p>
              )}
              {actionBusy && (
                <p className="text-xs text-blue-700">
                  Processing `{actionBusy.kind}` for `{actionBusy.executionId}`...
                </p>
              )}

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
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(row.execution_id)
                                    setActionMessage(`execution_id copied: ${row.execution_id}`)
                                  } catch {
                                    setActionError('复制 execution_id 失败')
                                  }
                                }}
                              >
                                Copy ID
                              </Button>
                              <Button variant="outline" onClick={() => router.push(`/audit?exec_id=${row.execution_id}`)}>Audit</Button>
                              <Button variant="outline" onClick={() => router.push(`/outcome?exec_id=${row.execution_id}`)}>Outcome</Button>
                              <Button
                                variant="outline"
                                title={blockedReasonText(getActionBlockedReason('replay', row.status))}
                                disabled={!!getActionBlockedReason('replay', row.status) || !!actionBusy}
                                onClick={() => replayExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'replay' && actionBusy.executionId === row.execution_id ? 'Replaying...' : 'Replay'}
                              </Button>
                              <Button variant="outline" onClick={() => router.push(`/insight-review?exec_id=${row.execution_id}`)}>Insight Review</Button>
                              <Button variant="outline" onClick={() => router.push(`/insight-candidate?exec_id=${row.execution_id}`)}>Insight Candidate</Button>
                              <Button
                                variant="outline"
                                title={blockedReasonText(getActionBlockedReason('retry', row.status))}
                                disabled={!!getActionBlockedReason('retry', row.status) || !!actionBusy}
                                onClick={() => retryExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'retry' && actionBusy.executionId === row.execution_id ? 'Retrying...' : 'Retry'}
                              </Button>
                              <Button
                                variant="outline"
                                title={blockedReasonText(getActionBlockedReason('expire', row.status))}
                                disabled={!!getActionBlockedReason('expire', row.status) || !!actionBusy}
                                onClick={() => expireExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'expire' && actionBusy.executionId === row.execution_id ? 'Expiring...' : 'Expire'}
                              </Button>
                              <Button
                                title={blockedReasonText(getActionBlockedReason('confirm', row.status))}
                                disabled={!!getActionBlockedReason('confirm', row.status) || !!actionBusy}
                                onClick={() => confirmExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'confirm' && actionBusy.executionId === row.execution_id ? 'Confirming...' : 'Confirm'}
                              </Button>
                              <Button
                                variant="outline"
                                title={blockedReasonText(getActionBlockedReason('reject', row.status))}
                                disabled={!!getActionBlockedReason('reject', row.status) || !!actionBusy}
                                onClick={() => rejectExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'reject' && actionBusy.executionId === row.execution_id ? 'Rejecting...' : 'Reject'}
                              </Button>
                              <Button
                                title={blockedReasonText(getActionBlockedReason('run', row.status))}
                                disabled={!!getActionBlockedReason('run', row.status) || !!actionBusy}
                                onClick={() => runExecution(row.execution_id)}
                              >
                                {actionBusy?.kind === 'run' && actionBusy.executionId === row.execution_id ? 'Running...' : 'Run'}
                              </Button>
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

              {(Boolean(snapshotA) || Boolean(snapshotB)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Compare Delta</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {compareDeltaError && <div className="text-red-600">{compareDeltaError}</div>}
                      {compareDelta && compareDelta.deltas?.length ? (
                        compareDelta.deltas.map((d, idx) => (
                          <div key={idx} className="border rounded p-2 bg-gray-50">
                            <div className="font-mono text-[11px]">{d.path}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                        ))
                      ) : (
                        <div className="text-gray-500">No delta available.</div>
                      )}
                    </CardContent>
                  </Card>
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
