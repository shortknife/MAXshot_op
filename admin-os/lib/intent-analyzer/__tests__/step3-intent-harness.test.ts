import { describe, expect, it } from 'vitest'
import { parseIntent } from '@/lib/intent-analyzer/intent-parsing'

function makeSessionContext(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    session_resolution: {
      session_id: 'step3-session',
      thread_action: 'continue',
      confidence: 1,
      resolution_reason: 'test_seed',
      store_policy: { load_existing_context: true, reset_previous_context: false, fork_from_session_id: null },
    },
    turn_relation: { type: 'continuation', confidence: 1, reason: 'test_seed', source: 'system' },
    conversation_context: {
      pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] },
      active_context: {
        scope: null,
        query_mode: null,
        metric: null,
        chain: null,
        protocol: null,
        vault_name: null,
        time_window_days: null,
        aggregation: null,
        exact_day: null,
        date_from: null,
        date_to: null,
        updated_at: null,
      },
      recent_turns_summary: [],
    },
    registry_context: {
      registry_id: 'capability_registry_op_v1',
      registry_version: '1.0.0',
      active_capability_ids: [
        'capability.data_fact_query',
        'capability.product_doc_qna',
        'capability.context_assembler',
        'capability.content_generator',
      ],
    },
    memory_runtime: { source_policy: 'router_context_only', ref_ids: [], memory_ref_count: 0 },
    effective_query: '',
    policy_decision: { inherit_context: true, clear_pending_clarification: false, override_fields: [], trigger_recall: false },
    effective_query_policy: { mode: 'pass_through', notes: 'test_seed' },
    recall: null,
    context_ready: true,
    ...overrides,
  })
}

describe('Step 3 intent harness', () => {
  it('keeps explicit month/week APY semantics', async () => {
    const result = await parseIntent('3月第一周的平均APY是多少')
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.scope).toBe('yield')
    expect(result.intent.extracted_slots?.metric).toBe('apy')
    expect(result.intent.extracted_slots?.aggregation ?? result.intent.extracted_slots?.metric_agg).toBe('avg')
    expect(result.intent.extracted_slots?.calendar_month).toBe(3)
    expect(result.intent.extracted_slots?.week_of_month).toBe(1)
    expect(result.intent.extracted_slots?.need_clarification).toBe(false)
  })

  it('keeps TVL metric identity for month-average query', async () => {
    const result = await parseIntent('2月份平均日tvl是多少')
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.metric).toBe('tvl')
    expect(result.intent.extracted_slots?.scope).toBe('vault')
    expect(result.intent.extracted_slots?.aggregation ?? result.intent.extracted_slots?.metric_agg).toBe('avg')
    expect(result.intent.extracted_slots?.calendar_month).toBe(2)
    expect(result.intent.extracted_slots?.need_clarification).toBe(false)
  })

  it('keeps exact-day rebalance follow-up semantics', async () => {
    const sessionContext = makeSessionContext({
      conversation_context: {
        pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] },
        active_context: {
          scope: 'yield',
          query_mode: 'metrics',
          metric: 'apy',
          chain: null,
          protocol: null,
          vault_name: null,
          time_window_days: null,
          aggregation: 'compare',
          exact_day: '2026-03-20',
          date_from: '2026-03-20',
          date_to: '2026-03-20',
          updated_at: Date.now(),
        },
        recent_turns_summary: [
          { role: 'user', content: '3月20日当天APY 最高和最低的vault 是那两个呢？' },
          { role: 'assistant', content: 'active_context: scope=yield; exact_day=2026-03-20; aggregation=compare' },
        ],
      },
    })
    const result = await parseIntent('当天有调仓的Action么？', sessionContext)
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.scope).toBe('rebalance')
    expect(result.intent.extracted_slots?.metric).toBe('rebalance_action')
    expect(result.intent.extracted_slots?.exact_day).toBe('2026-03-20')
    expect(result.intent.extracted_slots?.need_clarification).toBe(false)
  })

  it('keeps vault-list chain follow-up semantics', async () => {
    const sessionContext = makeSessionContext({
      conversation_context: {
        pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] },
        active_context: {
          scope: 'vault',
          query_mode: 'metrics',
          metric: 'vault_list',
          chain: 'arbitrum',
          protocol: null,
          vault_name: null,
          time_window_days: null,
          aggregation: null,
          exact_day: null,
          date_from: null,
          date_to: null,
          updated_at: Date.now(),
        },
        recent_turns_summary: [
          { role: 'user', content: '现在ARB 链上有那几个Vault？' },
          { role: 'assistant', content: 'active_context: scope=vault; metric=vault_list; chain=arbitrum' },
        ],
      },
    })
    const result = await parseIntent('Base 呢', sessionContext)
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.scope).toBe('vault')
    expect(result.intent.extracted_slots?.metric).toBe('vault_list')
  })

  it('routes capability overview to product_doc_qna', async () => {
    const result = await parseIntent('你能做什么业务呢？')
    expect(result.intent.type).toBe('general_qna')
    expect(result.intent.extracted_slots?.matched_capability_ids).toEqual(['capability.product_doc_qna'])
    expect(result.intent.extracted_slots?.matched_capability_id).toBe('capability.product_doc_qna')
    expect(result.intent.extracted_slots?.question_shape).toBe('capability_overview')
    expect(result.intent.extracted_slots?.need_clarification).toBe(false)
  })

  it('keeps generic product theory out of scope unless MAXshot is explicit', async () => {
    const result = await parseIntent('这个产品的核心原理是什么？')
    expect(result.intent.type).toBe('out_of_scope')
    expect(result.intent.extracted_slots?.matched_capability_ids).toEqual([])
    expect(result.intent.extracted_slots?.in_scope).toBe(false)
  })

  it('does not mark composite avg-plus-extremes query as ready semantics', async () => {
    const result = await parseIntent('3月份的APY均值是多少？最高和最低分别是多少？')
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.need_clarification).toBe(true)
    expect(result.intent.extracted_slots?.required_slots).toEqual(['primary_goal'])
    expect(result.intent.extracted_slots?.mvp_guard_reason).toBe('multi_goal_metric')
  })

  it('does not silently collapse cross-period delta ranking into a ready single-month query', async () => {
    const result = await parseIntent('2月份和3月份比较的话，那个vault TVL 提高最多呢？以当月最高的TVL计算即可！')
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots?.matched_capability_ids).toContain('capability.data_fact_query')
    expect(result.intent.extracted_slots?.need_clarification).toBe(true)
    expect(result.intent.extracted_slots?.required_slots).toEqual(['primary_goal'])
    expect(result.intent.extracted_slots?.mvp_guard_reason).toBe('cross_period_delta_ranking')
  })
})
