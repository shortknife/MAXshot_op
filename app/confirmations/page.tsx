'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { READ_ONLY_DEMO, demoExecutions } from '@/lib/demo-data'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface PendingExecution {
  execution_id: string
  intent_name: string
  status: string
  created_at: string
  confirmation_request: unknown
}

export default function ConfirmationsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPending()
  }, [])

  const loadPending = async () => {
    try {
      setLoading(true)
      if (READ_ONLY_DEMO) {
        const data = demoExecutions
          .filter((row) => row.status === 'pending_confirmation')
          .map((row) => ({
            execution_id: row.execution_id,
            intent_name: row.intent_name,
            status: row.status,
            created_at: row.created_at,
            confirmation_request: row.confirmation_request,
          }))
        setPending(data)
        return
      }
      const { data, error: dbError } = await supabase
        .from('task_executions_op')
        .select('execution_id, intent_name, status, created_at, confirmation_request')
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: true })

      if (dbError) throw dbError
      setPending(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pending confirmations')
    } finally {
      setLoading(false)
    }
  }


  const confirmExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    const res = await fetch('/api/execution/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, decision: 'confirm', actor_id: 'admin', actor_role: 'admin' }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || data.details || 'Confirm failed')
    }
  }

  const rejectExecution = async (executionId: string) => {
    if (READ_ONLY_DEMO) return
    const res = await fetch('/api/execution/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ execution_id: executionId, decision: 'reject', actor_id: 'admin', actor_role: 'admin' }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || data.details || 'Reject failed')
    }
  }

  const handleConfirm = async (executionId: string) => {
    setError(null)
    try {
      await confirmExecution(executionId)
      await loadPending()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirm failed')
    }
  }

  const handleReject = async (executionId: string) => {
    setError(null)
    try {
      await rejectExecution(executionId)
      await loadPending()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Pending Confirmations</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/ops')}>Ops</Button>
              <Button variant="outline" onClick={() => router.push('/marketing')}>Marketing</Button>
              <Button variant="outline" onClick={() => router.push('/audit')}>Audit</Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {READ_ONLY_DEMO && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-sm text-amber-800">
                Read-only demo mode enabled. Confirm/Reject actions are disabled.
              </CardContent>
            </Card>
          )}
          {loading && <p className="text-gray-500">Loading...</p>}
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {!loading && pending.length === 0 && (
            <p className="text-gray-500">No pending confirmations.</p>
          )}

          <div className="space-y-4">
            {pending.map((item) => (
              <Card key={item.execution_id}>
                <CardHeader>
                  <CardTitle className="text-base">execution_id: {item.execution_id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-gray-500">intent</span>
                    <span>{item.intent_name}</span>
                    <span className="text-gray-500">created_at</span>
                    <span>{formatDateTime(item.created_at)}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono break-all">
                    confirmation_request: {JSON.stringify(item.confirmation_request || {})}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {!READ_ONLY_DEMO && (
                      <>
                        <Button onClick={() => handleConfirm(item.execution_id)}>Confirm</Button>
                        <Button variant="outline" onClick={() => handleReject(item.execution_id)}>Reject</Button>
                      </>
                    )}
                    <Button variant="ghost" onClick={() => router.push(`/audit?exec_id=${item.execution_id}`)}>View Audit</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
