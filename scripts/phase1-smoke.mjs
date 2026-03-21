import {
  inferMarketingTagsFromQuery,
  computeFeedbackSummary,
  buildCycleReport,
} from '../lib/marketing/analytics.ts'

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
  // core checks: 12
  const t1 = inferMarketingTagsFromQuery('帮我写一条 linkedin 专业风 早上发的帖子')
  check('core-01 infer channel', t1.channel === 'linkedin')
  check('core-02 infer style', t1.style === 'professional')
  check('core-03 infer time window', t1.time_window === 'morning')

  const t2 = inferMarketingTagsFromQuery('写个小红书轻松文案')
  check('core-04 infer xiaohongshu', t2.channel === 'xiaohongshu')
  check('core-05 infer casual', t2.style === 'casual')
  const t3 = inferMarketingTagsFromQuery('write a post for X about product launch')
  check('core-05b infer x channel token', t3.channel === 'twitter')

  const f1 = computeFeedbackSummary({
    topic: '新品发布',
    style: 'professional',
    channel: 'linkedin',
    time_window: 'morning',
    impressions: 1000,
    interactions: 120,
    conversions: 30,
  })
  check('core-06 high tier', f1.performance_tier === 'high')
  check('core-07 high reason', f1.reason_code === 'high_performance')

  const f2 = computeFeedbackSummary({
    topic: '新品发布',
    style: 'professional',
    channel: 'linkedin',
    time_window: 'morning',
    impressions: 1000,
    interactions: 10,
    conversions: 0,
  })
  check('core-08 low tier', f2.performance_tier === 'low')
  check('core-09 low recommendation', f2.recommendations.length > 0)

  const report = buildCycleReport([
    { channel: 'linkedin', style: 'professional', topic: 'A', engagement_rate: 0.07, conversion_rate: 0.02 },
    { channel: 'linkedin', style: 'professional', topic: 'A', engagement_rate: 0.06, conversion_rate: 0.01 },
    { channel: 'twitter', style: 'casual', topic: 'B', engagement_rate: 0.02, conversion_rate: 0.0 },
  ])
  check('core-10 report total', report.total_feedback === 3)
  check('core-11 report top channel', report.top_channel === 'linkedin')
  check('core-12 report recommendations', Array.isArray(report.recommendations) && report.recommendations.length > 0)

  // API checks: 12
  const chat1 = await post('/api/chat/ask', { raw_query: '写一条关于新品发布的linkedin专业帖子，早上发' })
  check('api-01 chat marketing success', chat1.data?.success === true)
  check('api-02 chat has tags', chat1.data?.data?.meta?.tags?.channel === 'linkedin')
  check('api-02b draft has numbered structure', String(chat1.data?.data?.draft || '').includes('1.'))

  const chat2 = await post('/api/chat/ask', { rewrite_action: 'stronger_cta', draft: '测试内容' })
  check('api-03 rewrite stronger cta', String(chat2.data?.data?.draft || '').includes('现在就开始'))
  const chat3 = await post('/api/chat/ask', { rewrite_action: 'stronger_cta', draft: '【LinkedIn发布草稿】\n测试内容' })
  check('api-03b linkedin rewrite stronger cta', String(chat3.data?.data?.draft || '').toLowerCase().includes('template'))
  const chat4 = await post('/api/chat/ask', { raw_query: '写一条关于新品发布的小红书帖子' })
  check('api-03c xiaohongshu draft has hashtag', String(chat4.data?.data?.draft || '').includes('#'))
  const chat5 = await post('/api/chat/ask', { raw_query: 'Write a LinkedIn post about new product launch' })
  check('api-03d english query returns english draft', String(chat5.data?.data?.draft || '').includes('Post Draft'))

  const gate = await post('/api/entry/gate/check', {
    intent_name: 'marketing_gen',
    capability_binding: { capability_id: 'capability.content_generator' },
    execution_mode: 'deterministic',
    requester_id: 'admin',
    entry_channel: 'admin_os',
  })
  check('api-04 gate pass', gate.data?.gate_result === 'pass')
  const gateByMatch = await post('/api/entry/gate/check', {
    intent_name: 'business_query',
    matched_capability_ids: ['capability.data_fact_query'],
    slots: { scope: 'yield' },
    execution_mode: 'deterministic',
    requester_id: 'admin',
    entry_channel: 'admin_os',
  })
  check('api-04b gate pass by matched capability ids', gateByMatch.data?.gate_result === 'pass')
  check(
    'api-04c gate echoes primary capability binding',
    String(gateByMatch.data?.capability_binding?.capability_id || '') === 'capability.data_fact_query'
  )

  const create = await post('/api/intent/task/create', {
    entry_type: 'structured',
    entry_channel: 'admin_os',
    requester_id: 'admin',
    intent_name: 'marketing_gen',
    payload: {
      intent: 'marketing_gen',
      extracted_slots: { platform: 'linkedin', topic: '新品发布', tone: 'professional', template_id: 'marketing_basic' },
    },
    metadata: { raw_query: 'marketing smoke test' },
    require_confirmation: true,
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  const executionId = String(create.data?.execution_id || '')
  check('api-05 create marketing execution', create.data?.success === true && Boolean(executionId))
  const createByMatch = await post('/api/intent/task/create', {
    entry_type: 'structured',
    entry_channel: 'admin_os',
    requester_id: 'admin',
    matched_capability_ids: ['capability.content_generator'],
    payload: {
      extracted_slots: { topic: '新品发布', channel: 'linkedin' },
    },
    metadata: { raw_query: 'marketing matched capability smoke test' },
    require_confirmation: true,
    operator_id: 'admin',
    confirm_token: TOKEN,
  })
  check(
    'api-05b create execution by matched capability ids',
    createByMatch.data?.success === true && Boolean(createByMatch.data?.execution_id)
  )

  const feedbackBad = await post('/api/marketing/feedback', {
    execution_id: executionId || 'missing_execution_id',
    operator_id: 'admin',
    confirm_token: 'wrong_token',
    channel: 'linkedin',
    style: 'professional',
    topic: '新品发布',
    time_window: 'morning',
    impressions: 1000,
    interactions: 30,
    conversions: 8,
  })
  check('api-06 feedback invalid token blocked', feedbackBad.res.status === 403)

  const feedbackOk = await post('/api/marketing/feedback', {
    execution_id: executionId || 'missing_execution_id',
    operator_id: 'admin',
    confirm_token: TOKEN,
    channel: 'linkedin',
    style: 'professional',
    topic: '新品发布',
    time_window: 'morning',
    impressions: 1000,
    interactions: 80,
    conversions: 20,
  })
  check('api-07 feedback success', feedbackOk.data?.success === true)
  check('api-08 feedback has engagement rate', typeof feedbackOk.data?.feedback?.engagement_rate === 'number')

  const cycle = await get('/api/marketing/cycle-report?days=30')
  check('api-09 cycle report success', cycle.data?.success === true)
  check('api-10 cycle report has total', typeof cycle.data?.report?.total_feedback === 'number')
  check('api-11 cycle report has recommendations', Array.isArray(cycle.data?.report?.recommendations))

  if (!executionId) {
    check('api-12 feedback events persisted', false, 'missing execution id')
  } else {
    const exec = await get(`/api/execution/${executionId}`)
    const events = exec.data?.audit_steps || []
    const hasFeedback = events.some((item) => item?.event_type === 'marketing_feedback_recorded')
    const hasAttr = events.some((item) => item?.event_type === 'marketing_attribution_generated')
    check('api-12 feedback events persisted', hasFeedback && hasAttr)
  }

  console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

run().catch((error) => {
  console.error('Phase1 smoke crashed:', error)
  process.exit(1)
})
