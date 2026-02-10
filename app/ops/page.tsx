'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { READ_ONLY_DEMO } from '@/lib/demo-data'

export default function OpsRequestPage() {
  const router = useRouter()
  const [entryType, setEntryType] = useState<'raw_query' | 'structured'>('raw_query')
  const [rawQuery, setRawQuery] = useState('')
  const [intentName, setIntentName] = useState('ops_query')
  const [slotsJson, setSlotsJson] = useState('{"metric":"apy"}')
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeRawQuery = async () => {
    if (READ_ONLY_DEMO) return
    setLoading(true)
    setError(null)
    try {
      const contextRes = await fetch('/api/intent/context/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: 'admin_os', user_id: 'admin', raw_query: rawQuery }),
      })
      const context = await contextRes.json()

      const res = await fetch('/api/intent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_query: rawQuery, session_context: context.session_context }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Intent analyze failed')
      }
      setIntentName(data.intent?.type || 'ops_query')
      setSlotsJson(JSON.stringify(data.intent?.extracted_slots || {}, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyze failed')
    } finally {
      setLoading(false)
    }
  }

  const submitRequest = async () => {
    if (READ_ONLY_DEMO) return
    setLoading(true)
    setError(null)
    setExecutionId(null)
    setStatus(null)
    try {
      const slots = JSON.parse(slotsJson || '{}')
      const gateRes = await fetch('/api/entry/gate/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_name: intentName,
          capability_binding: { capability_id: 'capability.data_fact_query' },
          execution_mode: 'deterministic',
          requester_id: 'admin',
          entry_channel: 'admin_os',
        }),
      })
      const gate = await gateRes.json()
      if (gate.gate_result !== 'pass') {
        throw new Error(gate.message || 'Gate did not pass')
      }

      const createRes = await fetch('/api/intent/task/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: entryType,
          entry_channel: 'admin_os',
          requester_id: 'admin',
          intent_name: intentName,
          payload: { intent: intentName, extracted_slots: slots },
          metadata: { raw_query: rawQuery },
          require_confirmation: true,
          confirmation_request: gate.confirmation_request || { reason: 'human_approval_required', message: 'Requires human confirmation' },
          reason_for_pending: gate.reason_for_pending || 'human_approval_required',
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) {
        throw new Error(created.error || created.details || 'Create execution failed')
      }
      setExecutionId(created.execution_id)
      setStatus(gate.require_confirmation ? 'pending_confirmation' : 'created')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Ops Request</h1>
            <div className="flex gap-2">
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
                Read-only demo mode enabled. Entry creation is disabled.
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Create Ops Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm">
                <Label>entry_type</Label>
                <Select value={entryType} onValueChange={(v) => setEntryType(v as 'raw_query' | 'structured')} disabled={READ_ONLY_DEMO}>
                  <SelectTrigger>
                    <SelectValue placeholder="entry_type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_query">raw_query</SelectItem>
                    <SelectItem value="structured">structured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>raw_query</Label>
                <Textarea value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} placeholder="e.g. What is the APY of USDC vault?" disabled={READ_ONLY_DEMO} />
                <div className="mt-2">
                  <Button variant="outline" onClick={analyzeRawQuery} disabled={READ_ONLY_DEMO || loading || !rawQuery.trim()}>
                    Analyze Intent
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>intent_name</Label>
                  <Input value={intentName} onChange={(e) => setIntentName(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>slots (JSON)</Label>
                  <Textarea value={slotsJson} onChange={(e) => setSlotsJson(e.target.value)} className="font-mono text-sm" rows={6} disabled={READ_ONLY_DEMO} />
                </div>
              </div>

              <Button onClick={submitRequest} disabled={READ_ONLY_DEMO || loading}>
                Create Execution
              </Button>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {executionId && (
                <div className="text-sm">
                  <p>execution_id: <span className="font-mono">{executionId}</span></p>
                  <p>status: {status}</p>
                  <Button variant="link" onClick={() => router.push(`/audit?exec_id=${executionId}`)}>
                    View Audit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
