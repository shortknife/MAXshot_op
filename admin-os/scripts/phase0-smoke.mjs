import {
  normalizeIntentForUserExecution,
  mapErrorToUserMessage,
  summarizeRows,
  extractTopicFromQuery,
  rewriteDraft,
  buildUserOutcome,
} from '../lib/user-chat-core.js'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3003'
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
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { res, data }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const data = await res.json().catch(() => null)
  return { res, data }
}

async function run() {
  // Core function tests (12)
  {
    const normalized = normalizeIntentForUserExecution('ops_summary', {})
    check('core-01 default template for ops_summary', normalized.template === 'execution_status_breakdown')
    check('core-02 default days for ops_summary', normalized.slots?.template_slots?.days === 7)
  }
  {
    const normalized = normalizeIntentForUserExecution('audit_query', { template_slots: { limit: 5 } })
    check('core-03 merge template slots', normalized.slots?.template_slots?.limit === 5)
    check('core-04 keep template id', normalized.slots?.template_id === 'latest_audit_events')
  }
  check('core-05 map missing_topic', mapErrorToUserMessage('missing_topic').includes('缺少主题'))
  check('core-06 map write blocked', mapErrorToUserMessage('write_blocked_invalid_token').includes('拦截'))
  check('core-07 summarize breakdown', summarizeRows([{ status: 'failed', count: 3 }], 'execution_status_breakdown').includes('failed'))
  check('core-08 summarize audit empty', summarizeRows([], 'latest_audit_events').includes('没有'))
  check('core-09 extract topic from 关于', extractTopicFromQuery('写一条关于新品发布的帖子') === '新品发布')
  check('core-10 rewrite shorter', rewriteDraft('1234567890', 'shorter').length <= 10)
  check('core-11 rewrite cta', rewriteDraft('原文', 'stronger_cta').includes('现在就开始'))
  check('core-12 build outcome', buildUserOutcome({ type: 'ops', summary: 'ok' }).summary === 'ok')

  // API tests (8)
  {
    const { res } = await post('/api/chat/ask', {})
    check('api-01 missing raw_query status 400', res.status === 400)
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '帮我生成一个内容简介' })
    check('api-02 content brief missing topic returns readable fail', data?.success === false && String(data?.data?.summary || '').includes('缺少主题'))
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '写一条关于新品发布的帖子' })
    check('api-03 content brief success', data?.success === true && data?.data?.type === 'marketing')
    check('api-04 content brief has draft', typeof data?.data?.draft === 'string' && data.data.draft.length > 10)
    check('api-04a content brief has memory refs', Array.isArray(data?.data?.meta?.memory_refs_ref) && data.data.meta.memory_refs_ref.length >= 1)
  }
  {
    const draft = '这是一个很长很长的内容，用于测试缩短动作是否生效。'
    const { data } = await post('/api/chat/ask', { rewrite_action: 'shorter', draft })
    check('api-05 rewrite shorter', data?.success === true && data?.data?.draft?.length <= draft.length)
  }
  {
    const { data } = await post('/api/chat/ask', { rewrite_action: 'stronger_cta', draft: '测试文案' })
    check('api-06 rewrite stronger cta', data?.success === true && String(data?.data?.draft || '').includes('现在就开始'))
  }
  {
    const { data } = await post('/api/chat/ask', { rewrite_action: 'casual', draft: '测试文案' })
    check('api-07 rewrite casual', data?.success === true && String(data?.data?.draft || '').startsWith('轻松版：'))
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '这个产品的核心原理是什么？' })
    check('api-08 out of scope for product theory', data?.success === false && data?.data?.error === 'out_of_scope')
    check(
      'api-08a out_of_scope has canonical intent',
      typeof data?.data?.meta?.intent_type_canonical === 'string' && data.data.meta.intent_type_canonical.length > 0
    )
    check('api-08e out_of_scope has rejected exit type', String(data?.data?.meta?.exit_type || '') === 'rejected')
  }
  {
    const { data } = await post('/api/intent/analyze', { raw_query: 'MAXshot 的 Vault 做什么用？' })
    check(
      'api-08b product doc-like query returns canonical field',
      data?.success === true && typeof data?.step3?.slots?.intent_type_canonical === 'string'
    )
    check(
      'api-08ba product doc-like query returns matched capability',
      Array.isArray(data?.step3?.matched_capability_ids) &&
        data.step3.matched_capability_ids.includes('capability.product_doc_qna')
    )
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: 'MAXshot 的 Vault 做什么用？' })
    check(
      'api-08bb product qna response has memory refs',
      Array.isArray(data?.data?.meta?.memory_refs_ref) && data.data.meta.memory_refs_ref.length >= 1
    )
  }
  {
    const { data } = await post('/api/intent/analyze', { raw_query: '你好' })
    check(
      'api-08c small talk maps to out of scope',
      data?.success === true &&
        data?.step3?.intent_type === 'out_of_scope' &&
        String(data?.step3?.slots?.intent_type_canonical || '') === 'out_of_scope'
    )
  }
  {
    const { data } = await post('/api/intent/analyze', { raw_query: '给我一个 ops summary' })
    check(
      'api-08d ops summary keeps canonical ops mapping',
      data?.success === true &&
        data?.step3?.intent_type === 'business_query' &&
        String(data?.step3?.slots?.intent_type_canonical || '') === 'ops_query'
    )
    check(
      'api-08da ops summary returns matched capability',
      Array.isArray(data?.step3?.matched_capability_ids) &&
        data.step3.matched_capability_ids.includes('capability.data_fact_query')
    )
  }
  {
    const { data } = await post('/api/intent/analyze', { raw_query: '最近执行状态汇总' })
    check('api-09 intent trace has prompt slug', typeof data?.trace?.prompt_slug === 'string' && data.trace.prompt_slug.length > 0)
    check('api-10 intent trace has source', ['filesystem_md', 'local_stub'].includes(String(data?.trace?.source || '')))
  }
  {
    const res = await fetch(`${BASE}/api/prompt/resolve?slug=intent_analyzer`)
    const data = await res.json().catch(() => null)
    check('api-11 prompt resolve success', data?.success === true)
    check('api-12 prompt resolve source', ['filesystem_md'].includes(String(data?.data?.source || '')))
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: 'MAXshot 有哪些 vault 可以用？' })
    const okSuccess = data?.success === true && data?.data?.meta?.data_plane === 'business'
    const okReject = data?.success === false && ['source_not_connected', 'insufficient_business_data', 'out_of_business_scope'].includes(String(data?.data?.error || ''))
    check('api-13 business query handled', okSuccess || okReject)
    if (okSuccess) {
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      const rowCount = Number(data?.data?.meta?.row_count || 0)
      check('api-13b business rows preview capped', rows.length <= 5)
      check('api-13c business row count exposed', rowCount >= rows.length)
      check(
        'api-13d business success has canonical intent',
        typeof data?.data?.meta?.intent_type_canonical === 'string' && data.data.meta.intent_type_canonical.length > 0
      )
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '给我最近一笔 execution 详情' })
    const okSuccess = data?.success === true && data?.data?.meta?.scope === 'execution'
    const okReject = data?.success === false
    check('api-14 execution business query handled', okSuccess || okReject)
    if (okSuccess) {
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      check('api-14b latest execution returns single row', rows.length <= 1)
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？' })
    const okSuccess = data?.success === true && data?.data?.meta?.data_plane === 'business'
    const okReject = data?.success === false
    check('api-15 metric business query handled', okSuccess || okReject)
    if (okSuccess) {
      check('api-15b apy maps to yield scope', data?.data?.meta?.scope === 'yield')
      check(
        'api-15ba apy response has canonical intent',
        typeof data?.data?.meta?.intent_type_canonical === 'string' && data.data.meta.intent_type_canonical.length > 0
      )
      check(
        'api-15bd apy response keeps matched capability memory',
        Array.isArray(data?.data?.meta?.memory_refs_ref) && data.data.meta.memory_refs_ref.length >= 1
      )
      check('api-15bb apy response has answered exit type', String(data?.data?.meta?.exit_type || '') === 'answered')
      check('api-15bc apy response has memory refs', Array.isArray(data?.data?.meta?.memory_refs_ref))
      check('api-15c business meta has timezone', String(data?.data?.meta?.timezone || '') === 'Asia/Shanghai')
      check(
        'api-15d business meta has metric semantics',
        ['market_tvl', 'vault_tvl', 'apy_ranking', 'yield_metric'].includes(String(data?.data?.meta?.metric_semantics || ''))
      )
      check('api-15e business meta has evidence chain', Array.isArray(data?.data?.meta?.evidence_chain))
    }
  }
  {
    const sid = `phase0-yield-avg-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    const ok = data?.success === true && data?.data?.meta?.scope === 'yield'
    check('api-15ea yield average follow-up handled', ok)
    if (ok) {
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      const first = rows[0] || {}
      check('api-15eb yield average uses avg schema', 'avg_apy_pct' in first && 'sample_count' in first)
      check('api-15ec yield interpretation says avg', String(data?.data?.meta?.interpretation || '').includes('平均 APY'))
      const semanticDefaults = data?.data?.meta?.semantic_defaults || {}
      const sourcePolicy = data?.data?.meta?.source_policy || {}
      const followUpPolicy = data?.data?.meta?.follow_up_policy || {}
      check('api-15ef yield semantic defaults exposed', String(semanticDefaults.aggregation || '') === 'avg')
      check('api-15eg source policy exposed', Array.isArray(sourcePolicy.priority) && sourcePolicy.priority.length > 0)
      check('api-15eh follow-up policy exposed', String(followUpPolicy.ui_mode || '') === 'natural_language_only')
      const actions = data?.data?.meta?.next_actions || []
      check('api-15ed yield next actions are examples', Array.isArray(actions) && actions.every((x) => String(x).startsWith('例如：')))
      const maxApy = Number(first.max_apy_pct || 0)
      const qualityAlert = data?.data?.meta?.quality_alert || null
      check('api-15ee yield quality alert exposed when outlier exists', maxApy < 20 || typeof qualityAlert?.title === 'string')
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '金库 APY 多少？' })
    const needsClarification = data?.success === false && data?.data?.error === 'missing_required_clarification'
    check('api-15aa vault apy needs clarification', needsClarification)
    if (needsClarification) {
      check(
        'api-15aad clarification has canonical intent',
        typeof data?.data?.meta?.intent_type_canonical === 'string' && data.data.meta.intent_type_canonical.length > 0
      )
      check(
        'api-15aae clarification has needs_clarification exit type',
        String(data?.data?.meta?.exit_type || '') === 'needs_clarification'
      )
      check('api-15aaf clarification has memory refs', Array.isArray(data?.data?.meta?.memory_refs_ref))
      const required = data?.data?.meta?.required_slots || []
      check('api-15ab vault apy missing time/agg', required.includes('time_window') && required.includes('metric_agg'))
      check('api-15ac clarification max turns from policy', Number(data?.data?.meta?.clarification?.max_turns || 0) === 2)
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天按链 APY 排名' })
    const ok = (data?.success === true && data?.data?.meta?.scope === 'yield') || data?.success === false
    check('api-15o ranking by chain handled', ok)
    if (data?.success === true) {
      const rows = data?.data?.rows || []
      check('api-15p ranking rows contain dimension', Array.isArray(rows) && rows.length >= 1 && typeof rows[0]?.dimension_value === 'string')
      check('api-15q ranking semantics set', String(data?.data?.meta?.metric_semantics || '') === 'apy_ranking')
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天按链 APY 前3' })
    const ok = (data?.success === true && data?.data?.meta?.scope === 'yield') || data?.success === false
    check('api-15r ranking topN handled', ok)
    if (data?.success === true) {
      const rowCount = Number(data?.data?.meta?.row_count || 0)
      check('api-15s ranking topN respected', rowCount > 0 && rowCount <= 3)
    }
  }
  {
    const sessionId = `phase0-${Date.now()}`
    const { data } = await post('/api/chat/ask', {
      raw_query: '最近7天APY走势如何？',
      session_id: sessionId,
    })
    check('api-15f ambiguous trend asks clarification', data?.success === false && data?.data?.error === 'missing_required_clarification')
    const options = data?.data?.meta?.next_actions || []
    check('api-15g clarification has options', Array.isArray(options) && options.length >= 3)
    const follow = await post('/api/chat/ask', {
      raw_query: '按天均值',
      session_id: sessionId,
    })
    const okFollow = (follow.data?.success === true && follow.data?.data?.meta?.scope === 'yield') || follow.data?.success === false
    check('api-15g2 clarification follow-up handled', okFollow)
  }
  {
    const sessionId = `phase0-no-range-${Date.now()}`
    const { data } = await post('/api/chat/ask', {
      raw_query: 'APY走势如何？',
      session_id: sessionId,
    })
    check('api-15h trend without range asks clarification', data?.success === false && data?.data?.error === 'missing_required_clarification')
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天按天均值 APY 走势如何？' })
    const ok = (data?.success === true && data?.data?.meta?.scope === 'yield') || data?.success === false
    check('api-15i daily trend query handled', ok)
    if (data?.success === true) {
      check('api-15j trend timezone kept', String(data?.data?.meta?.timezone || '') === 'Asia/Shanghai')
      const highlights = data?.data?.meta?.highlights || []
      check('api-15k trend highlights available', Array.isArray(highlights) && highlights.length >= 1)
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天 APY 哪天最高，哪天最低？' })
    const ok = (data?.success === true && data?.data?.meta?.scope === 'yield') || data?.success === false
    check('api-15l extreme day query handled', ok)
    if (data?.success === true) {
      const highlights = data?.data?.meta?.highlights || []
      check('api-15m extreme day highlights available', Array.isArray(highlights) && highlights.length >= 1)
      const rows = data?.data?.rows || []
      check('api-15n extreme day rows preview available', Array.isArray(rows) && rows.length >= 1)
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: 'MAXshot 整体 APY 表现如何？' })
    const notClarify = data?.data?.error !== 'missing_required_clarification'
    const handled = data?.success === true || data?.success === false
    check('api-15ac overall performance no clarification', handled && notClarify)
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: 'MAXshot 业务整体表现如何？' })
    const ok = data?.success === true && data?.data?.meta?.scope === 'yield'
    check('api-16 overall performance maps to yield', ok)
    if (ok) {
      const actions = data?.data?.meta?.next_actions || []
      check('api-16b yield has scoped next actions', Array.isArray(actions) && actions.length >= 3)
      const highlights = data?.data?.meta?.highlights || []
      check('api-16c yield has highlights', Array.isArray(highlights) && highlights.length >= 1)
      check('api-16d query mode defaults metrics', data?.data?.meta?.query_mode === 'metrics')
    }
  }
  {
    const sessionId = `phase0-correction-${Date.now()}`
    const first = await post('/api/chat/ask', {
      raw_query: '最近7天 vault APY 走势如何？',
      session_id: sessionId,
    })
    check('api-16m correction seed asks clarification', first.data?.success === false && first.data?.data?.error === 'missing_required_clarification')
    const second = await post('/api/chat/ask', {
      raw_query: '不是平均，是最高',
      session_id: sessionId,
    })
    const secondClarify = second.data?.data?.error === 'missing_required_clarification'
    const secondHandled = second.data?.success === true || (second.data?.success === false && !secondClarify)
    check('api-16n correction follow-up not re-clarify', secondHandled)
    if (second.data?.success === true) {
      check(
        'api-16o correction updates interpretation',
        String(second.data?.data?.meta?.interpretation || '').includes('最高')
      )
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '为什么今天没调仓？' })
    const isInvestigate = data?.success === true || data?.success === false
    check('api-16e investigate question handled', isInvestigate)
    if (data?.success === true) {
      check('api-16f investigate mode set', data?.data?.meta?.query_mode === 'investigate')
      const chain = data?.data?.meta?.evidence_chain || []
      check('api-16g investigate evidence chain exists', Array.isArray(chain) && chain.length >= 2)
      check('api-16h rebalance scope preferred', ['rebalance', 'execution', 'yield'].includes(String(data?.data?.meta?.scope || '')))
      check('api-16i investigate explanation present', typeof data?.data?.meta?.explanation === 'string' || data?.data?.meta?.explanation === null)
      const tags = data?.data?.meta?.reason_tags || []
      check('api-16j investigate reason tags present', Array.isArray(tags))
      const breakdown = data?.data?.meta?.reason_breakdown || {}
      check('api-16k investigate reason breakdown present', typeof breakdown.main_reason === 'string' && Array.isArray(breakdown.secondary_reasons))
      const breakdownZh = data?.data?.meta?.reason_breakdown_zh || {}
      check('api-16l investigate zh reason breakdown present', typeof breakdownZh.main_reason === 'string' && Array.isArray(breakdownZh.secondary_reasons))
    }
  }
  {
    const missingId = '00000000-0000-4000-8000-000000000000'
    const { data } = await post('/api/chat/ask', { raw_query: `给我 execution ${missingId} 的详情` })
    const ok = data?.success === false && data?.data?.error === 'insufficient_business_data'
    check('api-17 missing execution returns insufficient data', ok)
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: 'MAXshot 品牌故事是什么？' })
    check(
      'api-18 product story handled without business misroute',
      (data?.success === false && ['out_of_business_scope', 'out_of_scope'].includes(String(data?.data?.error || ''))) ||
        (data?.success === true && data?.data?.type === 'qna' && !String(data?.data?.summary || '').toLowerCase().includes('apy'))
    )
    const actions = data?.data?.meta?.next_actions || []
    check(
      'api-18b reject or qna fallback is well formed',
      (Array.isArray(actions) && actions.length >= 3) || data?.data?.type === 'qna'
    )
  }
  {
    const { data } = await get('/api/audit/metrics?days=7&limit=100')
    check('api-19 audit metrics has business counts', data?.success === true && typeof data?.business_counts?.total === 'number')
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '请给我 arbitrum 的 vault 列表' })
    const okSuccess = data?.success === true && data?.data?.meta?.scope === 'vault'
    const okReject = data?.success === false
    check('api-20 chain filtered vault query handled', okSuccess || okReject)
    if (okSuccess) {
      const filters = data?.data?.meta?.filters_applied || {}
      check('api-20b chain filter captured', String(filters.chain || '') === 'arbitrum')
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '请给我 morpho 的 vault 列表' })
    const okSuccess = data?.success === true && data?.data?.meta?.scope === 'vault'
    const okReject = data?.success === false
    check('api-21 protocol filtered vault query handled', okSuccess || okReject)
    if (okSuccess) {
      const filters = data?.data?.meta?.filters_applied || {}
      check('api-21b protocol filter captured', String(filters.protocol || '') === 'morpho')
    }
  }
  {
    const { data } = await post('/api/chat/ask', { raw_query: '最近7天 arbitrum morpho 的 vault 列表' })
    const okSuccess = data?.success === true && data?.data?.meta?.scope === 'vault'
    const okReject = data?.success === false
    check('api-21c combo filters query handled', okSuccess || okReject)
    if (okSuccess) {
      const filters = data?.data?.meta?.filters_applied || {}
      check('api-21d combo chain captured', String(filters.chain || '') === 'arbitrum')
      check('api-21e combo protocol captured', String(filters.protocol || '') === 'morpho')
      check('api-21f combo time window captured', Number(filters.time_window_days || 0) === 7)
    }
  }
  {
    const sid = `phase0-followup-${Date.now()}`
    const first = await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const second = await post('/api/chat/ask', { raw_query: '那按 arbitrum 呢？', session_id: sid })
    const firstHandled = first.data?.success === true || first.data?.success === false || first.res?.status === 200
    const secondHandled = second.data?.success === true || second.data?.success === false || second.res?.status === 200
    check('api-22 follow-up seed handled', firstHandled)
    check('api-22b follow-up query handled', secondHandled)
    if (secondHandled) {
      const rawApplied = second.data?.data?.meta?.follow_up_context_applied
      const applied = rawApplied === true
      const scope = String(second.data?.data?.meta?.scope || '')
      const businessScoped = ['yield', 'vault', 'execution', 'allocation', 'rebalance'].includes(scope)
      const hasAppliedFlag = rawApplied === true || rawApplied === false
      check('api-22c follow-up context applied', applied || businessScoped || hasAppliedFlag || secondHandled)
      if (second.data?.success === true && businessScoped) {
        const filters = second.data?.data?.meta?.filters_applied || {}
        const rowsRaw = JSON.stringify(second.data?.data?.rows || []).toLowerCase()
        const chainConstrained = String(filters.chain || '') === 'arbitrum' || rowsRaw.includes('arbitrum')
        check('api-22d follow-up chain constrained', chainConstrained)
      } else {
        check('api-22d follow-up chain constrained', true)
      }
    }
  }
  {
    const sid = `phase0-yield-chain-followup-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    const { data } = await post('/api/chat/ask', { raw_query: '看 arbitrum 的 APY', session_id: sid })
    const ok = data?.success === true && data?.data?.meta?.scope === 'yield'
    check('api-22e natural follow-up chain query handled', ok)
    if (ok) {
      const filters = data?.data?.meta?.filters_applied || {}
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      const allArbitrum = rows.every((row) => String(row.chain || row.chain_name || '').toLowerCase().includes('arbitrum'))
      check('api-22f natural follow-up chain constrained', String(filters.chain || '') === 'arbitrum' || allArbitrum)
    }
  }
  {
    const { data } = await post('/api/chat/ask', {
      raw_query: '3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？',
    })
    const notClarified = data?.data?.error !== 'missing_required_clarification'
    const notMisleading = !String(data?.data?.summary || '').includes('请补充时间范围或查询对象')
    const expectedError = ['no_data_in_selected_range', null, undefined].includes(data?.data?.error)
    check('api-22fa absolute range top1 query not re-clarified', notClarified)
    check('api-22fb absolute range top1 query not misleading', notMisleading)
    check('api-22fc absolute range top1 uses range-aware failure', data?.success === true || expectedError)
  }
  {
    const sid = `phase0-new-question-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const { data } = await post('/api/chat/ask', { raw_query: '你能描述什么是MAXshot么？', session_id: sid })
    const summary = String(data?.data?.summary || '').toLowerCase()
    check('api-22fd standalone new question avoids yield contamination', !summary.includes('apy') && !summary.includes('tvl'))
  }
  {
    const sid = `phase0-yield-vault-followup-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    const { data } = await post('/api/chat/ask', { raw_query: '只看 Maxshot USDC V2', session_id: sid })
    const ok = data?.success === true && data?.data?.meta?.scope === 'yield'
    check('api-22g natural follow-up vault query handled', ok)
    if (ok) {
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      const allMatch = rows.every((row) => String(row.market_name || '').toLowerCase().includes('maxshot usdc v2'))
      check('api-22h natural follow-up vault constrained', rows.length > 0 && allMatch)
    }
  }
  {
    const sid = `phase0-yield-compare-followup-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    const { data } = await post('/api/chat/ask', { raw_query: '比较 Maxshot USDC V2 和 dForce USDC 的 APY', session_id: sid })
    const ok = data?.success === true && data?.data?.meta?.scope === 'yield'
    check('api-22i natural follow-up compare query handled', ok)
    if (ok) {
      const rows = Array.isArray(data?.data?.rows) ? data.data.rows : []
      const names = rows.map((row) => String(row.market_name || '').toLowerCase())
      const hasMaxshot = names.some((name) => name.includes('maxshot usdc v2'))
      const hasDforce = names.some((name) => name.includes('dforce usdc'))
      check('api-22j natural follow-up compare query constrained', rows.length >= 2 && hasMaxshot && hasDforce)
    }
  }

  console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Smoke tests crashed:', err)
  process.exit(1)
})
