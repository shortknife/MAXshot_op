'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { READ_ONLY_DEMO, WRITE_ENABLED, getDemoSnapshotById } from '@/lib/demo-data'
import { ReadOnlyBanner } from '@/components/read-only-banner'
import { buildAttribution } from '@/lib/evolution/attribution'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const MEMORY_TYPES = ['foundation', 'experience', 'insight'] as const

type Snapshot = {
  execution_id: string
  payload: unknown
  result: unknown
  audit_log: unknown
  created_at: string
  updated_at: string
}

type CapabilityOutput = {
  capability_id?: string
  evidence?: { sources?: unknown[] }
}

type AuditEvent = { event_type?: string; timestamp?: string; data?: Record<string, unknown> }

export default function InsightWritebackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const execId = searchParams.get('exec_id') || ''
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(!!execId)
  const [error, setError] = useState<string | null>(null)
  const [memoryType, setMemoryType] = useState<(typeof MEMORY_TYPES)[number]>('insight')
  const [operatorId, setOperatorId] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const [approved, setApproved] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const [memoryId, setMemoryId] = useState('')
  const [weightRec, setWeightRec] = useState<any | null>(null)
  const [weightLoading, setWeightLoading] = useState(false)

  const attribution = useMemo(() => buildAttribution({ result: (snapshot?.result as any) || null, audit_log: (snapshot?.audit_log as any) || null }), [snapshot])

  const describeError = (code?: string) => {
    switch (code) {
      case 'write_blocked_read_only':
        return 'Write blocked: read-only demo mode.'
      case 'write_blocked_disabled':
        return 'Write blocked: NEXT_PUBLIC_WRITE_ENABLE is false.'
      case 'write_blocked_missing_operator':
        return 'Missing operator_id. Fill in operator_id before submitting.'
      case 'write_blocked_invalid_token':
        return 'Invalid confirm_token. Please double-check WRITE_CONFIRM_TOKEN and restart dev server.'
      case 'approval_required':
        return 'Approval checkbox is required.'
      case 'missing_source_execution_id':
        return 'Missing source execution id.'
      case 'missing_approved_by':
        return 'Missing operator_id.'
      case 'invalid_memory_type':
        return 'Invalid memory type.'
      case 'missing_candidate':
        return 'Missing candidate payload.'
      case 'missing_fields':
        return 'Missing required fields. Check memory_id, operator_id, confirm_token.'
      case 'invalid_weight':
        return 'Recommended weight is invalid.'
      case 'memory_not_found':
        return 'Memory record not found.'
      default:
        return code || 'Unexpected error.'
    }
  }

  const fetchWeightRecommendation = async () => {
    if (!execId || !memoryId || READ_ONLY_DEMO) return
    setWeightLoading(true)
    setWeightRec(null)
    try {
      const res = await fetch('/api/memory/weight-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory_id: memoryId.trim(), source_execution_id: execId, attribution }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'recommendation_failed')
      setWeightRec(data)
    } catch (e) {
      setWeightRec({ error: e instanceof Error ? e.message : 'recommendation_failed' })
    } finally {
      setWeightLoading(false)
    }
  }

  const applyWeightUpdate = async () => {
    if (!weightRec?.recommendation || READ_ONLY_DEMO) return
    if (!approved) {
      setSubmitState('error')
      setSubmitMessage('Approval checkbox is required.')
      return
    }
    if (!operatorId.trim() || !confirmToken.trim()) {
      setSubmitState('error')
      setSubmitMessage('Missing operator_id or confirm_token.')
      return
    }
    if (!memoryId.trim()) {
      setSubmitState('error')
      setSubmitMessage('Missing memory_id for weight update.')
      return
    }
    setSubmitState('submitting')
    setSubmitMessage(null)
    try {
      const res = await fetch('/api/memory/weight-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory_id: memoryId.trim(),
          source_execution_id: execId,
          approved_by: operatorId.trim(),
          approved,
          recommended_weight: weightRec.recommendation.recommended_weight,
          reason_code: weightRec.recommendation.reason_code,
          confirm_token: confirmToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(describeError(data.error) || 'weight_apply_failed')
      setSubmitState('success')
      setSubmitMessage(`Weight updated. Events: ${data.events?.join(', ')}`)
    } catch (e) {
      setSubmitState('error')
      setSubmitMessage(e instanceof Error ? e.message : 'weight_apply_failed')
    }
  }

  useEffect(() => {
    if (!execId) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        if (READ_ONLY_DEMO) {
          const demoSnapshot = getDemoSnapshotById(execId.trim())
          if (!demoSnapshot) throw new Error('Demo snapshot not found')
          setSnapshot(demoSnapshot)
          return
        }
        const res = await fetch('/api/execution/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ execution_id: execId.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || data.details || 'Failed to load snapshot')
        setSnapshot(data.execution || null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load snapshot')
        setSnapshot(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [execId])

  const candidate = useMemo(() => {
    if (!snapshot) return null
    const result = snapshot.result as { capability_outputs?: CapabilityOutput[] } | null
    const outputs = result?.capability_outputs || []
    const auditEvents = ((snapshot.audit_log as { events?: AuditEvent[] } | null)?.events || []) as AuditEvent[]
    const capabilityPath = auditEvents
      .filter((e) => e.event_type === 'capability_executed')
      .map((e) => e.data?.capability_id)
      .filter(Boolean) as string[]

    const evidenceSources = outputs.flatMap((o) => o.evidence?.sources || [])

    return {
      source_execution_id: snapshot.execution_id,
      execution_fields: {
        payload: snapshot.payload ?? null,
        result: snapshot.result ?? null,
        evidence: { sources: evidenceSources },
      },
      capability_path: capabilityPath,
    }
  }, [snapshot])

  const submitWriteback = async () => {
    if (!candidate || READ_ONLY_DEMO) return
    if (!approved) {
      setSubmitState('error')
      setSubmitMessage('Approval checkbox is required.')
      return
    }
    if (!operatorId.trim() || !confirmToken.trim()) {
      setSubmitState('error')
      setSubmitMessage('Missing operator_id or confirm_token.')
      return
    }
    setSubmitState('submitting')
    setSubmitMessage(null)
    try {
      const res = await fetch('/api/memory/writeback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_execution_id: candidate.source_execution_id,
          candidate,
          memory_type: memoryType,
          approved_by: operatorId.trim(),
          approved,
          confirm_token: confirmToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(describeError(data.error) || 'writeback_failed')
      setSubmitState('success')
      setSubmitMessage(`Memory written: ${data.memory_id || 'ok'}`)
    } catch (e) {
      setSubmitState('error')
      setSubmitMessage(e instanceof Error ? e.message : 'writeback_failed')
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Insight Write-Back (Human Approval)</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/insight-candidate?exec_id=${encodeURIComponent(execId)}`)}>
                Back to Insight Candidate
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <ReadOnlyBanner />

          <Card>
            <CardHeader>
              <CardTitle>Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {READ_ONLY_DEMO && (
                <p className="text-red-600">Read-only demo mode: write-back disabled.</p>
              )}

              {!READ_ONLY_DEMO && !WRITE_ENABLED && (
                <p className="text-red-600">Write mode disabled. Set NEXT_PUBLIC_WRITE_ENABLE=true and provide confirm token to enable actions.</p>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Memory Type</Label>
                  <div className="mt-2 flex gap-2">
                    {MEMORY_TYPES.map((t) => (
                      <Button key={t} variant={memoryType === t ? 'default' : 'outline'} onClick={() => setMemoryType(t)}>
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Approved By</Label>
                  <Input value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="operator_id" />
                </div>

                <div>
                  <Label>confirm_token</Label>
                  <Input value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="WRITE_CONFIRM_TOKEN" />
                </div>

              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                <span>I confirm this write-back is approved</span>
              </div>
              {submitMessage && (
                <p className="text-sm text-gray-700">{submitMessage}</p>
              )}
              <Button
                disabled={READ_ONLY_DEMO || !WRITE_ENABLED || !candidate || !approved || operatorId.trim().length === 0 || !confirmToken.trim() || submitState === 'submitting'}
                onClick={submitWriteback}
              >
                Approve & Write
              </Button>
              {submitMessage && (
                <p className={submitState === 'error' ? 'text-red-600' : 'text-green-600'}>{submitMessage}</p>
              )}
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Weight Adjustment (Human Approval)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label>Memory ID</Label>
                <Input value={memoryId} onChange={(e) => setMemoryId(e.target.value)} placeholder="memory_id" />
              </div>
              <Button variant="outline" disabled={READ_ONLY_DEMO || !memoryId || weightLoading} onClick={fetchWeightRecommendation}>
                {weightLoading ? 'Loading...' : 'Compute Recommendation'}
              </Button>
              {weightRec && !weightRec.error && (
                <div className="text-xs text-gray-700">
                  <div>current_weight: {weightRec.latest_weight}</div>
                  <div>recommended_weight: {weightRec.recommendation?.recommended_weight}</div>
                  <div>delta: {weightRec.recommendation?.delta}</div>
                  <div>reason_code: {weightRec.recommendation?.reason_code}</div>
                  <div>verification_count: {weightRec.verification_count}</div>
                </div>
              )}
              {weightRec?.error && <div className="text-red-600">{weightRec.error}</div>}
              <Button
                disabled={READ_ONLY_DEMO || !WRITE_ENABLED || !weightRec?.recommendation || !approved || operatorId.trim().length === 0 || !confirmToken.trim() || submitState === 'submitting'}
                onClick={applyWeightUpdate}
              >
                Approve Weight Update
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Candidate Payload (Read-Only)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p>Loading...</p>}
              {error && <p className="text-red-600">{error}</p>}
              {!loading && !error && !candidate && <p>No candidate available.</p>}
              {candidate && (
                <pre className="text-xs font-mono break-all whitespace-pre-wrap">{JSON.stringify(candidate, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
