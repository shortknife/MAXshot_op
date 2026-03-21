'use client'

import { useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { READ_ONLY_DEMO, getDemoSnapshotById } from '@/lib/demo-data'
import { buildAttribution } from '@/lib/evolution/attribution'
import { buildRecommendation } from '@/lib/evolution/candidate'
import { ReadOnlyBanner } from '@/components/read-only-banner'

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
  status?: string
  evidence?: { sources?: unknown[]; fallback_reason?: string }
  metadata?: { fallback_reason?: string }
  result?: unknown
}

export default function InsightReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const execIdFromUrl = searchParams.get('exec_id') || ''
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [operatorId, setOperatorId] = useState('admin')
  const [confirmToken, setConfirmToken] = useState('')
  const [hypothesisResult, setHypothesisResult] = useState<Record<string, unknown> | null>(null)
  const [hypothesisError, setHypothesisError] = useState<string | null>(null)
  const [hypothesisLoading, setHypothesisLoading] = useState(false)

  useEffect(() => {
    if (execIdFromUrl) {
      fetchSnapshot(execIdFromUrl)
    }
  }, [execIdFromUrl])

  const fetchSnapshot = async (id: string) => {
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
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to load snapshot')
      setSnapshot(data.execution || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load snapshot')
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }

  const outputs: CapabilityOutput[] = useMemo(() => {
    const result = snapshot?.result as { capability_outputs?: CapabilityOutput[] } | undefined
    return result?.capability_outputs || []
  }, [snapshot])

  const evidenceLines = useMemo(() => {
    const lines: string[] = []
    for (const out of outputs) {
      const sources = out.evidence?.sources || []
      const fallback = out.evidence?.fallback_reason || out.metadata?.fallback_reason
      lines.push(`- capability: ${out.capability_id || 'unknown'}`)
      lines.push(`  status: ${out.status || 'unknown'}`)
      lines.push(`  sources: ${JSON.stringify(sources)}`)
      if (fallback) lines.push(`  fallback_reason: ${fallback}`)
    }
    return lines
  }, [outputs])


  const auditEvents = useMemo(() => {
    const audit = snapshot?.audit_log as { events?: { event_type?: string; data?: Record<string, unknown> }[] } | undefined
    return audit?.events || []
  }, [snapshot])

  const capabilityPath = useMemo(() => {
    return auditEvents
      .filter((e) => e.event_type === 'capability_executed')
      .map((e) => e.data?.capability_id)
      .filter(Boolean) as string[]
  }, [auditEvents])

  const attribution = useMemo(() => buildAttribution({ result: (snapshot?.result as any) || null, audit_log: (snapshot?.audit_log as any) || null }), [snapshot])
  const recommendation = useMemo(
    () =>
      buildRecommendation({
        source_execution_id: snapshot?.execution_id || '',
        capability_path: capabilityPath,
        attribution,
      }),
    [snapshot, capabilityPath, attribution]
  )
  const resultSummary = useMemo(() => {
    return JSON.stringify(snapshot?.result ?? null, null, 2)
  }, [snapshot])

  const markdownDraft = useMemo(() => {
    const headerComment = '// Draft Export Only – Not Saved to DB – No Write-back to Router – For Human Review Only'
    return [
      headerComment,
      `# Insight Draft (Not Saved)`,
      ``,
      `Execution: ${snapshot?.execution_id || '—'}`,
      `Created: ${snapshot?.created_at ? formatDateTime(snapshot.created_at) : '—'}`,
      ``,
      `## Result Summary`,
      '```json',
      resultSummary,
      '```',
      ``,
      `## Evidence Sources`,
      ...evidenceLines,
      ``,
      `## Fallbacks`,
      evidenceLines.some((l) => l.includes('fallback_reason'))
        ? evidenceLines.filter((l) => l.includes('fallback_reason'))
        : ['- none'],
    ].flat().join('\n')
  }, [snapshot, resultSummary, evidenceLines])

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(markdownDraft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const generateHypothesis = async () => {
    if (!snapshot?.execution_id) return
    setHypothesisLoading(true)
    setHypothesisError(null)
    setHypothesisResult(null)
    try {
      const res = await fetch('/api/evolution/hypothesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: snapshot.execution_id,
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'hypothesis_generate_failed')
      setHypothesisResult(data)
    } catch (e) {
      setHypothesisError(e instanceof Error ? e.message : 'hypothesis_generate_failed')
    } finally {
      setHypothesisLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Insight Review</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/outcome?exec_id=${encodeURIComponent(execIdFromUrl)}`)}>
                Back to Outcome
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <ReadOnlyBanner />
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
                  <CardTitle>Attribution (Rule-based)</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">{JSON.stringify(attribution, null, 2)}</pre>
                  <div className="mt-3 text-xs text-gray-500">Recommendation JSON (structured)</div>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">{JSON.stringify(recommendation, null, 2)}</pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Hypothesis Generator (P2)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">operator_id</div>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={operatorId}
                        onChange={(e) => setOperatorId(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">confirm_token</div>
                      <input
                        className="w-full border rounded px-3 py-2 text-sm"
                        value={confirmToken}
                        onChange={(e) => setConfirmToken(e.target.value)}
                        placeholder="WRITE_CONFIRM_TOKEN"
                      />
                    </div>
                  </div>
                  <Button onClick={generateHypothesis} disabled={hypothesisLoading || !confirmToken.trim()}>
                    {hypothesisLoading ? 'Generating...' : 'Generate Hypothesis'}
                  </Button>
                  {hypothesisError && <div className="text-sm text-red-600">{hypothesisError}</div>}
                  {hypothesisResult && (
                    <pre className="text-xs font-mono break-all whitespace-pre-wrap bg-slate-100 p-3 rounded">
                      {JSON.stringify(hypothesisResult, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Draft – Not Saved</CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={copyDraft} variant="outline">
                        {copied ? 'Copied' : 'Copy Markdown'}
                      </Button>
                      <Button onClick={() => router.push(`/insight-candidate?exec_id=${encodeURIComponent(execIdFromUrl)}`)}>
                        Open Insight Candidate (Read-Only)
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                    {markdownDraft}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Outcome → Insight Review Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Evidence present in audit/result?
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Fallbacks explicitly explained?
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Causality trace complete in audit_log?
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
