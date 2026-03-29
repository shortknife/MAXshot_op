'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { READ_ONLY_DEMO, WRITE_ENABLED } from '@/lib/demo-data'
import { AppNav } from '@/components/app-nav'
import { humanizeOpsError, humanizeWriteBlockedReason } from '@/lib/ui/error-messages'

export default function OpsRequestPage() {
  const router = useRouter()
  const [entryType, setEntryType] = useState<'raw_query' | 'structured'>('raw_query')
  const [rawQuery, setRawQuery] = useState('')
  const [intentName, setIntentName] = useState('ops_query')
  const [slotsJson, setSlotsJson] = useState('{\"metric\":\"apy\"}')
  const [useTemplate, setUseTemplate] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [templateSlotsJson, setTemplateSlotsJson] = useState('{}')
  const [previewSql, setPreviewSql] = useState('')
  const [previewParams, setPreviewParams] = useState<string>('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; examples?: Record<string, unknown>[] }[]>([])
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [intentResult, setIntentResult] = useState<{ type: string; extracted_slots: Record<string, unknown>; confidence?: number } | null>(null)
  const [intentTrace, setIntentTrace] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operatorId, setOperatorId] = useState('admin')
  const [confirmToken, setConfirmToken] = useState('')
  useEffect(() => {
    let mounted = true
    fetch('/api/sql-templates/list')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return
        const fileTemplates = Array.isArray(data?.data?.file) ? data.data.file : []
        const templates = Array.isArray(data?.templates) ? data.templates : fileTemplates
        if (Array.isArray(templates)) {
          setTemplates(templates)
          if (!templateId && templates.length > 0) {
            setTemplateId(templates[0].id)
          }
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [templateId])

  useEffect(() => {
    if (useTemplate) {
      setIntentName('ops_query')
    }
  }, [useTemplate])

  const [writeApproved, setWriteApproved] = useState(false)
  const writeBlockedReason = !WRITE_ENABLED
    ? 'WRITE_DISABLED'
    : !operatorId.trim()
      ? 'MISSING_OPERATOR'
      : !confirmToken.trim()
        ? 'MISSING_CONFIRM_TOKEN'
        : !writeApproved
          ? 'WRITE_NOT_APPROVED'
          : null
  const quickCases = [
    { label: 'Vault 列表', raw: 'MAXshot 有哪些 vault 可以用？' },
    { label: 'APY 查询', raw: '当前 vault APY 怎么样？' },
    { label: '执行详情', raw: '给我最近一笔 execution 详情' },
    { label: '状态汇总', raw: '最近执行状态汇总' },
  ]


  const mapTemplateError = (message: string) => {
    if (message.startsWith('missing_slot')) return '缺少必要参数'
    if (message.startsWith('invalid_enum')) return '参数值不在允许范围'
    if (message.startsWith('invalid_number')) return '参数数字格式错误'
    if (message.startsWith('invalid_json')) return 'JSON 参数格式错误'
    if (message === 'limit_too_large') return 'limit 过大，请减少数量'
    if (message === 'invalid_limit') return 'limit 必须 > 0'
    if (message === 'sql_table_not_allowed') return 'SQL 使用了未授权的数据表'
    if (message === 'sql_select_into') return 'SQL 含 SELECT INTO，已禁止'
    if (message === 'sql_multi_statement') return 'SQL 含多语句，已禁止'
    if (message === 'sql_contains_write') return 'SQL 含写操作关键字，已禁止'
    return message
  }

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
      const step3 = data.step3 || null
      const extractedSlots = step3?.slots || {}
      setIntentName(step3?.intent_type || 'ops_query')
      setSlotsJson(JSON.stringify(extractedSlots, null, 2))
      if (step3?.intent_type) {
        setIntentResult({
          type: step3.intent_type,
          extracted_slots: extractedSlots,
          confidence: step3.confidence,
        })
      } else {
        setIntentResult(null)
      }
      setIntentTrace(data.trace || null)
    } catch (e) {
      setError(humanizeOpsError(e instanceof Error ? e.message : 'Analyze failed'))
    } finally {
      setLoading(false)
    }
  }


  const handlePreview = async () => {
    setPreviewError(null)
    setPreviewSql('')
    setPreviewParams('')
    try {
      const templateSlots = JSON.parse(templateSlotsJson || '{}')
      const res = await fetch('/api/sql-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, template_slots: templateSlots }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || 'preview_failed')
      }
      setPreviewSql(data.sql || '')
      setPreviewParams(JSON.stringify(data.params || [], null, 2))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'preview_failed'
      setPreviewError(mapTemplateError(msg))
    }
  }

  const applyExample = (example: Record<string, unknown>) => {
    setTemplateSlotsJson(JSON.stringify(example || {}, null, 2))
  }
  const submitRequest = async () => {
    if (READ_ONLY_DEMO) return
    setLoading(true)
    setError(null)
    setExecutionId(null)
    setStatus(null)
    try {
      let slots = JSON.parse(slotsJson || '{}')
      if (useTemplate) {
        const templateSlots = JSON.parse(templateSlotsJson || '{}')
        slots = { template_id: templateId, template_slots: templateSlots }
      }
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
      if (!['pass', 'require_confirmation'].includes(String(gate.gate_result || ''))) {
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
          gate,
          require_confirmation: gate.require_confirmation === true,
          confirmation_request: gate.require_confirmation
            ? (gate.confirmation_request || { reason: 'human_approval_required', message: 'Requires human confirmation' })
            : null,
          reason_for_pending: gate.require_confirmation ? (gate.reason_for_pending || 'human_approval_required') : null,
          operator_id: operatorId.trim(),
          confirm_token: confirmToken.trim(),
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) {
        const raw = created.error || created.details || 'Create execution failed'
        throw new Error(mapTemplateError(raw))
      }
      setExecutionId(created.execution_id)
      setStatus(gate.require_confirmation ? 'pending_confirmation' : 'created')
    } catch (e) {
      setError(humanizeOpsError(e instanceof Error ? e.message : 'Request failed'))
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
            <AppNav current="ops" />
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickCases.map((c) => (
                    <Button key={c.label} size="sm" variant="outline" onClick={() => setRawQuery(c.raw)} disabled={READ_ONLY_DEMO || loading}>
                      {c.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-2">
                  <Button variant="outline" onClick={analyzeRawQuery} disabled={READ_ONLY_DEMO || loading || !rawQuery.trim()}>
                    Analyze Intent
                  </Button>
                </div>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">Intent Demo (Natural Language → Intent)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRawQuery('最近 7 天各状态执行数量')} disabled={READ_ONLY_DEMO}>ops_summary 示例</Button>
                    <Button variant="outline" size="sm" onClick={() => setRawQuery('最近的审计事件有哪些？')} disabled={READ_ONLY_DEMO}>audit_query 示例</Button>
                    <Button variant="outline" size="sm" onClick={() => setRawQuery('列出最近的 insight memory')} disabled={READ_ONLY_DEMO}>memory_query 示例</Button>
                    <Button variant="outline" size="sm" onClick={() => setRawQuery('帮我生成一个内容简介')} disabled={READ_ONLY_DEMO}>content_brief 示例</Button>
                    <Button variant="outline" size="sm" onClick={() => setRawQuery('这个产品的核心原理是什么？')} disabled={READ_ONLY_DEMO}>product_qna 示例</Button>
                  </div>
                  {intentResult && (
                    <div className="rounded border bg-gray-50 p-3 space-y-2">
                      <div className="font-medium">Parsed Intent</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(intentResult, null, 2)}</pre>
                    </div>
                  )}
                  {intentTrace && (
                    <div className="rounded border bg-gray-50 p-3 space-y-2">
                      <div className="font-medium">Trace</div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(intentTrace, null, 2)}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">Demo Journey (User Path)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="text-gray-600">
                    建议顺序：Entry → Confirm → Run → Outcome → Audit
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/confirmations')}>Confirmations</Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/operations')}>Operations</Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/outcome')}>Outcome</Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/audit')}>Audit</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} />
                  <span className="font-medium">Use SQL Template (Read-only)</span>
                </div>
                {useTemplate && (
                  <div className="space-y-3">
                    <div>
                      <Label>template_id</Label>
                      <Select value={templateId} onValueChange={(v) => setTemplateId(v)} disabled={READ_ONLY_DEMO}>
                        <SelectTrigger>
                          <SelectValue placeholder="template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((tmpl) => (
                            <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>template_slots (JSON)</Label>
                      <Textarea value={templateSlotsJson} onChange={(e) => setTemplateSlotsJson(e.target.value)} className="font-mono text-sm" rows={6} disabled={READ_ONLY_DEMO} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handlePreview} disabled={!templateId || READ_ONLY_DEMO}>Preview SQL</Button>
                      {useTemplate && templates.find(t => t.id === templateId)?.examples?.map((ex, idx) => (
                        <Button key={idx} variant="outline" onClick={() => applyExample(ex as any)}>示例 {idx + 1}</Button>
                      ))}
                    </div>
                    {previewError && (
                      <p className="text-xs text-red-600">{previewError}</p>
                    )}
                    {previewSql && (
                      <div className="rounded border bg-gray-50 p-3 text-xs">
                        <div className="font-semibold mb-1">Rendered SQL</div>
                        <pre className="whitespace-pre-wrap">{previewSql}</pre>
                        {previewParams && (
                          <div className="mt-2">
                            <div className="font-semibold mb-1">Params</div>
                            <pre className="whitespace-pre-wrap">{previewParams}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>intent_name</Label>
                  <Input value={intentName} onChange={(e) => setIntentName(e.target.value)} disabled={READ_ONLY_DEMO || useTemplate} />
                </div>
                <div>
                  <Label>slots (JSON)</Label>
                  <Textarea value={slotsJson} onChange={(e) => setSlotsJson(e.target.value)} className="font-mono text-sm" rows={6} disabled={READ_ONLY_DEMO} />
                </div>
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
              {!READ_ONLY_DEMO && (
                <p className="text-xs text-gray-500">
                  Current write state: {writeBlockedReason ? `blocked (${humanizeWriteBlockedReason(writeBlockedReason)})` : 'ready'}
                </p>
              )}
              <Button onClick={submitRequest} disabled={READ_ONLY_DEMO || !WRITE_ENABLED || !writeApproved || !confirmToken.trim() || !operatorId.trim() || loading}>
                Create Execution
              </Button>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {executionId && (
                <div className="text-sm">
                  <p>execution_id: <span className="font-mono">{executionId}</span></p>
                  <p>status: {status}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/confirmations')}>
                      Go Confirm
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/operations')}>
                      Go Run
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/outcome?exec_id=${executionId}`)}>
                      Go Outcome
                    </Button>
                  </div>
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
