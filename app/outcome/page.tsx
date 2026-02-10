'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { READ_ONLY_DEMO, getDemoSnapshotById } from '@/lib/demo-data'

type Snapshot = {
  execution_id: string
  payload: unknown
  result: unknown
  audit_log: unknown
  created_at: string
  updated_at: string
}

export default function OutcomeSnapshotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const execIdFromUrl = searchParams.get('exec_id') || ''
  const [execIdInput, setExecIdInput] = useState(execIdFromUrl)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (execIdFromUrl) {
      fetchSnapshot(execIdFromUrl)
    }
  }, [execIdFromUrl])

  const fetchSnapshot = async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (READ_ONLY_DEMO) {
        const demoSnapshot = getDemoSnapshotById(id.trim())
        if (!demoSnapshot) throw new Error('Demo snapshot not found')
        setSnapshot(demoSnapshot)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load snapshot')
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (execIdInput.trim()) {
      router.push(`/outcome?exec_id=${encodeURIComponent(execIdInput.trim())}`)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Execution Outcome Snapshot</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/audit')}>Audit</Button>
              <Button variant="outline" onClick={() => router.push('/operations')}>Operations</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
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
