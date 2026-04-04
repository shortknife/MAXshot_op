import { describe, expect, it } from 'vitest'

import { deriveLearningAssets, renderLearningAssetMarkdown } from '@/lib/interaction-learning/derivation'

describe('interaction learning derivation', () => {
  it('derives hard cases, capability candidates, customer profiles, and prompt policy issues', () => {
    const snapshot = deriveLearningAssets([
      {
        log_id: 'l1', created_at: '2026-04-04T10:00:00.000Z', session_id: 's1', requester_id: 'u1', entry_channel: 'web', customer_id: 'maxshot', raw_query: 'What does pro plan include?', effective_query: null, intent_type: 'general_qna', intent_type_canonical: 'general_qna', primary_capability_id: 'capability.faq_answering', matched_capability_ids: ['capability.faq_answering'], source_plane: 'faq_kb', answer_type: 'review', success: true, status_code: 200, fallback_required: false, review_required: true, clarification_required: false, confidence: 0.42, summary: 'low confidence', query_mode: null, scope: null,
        meta: { prompt_policy: { reason: 'execution_prompt_required' } },
      },
      {
        log_id: 'l2', created_at: '2026-04-04T09:00:00.000Z', session_id: 's2', requester_id: 'u2', entry_channel: 'web', customer_id: 'maxshot', raw_query: 'Explain Nexa core', effective_query: null, intent_type: 'general_qna', intent_type_canonical: 'general_qna', primary_capability_id: 'capability.product_doc_qna', matched_capability_ids: ['capability.product_doc_qna'], source_plane: 'product_doc', answer_type: 'answered', success: true, status_code: 200, fallback_required: false, review_required: false, clarification_required: false, confidence: 0.9, summary: 'ok', query_mode: 'qna', scope: null,
        meta: { prompt_policy: { outcome: 'allow' } },
      },
      {
        log_id: 'l3', created_at: '2026-04-04T08:00:00.000Z', session_id: 's3', requester_id: 'u3', entry_channel: 'web', customer_id: 'ops-observer', raw_query: '最近7天APY走势', effective_query: null, intent_type: 'business_query', intent_type_canonical: 'ops_query', primary_capability_id: 'capability.data_fact_query', matched_capability_ids: ['capability.data_fact_query'], source_plane: 'ops_data', answer_type: 'clarification', success: true, status_code: 200, fallback_required: false, review_required: false, clarification_required: true, confidence: 0.6, summary: 'need aggregation', query_mode: 'trend', scope: 'yield',
        meta: { prompt_policy: { outcome: 'allow' } },
      },
    ], 'supabase')

    expect(snapshot.totals.interactions).toBe(3)
    expect(snapshot.hard_cases).toHaveLength(2)
    expect(snapshot.capability_candidates[0]?.primary_capability_id).toBeTruthy()
    expect(snapshot.customer_profiles[0]?.customer_id).toBe('maxshot')
    expect(snapshot.prompt_policy_issues[0]).toMatchObject({ reason: 'execution_prompt_required', count: 1 })

    const markdown = renderLearningAssetMarkdown(snapshot)
    expect(markdown).toContain('# Nexa Learning Asset Snapshot')
    expect(markdown).toContain('execution_prompt_required')
    expect(markdown).toContain('capability.product_doc_qna')
  })
})
