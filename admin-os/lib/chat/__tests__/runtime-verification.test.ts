import { describe, expect, it } from 'vitest'

import { applyRuntimeVerification, evaluateRuntimeVerification } from '@/lib/chat/runtime-verification'

describe('runtime verification', () => {
  it('marks low-confidence faq answers for review', () => {
    const decision = evaluateRuntimeVerification({
      success: true,
      data: {
        type: 'qna',
        summary: 'Maybe this is the answer.',
        meta: {
          intent_type: 'general_qna',
          intent_type_canonical: 'general_qna',
          exit_type: 'answered',
          answer_meta: {
            capability_id: 'capability.faq_answering',
            confidence: 0.42,
            citations: [],
            fallback_required: false,
            review_required: false,
          },
        },
      },
    })

    expect(decision.outcome).toBe('review')
    expect(decision.reason).toBe('qna_low_confidence')
  })

  it('passes verified business answers when critic passes', () => {
    const body = applyRuntimeVerification({
      success: true,
      data: {
        type: 'ops',
        summary: '已返回 3 组 Vault APY 数据。',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'business_query',
          exit_type: 'answered',
          data_plane: 'business',
          row_count: 3,
          critic_decision: {
            pass: true,
            outcome: 'accept',
            reason: null,
          },
        },
      },
    })

    expect((body as { verification_decision: { outcome: string } }).verification_decision.outcome).toBe('pass')
    expect(((body as { data: { meta: { verification: { outcome: string } } } }).data.meta.verification.outcome)).toBe('pass')
  })


  it('marks prompt policy review as verification review', () => {
    const decision = evaluateRuntimeVerification({
      success: true,
      data: {
        type: 'qna',
        summary: 'Answer',
        meta: {
          intent_type: 'general_qna',
          intent_type_canonical: 'general_qna',
          exit_type: 'answered',
          prompt_policy: {
            outcome: 'review',
            reason: 'intent_local_stub_not_allowed',
          },
        },
      },
    })

    expect(decision.outcome).toBe('review')
    expect(decision.reason).toBe('intent_local_stub_not_allowed')
  })

  it('preserves clarification as a verification outcome', () => {
    const decision = evaluateRuntimeVerification({
      success: false,
      data: {
        type: 'ops',
        error: 'missing_required_clarification',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'business_query',
          exit_type: 'needs_clarification',
        },
      },
    })

    expect(decision.outcome).toBe('clarify')
    expect(decision.reason).toBe('needs_clarification')
  })
})
