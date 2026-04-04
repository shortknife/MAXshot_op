import { describe, expect, it } from 'vitest'

import { extractRuntimeCostEvent } from '@/lib/runtime-cost/extract'

describe('runtime cost extract', () => {
  it('extracts cost event with estimated cost', () => {
    const event = extractRuntimeCostEvent({
      entry: { raw_query: '你能做什么业务呢？' },
      resultBody: {
        success: true,
        data: {
          type: 'qna',
          meta: {
            answer_meta: {
              fallback_required: false,
              review_required: false,
            },
            verification: {
              outcome: 'pass',
            },
          },
        },
      },
      statusCode: 200,
      runtimeMeta: {
        session_id: 's1',
        customer_id: 'maxshot',
        requester_id: null,
        entry_channel: 'web',
        intent_type: 'general_qna',
        intent_type_canonical: 'general_qna',
        primary_capability_id: 'capability.product_doc_qna',
        matched_capability_ids: ['capability.product_doc_qna'],
        source_plane: 'product_docs',
        step3_tokens_used: 120,
        model_source: 'filesystem_md',
        model_prompt_slug: 'intent_analyzer',
        verification_outcome: 'pass',
      },
      durationMs: 820,
    })

    expect(event.tokens_used).toBe(120)
    expect(event.estimated_cost_usd).toBeGreaterThan(0)
    expect(event.verification_outcome).toBe('pass')
    expect(event.source_plane).toBe('product_docs')
    expect(event.customer_id).toBe('maxshot')
  })
})
