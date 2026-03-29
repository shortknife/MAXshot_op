import { buildExecutionHypotheses, summarizeHypothesisPortfolio } from '../lib/evolution/hypothesis.ts'
import { validateRouterAuditContract } from '../lib/router/audit-contract.ts'
import { readFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3003'
const TOKEN = process.env.WRITE_CONFIRM_TOKEN || 'test123'
let passed = 0
let failed = 0

function check(name, condition, details = '') {
  if (condition) {
    passed += 1
    console.log(`PASS ${name}`)
  } else {
    failed += 1
    console.error(`FAIL ${name}${details ? ` - ${details}` : ''}`)
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return { res, data }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const data = await res.json().catch(() => null)
  return { res, data }
}

async function run() {
  // Core: 10 checks
  const failedHyp = buildExecutionHypotheses({
    execution_id: 'x1',
    status: 'failed',
    result: {
      capability_outputs: [
        { capability_id: 'content_generator', status: 'failed', error: 'missing_topic' },
      ],
    },
  })
  check('core-01 failed hypothesis exists', failedHyp.length >= 1)
  check('core-02 failed trigger', failedHyp.some((h) => h.trigger_signal === 'capability_failed'))

  const fallbackHyp = buildExecutionHypotheses({
    execution_id: 'x2',
    status: 'completed',
    result: {
      capability_outputs: [
        { capability_id: 'product_doc_qna', status: 'success', evidence: { fallback_reason: 'missing_doc_path' } },
      ],
    },
  })
  check('core-03 fallback hypothesis', fallbackHyp.some((h) => h.trigger_signal === 'fallback_detected'))

  const nominalHyp = buildExecutionHypotheses({
    execution_id: 'x3',
    status: 'completed',
    result: { capability_outputs: [{ capability_id: 'data_fact_query', status: 'success' }] },
  })
  check('core-04 nominal hypothesis', nominalHyp.some((h) => h.trigger_signal === 'nominal'))

  const summary = summarizeHypothesisPortfolio([...failedHyp, ...fallbackHyp, ...nominalHyp])
  check('core-05 summary total', summary.total === failedHyp.length + fallbackHyp.length + nominalHyp.length)
  check('core-06 summary has top', typeof summary.top_title === 'string')
  check('core-07 confidence counts', summary.confidence_breakdown.high + summary.confidence_breakdown.medium + summary.confidence_breakdown.low === summary.total)
  check('core-08 hypothesis has id', failedHyp.every((h) => String(h.hypothesis_id).startsWith('hyp_')))
  check('core-09 hypothesis has action', failedHyp.every((h) => Boolean(h.suggested_action)))
  check('core-10 hypothesis has outcome', failedHyp.every((h) => Boolean(h.expected_outcome)))
  const registry = JSON.parse(readFileSync(new URL('../app/configs/capability-registry/capability_registry_v1.json', import.meta.url), 'utf8'))
  const publisher = Array.isArray(registry?.capabilities)
    ? registry.capabilities.find((item) => item?.capability_id === 'capability.publisher')
    : null
  check('core-11 publisher inactive in registry', publisher?.lifecycle === 'inactive')

  // API checks
  const create = await post('/api/intent/task/create', {
    entry_type: 'raw_query',
    entry_channel: 'admin_os',
    requester_id: 'admin',
    intent_name: 'content_brief',
    payload: { intent: 'content_brief', extracted_slots: {} },
    metadata: { raw_query: '生成一个内容简介' },
    require_confirmation: true,
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  const executionId = String(create.data?.execution_id || '')
  check('api-01 create execution', create.data?.success === true && Boolean(executionId))

  const confirm = await post('/api/execution/confirm', {
    execution_id: executionId,
    decision: 'confirm',
    actor_id: 'admin',
    actor_role: 'admin',
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  check(
    'api-02 confirm execution',
    confirm.data?.success === true || String(confirm.data?.error || '').includes('already')
  )

  const runExec = await post('/api/execution/run', {
    execution_id: executionId,
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  check('api-03 run execution', runExec.data?.success === true)
  check('api-04 run result failed as expected', runExec.data?.result?.success === false)

  const hypoBad = await post('/api/evolution/hypothesis', {
    execution_id: executionId,
    operator_id: 'admin',
    confirm_token: 'wrong-token',
  })
  check('api-05 hypothesis invalid token blocked', hypoBad.res.status === 403)

  const hypoOk = await post('/api/evolution/hypothesis', {
    execution_id: executionId,
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  check('api-06 hypothesis success', hypoOk.data?.success === true)
  check('api-07 hypothesis has items', Array.isArray(hypoOk.data?.hypotheses) && hypoOk.data.hypotheses.length > 0)

  const report = await get('/api/evolution/hypothesis-report?days=30')
  check('api-08 report success', report.data?.success === true)
  check('api-09 report has events', Number(report.data?.total_hypothesis_events || 0) >= 1)

  const execution = await get(`/api/execution/${executionId}`)
  const events = execution.data?.audit_steps || []
  check('api-10 event persisted', events.some((e) => e?.event_type === 'hypothesis_generated'))
  const decompositionEvent = events.find((e) => e?.event_type === 'task_decomposed')
  check(
    'api-11 audit has intent_name',
    events.some((e) => typeof e?.data?.intent_name === 'string' && e.data.intent_name.length > 0)
  )
  check(
    'api-12 audit has memory_refs_ref',
    Array.isArray(decompositionEvent?.data?.memory_refs_ref) || events.some((e) => Array.isArray(e?.data?.memory_refs_ref))
  )
  check(
    'api-12b audit includes capability registry refs',
    Array.isArray(decompositionEvent?.data?.memory_refs_ref) &&
      decompositionEvent.data.memory_refs_ref.some((ref) => String(ref).includes('capability_registry'))
  )
  check(
    'api-13 audit has canonical event type',
    events.some((e) => typeof e?.event_type_canonical === 'string' && e.event_type_canonical.length > 0)
  )
  check(
    'api-14 audit has step status',
    events.some((e) => typeof e?.data?.step_status === 'string' && e.data.step_status.length > 0)
  )
  check(
    'api-15 capability audit has elapsed',
    events.some(
      (e) =>
        e?.event_type === 'capability_executed' &&
        typeof e?.data?.elapsed_ms === 'number' &&
        e.data.elapsed_ms >= 0
    )
  )
  const auditContract = validateRouterAuditContract(events)
  check('api-16 audit contract passed', auditContract.passed, auditContract.errors.join(','))
  const causality = await get(`/api/causality?execution_id=${executionId}`)
  check('api-17 causality success', causality.res.status === 200 && Array.isArray(causality.data?.timeline))
  check(
    'api-18 causality timeline has canonical type',
    Array.isArray(causality.data?.timeline) &&
      causality.data.timeline.every(
        (item) =>
          item &&
          (item.event_type_canonical === null || typeof item.event_type_canonical === 'string')
      )
  )
  const lineage = await get(`/api/lineage?execution_id=${executionId}`)
  check('api-19 lineage success', lineage.res.status === 200 && Array.isArray(lineage.data?.nodes))
  check('api-20 lineage has edges', Array.isArray(lineage.data?.edges))

  const gateTooMany = await post('/api/entry/gate/check', {
    intent_name: 'business_query',
    matched_capability_ids: [
      'capability.data_fact_query',
      'capability.product_doc_qna',
      'capability.content_generator',
      'capability.context_assembler',
    ],
    execution_mode: 'hybrid',
    slots: {},
  })
  check(
    'api-21 gate blocks too many capability matches',
    gateTooMany.data?.gate_result === 'continue_chat' && gateTooMany.data?.reason === 'too_many_capability_matches'
  )

  const createTooMany = await post('/api/intent/task/create', {
    entry_type: 'raw_query',
    entry_channel: 'admin_os',
    requester_id: 'admin',
    intent_name: 'business_query',
    matched_capability_ids: [
      'capability.data_fact_query',
      'capability.product_doc_qna',
      'capability.content_generator',
      'capability.context_assembler',
    ],
    payload: {
      intent: 'business_query',
      extracted_slots: {},
    },
    metadata: { raw_query: '测试过多 capability 命中' },
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  check(
    'api-22 task create rejects too many capability matches',
    createTooMany.res.status === 400 && createTooMany.data?.error === 'too_many_capability_matches'
  )

  console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

run().catch((error) => {
  console.error('Phase2 smoke crashed:', error)
  process.exit(1)
})
