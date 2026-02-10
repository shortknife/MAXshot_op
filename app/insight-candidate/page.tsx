"use client"

import { useEffect, useMemo, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { READ_ONLY_DEMO, getDemoSnapshotById } from '@/lib/demo-data'
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
  evidence?: { sources?: unknown[]; fallback_reason?: string }
  metadata?: { fallback_reason?: string }
}

type AuditEvent = { event_type?: string; timestamp?: string; data?: Record<string, unknown> }

export default function InsightCandidatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const execIdFromUrl = searchParams.get('exec_id') || ''
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(!!execIdFromUrl)
  const [error, setError] = useState<string | null>(null)
  const [copiedJson, setCopiedJson] = useState(false)
  const [copiedMd, setCopiedMd] = useState(false)

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

  const markdown = useMemo(() => {
    if (!candidate) return ''
    const headerComment = '// Draft Export Only – Not Saved to DB – No Write-back to Router – For Human Review Only'
    return [
      headerComment,
      `# Insight Candidate (Draft Only)`,
      ``,
      `source_execution_id: ${candidate.source_execution_id}`,
      ``,
      `## Execution Fields`,
      '```json',
      JSON.stringify(candidate.execution_fields ?? {}, null, 2),
      '```',
      ``,
      `## Capability Path`,
      '```json',
      JSON.stringify(candidate.capability_path ?? [], null, 2),
      '```',
    ].join('\n')
  }, [candidate])

  const copyJson = async () => {
    if (!candidate) return
    const headerComment = '// Draft Export Only – Not Saved to DB – No Write-back to Router – For Human Review Only'
    await navigator.clipboard.writeText(`${headerComment}\n${JSON.stringify(candidate, null, 2)}`)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1500)
  }

  const copyMarkdown = async () => {
    if (!candidate) return
    await navigator.clipboard.writeText(markdown)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 1500)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Insight Candidate Export</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/insight-review?exec_id=${encodeURIComponent(execIdFromUrl)}`)}>
                Back to Review
              </Button>
              <Button variant="outline" onClick={() => router.push(`/outcome?exec_id=${encodeURIComponent(execIdFromUrl)}`)}>
                Outcome Snapshot
              </Button>

              <Button variant="outline" onClick={() => router.push(`/insight-writeback?exec_id=${encodeURIComponent(execIdFromUrl)}`)}>
                Insight Write-Back
              </Button>

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

          {!loading && candidate && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Insight Candidate (JSON)</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={copyJson}>{copiedJson ? 'Copied' : 'Copy JSON'}</Button>
                      <Button variant="outline" onClick={copyMarkdown}>{copiedMd ? 'Copied' : 'Copy Markdown'}</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">
                    {`// Draft Export Only – Not Saved to DB – No Write-back to Router – For Human Review Only\n${JSON.stringify(candidate, null, 2)}`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Markdown Export</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs font-mono break-all whitespace-pre-wrap">{markdown}</pre>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
