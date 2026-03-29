'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ExecutionRow = {
  execution_id: string
  status: string
  created_at: string
  audit_log?: { events?: Array<{ event_type?: string }> }
}

export default function DigestPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ExecutionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowSize, setWindowSize] = useState<'50' | '200' | '500'>('200')

  const loadExecutions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: dbError } = await supabase
        .from('task_executions_op')
        .select('execution_id, status, created_at, audit_log')
        .order('created_at', { ascending: false })
        .limit(Number(windowSize))

      if (dbError) throw dbError
      setRows(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load digest data')
    } finally {
      setLoading(false)
    }
  }, [windowSize])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  const stats = useMemo(() => {
    const total = rows.length
    const byStatus: Record<string, number> = {}
    let hasAudit = 0
    let hasRouterComplete = 0

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] || 0) + 1
      const events = row.audit_log?.events || []
      if (events.length > 0) hasAudit += 1
      if (events.some((e) => e.event_type === 'router_complete')) hasRouterComplete += 1
    }

    return {
      total,
      byStatus,
      auditCoverage: total ? Math.round((hasAudit / total) * 100) : 0,
      routerCompleteCoverage: total ? Math.round((hasRouterComplete / total) * 100) : 0,
    }
  }, [rows])

  const statusBadge = (status: string) => {
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Observability Digest</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/operations')}>Operations</Button>
              <Button variant="outline" onClick={() => router.push('/audit')}>Audit</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Window</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Select value={windowSize} onValueChange={(v) => setWindowSize(v as '50' | '200' | '500')}>
                <SelectTrigger className="max-w-[140px]">
                  <SelectValue placeholder="window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Last 50</SelectItem>
                  <SelectItem value="200">Last 200</SelectItem>
                  <SelectItem value="500">Last 500</SelectItem>
                </SelectContent>
              </Select>
              {loading && <span className="text-sm text-gray-500">Loading…</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Executions</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{stats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Audit Coverage</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{stats.auditCoverage}%</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>router_complete Coverage</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{stats.routerCompleteCoverage}%</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.keys(stats.byStatus).length === 0 && (
                <span className="text-sm text-gray-500">No data.</span>
              )}
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <span key={status} className={statusBadge(status)}>
                  {status}: {count}
                </span>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
