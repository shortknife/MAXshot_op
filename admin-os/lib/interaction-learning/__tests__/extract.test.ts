import { describe, expect, it } from 'vitest'
import { extractInteractionLearningPayload } from '@/lib/interaction-learning/extract'

describe('extractInteractionLearningPayload', () => {
  it('extracts business query payload', () => {
    const payload = extractInteractionLearningPayload({
      entry: {
        raw_query: '最近7天按链 APY 排名',
        session_id: 'sess-1',
        entry_channel: 'web_app',
        requester_id: 'user-1',
      },
      statusCode: 200,
      resultBody: {
        success: true,
        data: {
          summary: '已返回按链 APY 排名。',
          meta: {
            intent_type: 'ops_query',
            intent_type_canonical: 'ops_query',
            data_plane: 'business',
            scope: 'yield',
            query_mode: 'metrics',
            matched_capability_ids: ['capability.data_fact_query'],
            exit_type: 'answered',
            query_contract: { scope: 'yield', completeness: { ready: true } },
          },
        },
      },
    })

    expect(payload.primary_capability_id).toBe('capability.data_fact_query')
    expect(payload.source_plane).toBe('business')
    expect(payload.answer_type).toBe('answered')
    expect(payload.scope).toBe('yield')
  })

  it('extracts faq review payload', () => {
    const payload = extractInteractionLearningPayload({
      entry: {
        raw_query: 'What does the pro plan include?',
        entry_channel: 'web_app',
      },
      statusCode: 200,
      resultBody: {
        success: true,
        data: {
          summary: 'This answer requires manual review.',
          meta: {
            intent_type: 'faq_query',
            intent_type_canonical: 'qna',
            exit_type: 'answered',
            answer_meta: {
              capability_id: 'capability.faq_qa_review',
              confidence: 0.24,
              fallback_required: true,
              review_required: true,
              review_payload: { review_id: 'faq-review-1' },
            },
          },
        },
      },
    })

    expect(payload.primary_capability_id).toBe('capability.faq_qa_review')
    expect(payload.source_plane).toBe('faq_kb')
    expect(payload.answer_type).toBe('review')
    expect(payload.review_required).toBe(true)
    expect(payload.fallback_required).toBe(true)
  })
})
