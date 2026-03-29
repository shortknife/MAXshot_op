import { describe, it } from 'vitest'
import { parseIntent } from '@/lib/intent-analyzer/intent-parsing'

function makeSessionContext(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    session_resolution: {
      session_id: 'prompt-eval-session',
      thread_action: 'continue',
      confidence: 1,
      resolution_reason: 'test_seed',
      store_policy: { load_existing_context: true, reset_previous_context: false, fork_from_session_id: null },
    },
    turn_relation: { type: 'continuation', confidence: 1, reason: 'test_seed', source: 'system' },
    conversation_context: {
      pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] },
      active_context: { scope: null, query_mode: null, chain: null, protocol: null, vault_name: null, time_window_days: null, aggregation: null, updated_at: null },
      recent_turns_summary: [],
    },
    registry_context: {
      registry_id: 'capability_registry_op_v1',
      registry_version: '1.0.0',
      active_capability_ids: ['capability.data_fact_query','capability.product_doc_qna','capability.context_assembler','capability.content_generator'],
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

async function logCase(label: string, query: string, sessionContext?: string) {
  const result = await parseIntent(query, sessionContext)
  console.log(JSON.stringify({ label, query, intent_type: result.intent.type, slots: result.intent.extracted_slots, confidence: result.intent.confidence, prompt_meta: result.prompt_meta }, null, 2))
}

describe('prompt eval temp', () => {
  it('case1', async () => { await logCase('1', '3月第一周的平均APY是多少') }, 45000)
  it('case2', async () => { await logCase('2', '2月份平均日tvl是多少') }, 45000)
  it('case3a', async () => { await logCase('3a', '3月20日当天APY 最高和最低的vault 是那两个呢？') }, 45000)
  it('case3b', async () => { await logCase('3b', '那其TVL多少呢？', makeSessionContext({ conversation_context: { pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] }, active_context: { scope: 'yield', query_mode: 'metrics', chain: null, protocol: null, vault_name: null, time_window_days: null, aggregation: 'compare', updated_at: Date.now() }, recent_turns_summary: [{ role: 'user', content: '3月20日当天APY 最高和最低的vault 是那两个呢？' }, { role: 'assistant', content: 'active_context: scope=yield; query_mode=metrics; exact_day=2026-03-20; aggregation=compare' }] } })) }, 45000)
  it('case3c', async () => { await logCase('3c', '当天有调仓的Action么？', makeSessionContext({ conversation_context: { pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] }, active_context: { scope: 'yield', query_mode: 'metrics', chain: null, protocol: null, vault_name: null, time_window_days: null, aggregation: 'compare', updated_at: Date.now() }, recent_turns_summary: [{ role: 'user', content: '3月20日当天APY 最高和最低的vault 是那两个呢？' }, { role: 'assistant', content: 'active_context: scope=yield; query_mode=metrics; exact_day=2026-03-20; aggregation=compare' }] } })) }, 45000)
  it('case4a', async () => { await logCase('4a', '现在ARB 链上有那几个Vault？') }, 45000)
  it('case4b', async () => { await logCase('4b', 'Base 呢', makeSessionContext({ conversation_context: { pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] }, active_context: { scope: 'vault', query_mode: 'metrics', chain: 'arbitrum', protocol: null, vault_name: null, time_window_days: null, aggregation: null, updated_at: Date.now() }, recent_turns_summary: [{ role: 'user', content: '现在ARB 链上有那几个Vault？' }, { role: 'assistant', content: 'active_context: scope=vault; query_mode=metrics; chain=arbitrum' }] } })) }, 45000)
  it('case4c', async () => { await logCase('4c', 'Sol呢？', makeSessionContext({ conversation_context: { pending_clarification: { exists: false, turns: 0, original_query: null, scope: null, missing_slots: [] }, active_context: { scope: 'vault', query_mode: 'metrics', chain: 'base', protocol: null, vault_name: null, time_window_days: null, aggregation: null, updated_at: Date.now() }, recent_turns_summary: [{ role: 'user', content: '现在ARB 链上有那几个Vault？' }, { role: 'assistant', content: 'active_context: scope=vault; query_mode=metrics; chain=base' }] } })) }, 45000)
  it('case5', async () => { await logCase('5', '你能做什么业务呢？') }, 45000)
})
