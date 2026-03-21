'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'
import { READ_ONLY_DEMO, WRITE_ENABLED } from '@/lib/demo-data'
import { AppNav } from '@/components/app-nav'
import { humanizeMarketingError, humanizeWriteBlockedReason } from '@/lib/ui/error-messages'

const MARKETING_STATE_KEY = 'maxshot_marketing_console_state_v1'

function formatRate(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${(n * 100).toFixed(2)}%`
}

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
  const [operatorId, setOperatorId] = useState('admin')
  const [confirmToken, setConfirmToken] = useState('')
  const [writeApproved, setWriteApproved] = useState(false)
  const [feedbackExecutionId, setFeedbackExecutionId] = useState('')
  const [feedbackChannel, setFeedbackChannel] = useState('twitter')
  const [feedbackStyle, setFeedbackStyle] = useState('professional')
  const [feedbackTopic, setFeedbackTopic] = useState('product update')
  const [feedbackTimeWindow, setFeedbackTimeWindow] = useState('all_day')
  const [impressions, setImpressions] = useState('1000')
  const [interactions, setInteractions] = useState('60')
  const [conversions, setConversions] = useState('12')
  const [feedbackResult, setFeedbackResult] = useState<Record<string, unknown> | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [reportDays, setReportDays] = useState('7')
  const [cycleReport, setCycleReport] = useState<Record<string, unknown> | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionAt, setActionAt] = useState<string | null>(null)
  const writeBlockedReason = !WRITE_ENABLED
    ? 'WRITE_DISABLED'
    : !operatorId.trim()
      ? 'MISSING_OPERATOR'
      : !confirmToken.trim()
        ? 'MISSING_CONFIRM_TOKEN'
        : !writeApproved
          ? 'WRITE_NOT_APPROVED'
          : null

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MARKETING_STATE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (typeof saved.platform === 'string') setPlatform(saved.platform)
      if (typeof saved.topic === 'string') setTopic(saved.topic)
      if (typeof saved.tone === 'string') setTone(saved.tone)
      if (typeof saved.templateId === 'string') setTemplateId(saved.templateId)
      if (typeof saved.operatorId === 'string') setOperatorId(saved.operatorId)
      if (typeof saved.writeApproved === 'boolean') setWriteApproved(saved.writeApproved)
      if (typeof saved.reportDays === 'string') setReportDays(saved.reportDays)
      if (typeof saved.feedbackChannel === 'string') setFeedbackChannel(saved.feedbackChannel)
      if (typeof saved.feedbackStyle === 'string') setFeedbackStyle(saved.feedbackStyle)
      if (typeof saved.feedbackTopic === 'string') setFeedbackTopic(saved.feedbackTopic)
      if (typeof saved.feedbackTimeWindow === 'string') setFeedbackTimeWindow(saved.feedbackTimeWindow)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MARKETING_STATE_KEY,
        JSON.stringify({
          platform,
          topic,
          tone,
          templateId,
          operatorId,
          writeApproved,
          reportDays,
          feedbackChannel,
          feedbackStyle,
          feedbackTopic,
          feedbackTimeWindow,
        })
      )
    } catch {
      // ignore
    }
  }, [
    platform,
    topic,
    tone,
    templateId,
    operatorId,
    writeApproved,
    reportDays,
    feedbackChannel,
    feedbackStyle,
    feedbackTopic,
    feedbackTimeWindow,
  ])

  const submitRequest = async () => {
    if (READ_ONLY_DEMO) return
    setLoading(true)
    setError(null)
    setActionMessage(null)
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
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) {
        throw new Error(created.error || created.details || 'Create execution failed')
      }
      setExecutionId(created.execution_id)
      setStatus(gate.require_confirmation ? 'pending_confirmation' : 'created')
      setActionMessage(`Execution created: ${created.execution_id}`)
      setActionAt(new Date().toISOString())
    } catch (e) {
      setError(humanizeMarketingError(e instanceof Error ? e.message : 'Request failed'))
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (READ_ONLY_DEMO) return
    setFeedbackLoading(true)
    setFeedbackError(null)
    setFeedbackResult(null)
    setActionMessage(null)
    try {
      const res = await fetch('/api/marketing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: feedbackExecutionId.trim(),
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
          channel: feedbackChannel,
          style: feedbackStyle,
          topic: feedbackTopic,
          time_window: feedbackTimeWindow,
          impressions: Number(impressions || '0'),
          interactions: Number(interactions || '0'),
          conversions: Number(conversions || '0'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'feedback_failed')
      setFeedbackResult(data.feedback || null)
      setActionMessage('Feedback recorded')
      setActionAt(new Date().toISOString())
    } catch (e) {
      setFeedbackError(humanizeMarketingError(e instanceof Error ? e.message : 'feedback_failed'))
    } finally {
      setFeedbackLoading(false)
    }
  }

  const loadCycleReport = async () => {
    setReportLoading(true)
    setReportError(null)
    setCycleReport(null)
    setActionMessage(null)
    try {
      const days = encodeURIComponent(reportDays.trim() || '7')
      const res = await fetch(`/api/marketing/cycle-report?days=${days}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'cycle_report_failed')
      setCycleReport(data.report || null)
      setActionMessage(`Cycle report generated (${reportDays}d)`)
      setActionAt(new Date().toISOString())
    } catch (e) {
      setReportError(humanizeMarketingError(e instanceof Error ? e.message : 'cycle_report_failed'))
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Marketing Request</h1>
            <AppNav current="marketing" />
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

          {!READ_ONLY_DEMO && !WRITE_ENABLED && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 text-sm text-red-800">
                Write mode disabled. Set NEXT_PUBLIC_WRITE_ENABLE=true and provide confirm token to create entries.
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
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setPlatform('xiaohongshu')
                  setTopic('新品发布')
                  setTone('casual')
                  setTemplateId('marketing_basic')
                }}>
                  Fill Create A
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setPlatform('linkedin')
                  setTopic('产品更新')
                  setTone('professional')
                  setTemplateId('marketing_basic')
                }}>
                  Fill Create B
                </Button>
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

              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>operator_id</Label>
                  <Input value={operatorId} onChange={(e) => setOperatorId(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>confirm_token</Label>
                  <Input value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="WRITE_CONFIRM_TOKEN" disabled={READ_ONLY_DEMO} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={writeApproved} onChange={(e) => setWriteApproved(e.target.checked)} />
                <span>I confirm this is an approved write action</span>
              </div>
              <Button onClick={submitRequest} disabled={READ_ONLY_DEMO || !WRITE_ENABLED || !writeApproved || !confirmToken.trim() || !operatorId.trim() || loading}>
                Create Execution
              </Button>
              {!READ_ONLY_DEMO && (
                <p className="text-xs text-gray-500">
                  Current write state: {writeBlockedReason ? `blocked (${humanizeWriteBlockedReason(writeBlockedReason)})` : 'ready'}
                </p>
              )}
              {actionMessage && (
                <p className="text-xs text-emerald-700">
                  {actionMessage}{actionAt ? ` @ ${new Date(actionAt).toLocaleString()}` : ''}
                </p>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {executionId && (
                <div className="text-sm">
                  <p>execution_id: <span className="font-mono">{executionId}</span></p>
                  <p>status: {status}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(executionId)
                        setActionMessage(`execution_id copied: ${executionId}`)
                        setActionAt(new Date().toISOString())
                      } catch {
                        setError('复制 execution_id 失败')
                      }
                    }}
                  >
                    Copy execution_id
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setFeedbackExecutionId(executionId)}
                  >
                    Use This execution_id For Feedback
                  </Button>
                  <Button variant="link" onClick={() => router.push(`/audit?exec_id=${executionId}`)}>
                    View Audit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback Recorder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>execution_id</Label>
                  <Input
                    value={feedbackExecutionId}
                    onChange={(e) => setFeedbackExecutionId(e.target.value)}
                    placeholder="execution_id"
                    disabled={READ_ONLY_DEMO}
                  />
                </div>
                <div>
                  <Label>channel</Label>
                  <Input value={feedbackChannel} onChange={(e) => setFeedbackChannel(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>style</Label>
                  <Input value={feedbackStyle} onChange={(e) => setFeedbackStyle(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>topic</Label>
                  <Input value={feedbackTopic} onChange={(e) => setFeedbackTopic(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>time_window</Label>
                  <Input value={feedbackTimeWindow} onChange={(e) => setFeedbackTimeWindow(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>impressions</Label>
                  <Input value={impressions} onChange={(e) => setImpressions(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>interactions</Label>
                  <Input value={interactions} onChange={(e) => setInteractions(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
                <div>
                  <Label>conversions</Label>
                  <Input value={conversions} onChange={(e) => setConversions(e.target.value)} disabled={READ_ONLY_DEMO} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setFeedbackChannel('xiaohongshu')
                  setFeedbackStyle('casual')
                  setFeedbackTopic('新品发布')
                  setFeedbackTimeWindow('evening')
                  setImpressions('1200')
                  setInteractions('96')
                  setConversions('16')
                }}>
                  Fill Example A
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setFeedbackChannel('linkedin')
                  setFeedbackStyle('professional')
                  setFeedbackTopic('产品更新')
                  setFeedbackTimeWindow('morning')
                  setImpressions('3000')
                  setInteractions('90')
                  setConversions('24')
                }}>
                  Fill Example B
                </Button>
              </div>

              <Button onClick={submitFeedback} disabled={READ_ONLY_DEMO || !WRITE_ENABLED || !feedbackExecutionId.trim() || !confirmToken.trim() || feedbackLoading}>
                {feedbackLoading ? 'Recording...' : 'Record Feedback'}
              </Button>
              {feedbackError && <p className="text-sm text-red-600">{feedbackError}</p>}
              {feedbackResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="text-xs text-slate-500">Engagement Rate</div>
                    <div className="text-lg font-semibold">{formatRate(feedbackResult.engagement_rate)}</div>
                  </div>
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="text-xs text-slate-500">Conversion Rate</div>
                    <div className="text-lg font-semibold">{formatRate(feedbackResult.conversion_rate)}</div>
                  </div>
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="text-xs text-slate-500">Tier</div>
                    <div className="text-lg font-semibold">{String(feedbackResult.performance_tier || '-')}</div>
                  </div>
                  <div className="rounded border p-3 bg-slate-50 md:col-span-3">
                    <div className="text-xs text-slate-500 mb-1">Recommendations</div>
                    <ul className="list-disc pl-5">
                      {Array.isArray(feedbackResult.recommendations) && feedbackResult.recommendations.map((x) => (
                        <li key={String(x)}>{String(x)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cycle Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>days</Label>
                <Input value={reportDays} onChange={(e) => setReportDays(e.target.value)} />
              </div>
              <Button variant="outline" onClick={loadCycleReport} disabled={reportLoading}>
                {reportLoading ? 'Generating...' : 'Generate Report'}
              </Button>
              {reportError && <p className="text-sm text-red-600">{reportError}</p>}
              {cycleReport && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded border p-3 bg-slate-50">
                      <div className="text-xs text-slate-500">Total Feedback</div>
                      <div className="text-lg font-semibold">{String(cycleReport.total_feedback || 0)}</div>
                    </div>
                    <div className="rounded border p-3 bg-slate-50">
                      <div className="text-xs text-slate-500">Avg Engagement</div>
                      <div className="text-lg font-semibold">{formatRate(cycleReport.avg_engagement_rate)}</div>
                    </div>
                    <div className="rounded border p-3 bg-slate-50">
                      <div className="text-xs text-slate-500">Avg Conversion</div>
                      <div className="text-lg font-semibold">{formatRate(cycleReport.avg_conversion_rate)}</div>
                    </div>
                    <div className="rounded border p-3 bg-slate-50">
                      <div className="text-xs text-slate-500">Top Channel</div>
                      <div className="text-lg font-semibold">{String(cycleReport.top_channel || '-')}</div>
                    </div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-slate-500 mb-1">Recommendations</div>
                    <ul className="list-disc pl-5">
                      {Array.isArray(cycleReport.recommendations) && cycleReport.recommendations.map((x) => (
                        <li key={String(x)}>{String(x)}</li>
                      ))}
                    </ul>
                  </div>
                  <details className="text-xs bg-slate-100 p-3 rounded">
                    <summary className="cursor-pointer">查看原始报告 JSON</summary>
                    <pre className="overflow-auto max-h-72 mt-2">{JSON.stringify(cycleReport, null, 2)}</pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
