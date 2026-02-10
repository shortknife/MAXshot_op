'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'
import { READ_ONLY_DEMO } from '@/lib/demo-data'

export default function MarketingRequestPage() {
  const router = useRouter()
  const [platform, setPlatform] = useState('twitter')
  const [topic, setTopic] = useState('product update')
  const [tone, setTone] = useState('professional')
  const [includeData, setIncludeData] = useState(false)
  const [templateId, setTemplateId] = useState('marketing_basic')
  const [requiresConfirmation, setRequiresConfirmation] = useState(true)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitRequest = async () => {
    if (READ_ONLY_DEMO) return
    setLoading(true)
    setError(null)
    setExecutionId(null)
    setStatus(null)
    try {
      const intentName = 'marketing_gen'
      const slots = { platform, topic, tone, include_data: includeData, template_id: templateId }
      const capabilityBinding = requiresConfirmation ? 'capability.publisher' : 'capability.content_generator'

      const gateRes = await fetch('/api/entry/gate/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_name: intentName,
          capability_binding: { capability_id: capabilityBinding },
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
          entry_type: 'structured',
          entry_channel: 'admin_os',
          requester_id: 'admin',
          intent_name: intentName,
          payload: { intent: intentName, extracted_slots: slots },
          metadata: { raw_query: '' },
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
            <h1 className="text-2xl font-bold">Marketing Request</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/ops')}>Ops</Button>
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
              <CardTitle>Create Marketing Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>platform</Label>
                  <Input value={platform} onChange={(e) => setPlatform(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>topic</Label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>tone</Label>
                  <Input value={tone} onChange={(e) => setTone(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
              </div>

              <div className="max-w-sm">
                <Label>template_id</Label>
                <Input value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={READ_ONLY_DEMO} />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={includeData} onCheckedChange={setIncludeData} disabled={READ_ONLY_DEMO} />
                <span className="text-sm text-gray-600">Include data_fact_query before content generation</span>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={requiresConfirmation} onCheckedChange={setRequiresConfirmation} disabled={READ_ONLY_DEMO} />
                <span className="text-sm text-gray-600">Require confirmation (side_effect)</span>
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
