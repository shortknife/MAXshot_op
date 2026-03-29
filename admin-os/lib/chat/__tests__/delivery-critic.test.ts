import { describe, expect, it } from 'vitest'

import { finalizeDelivery } from '@/lib/chat/delivery-critic'

describe('Step9 delivery critic', () => {
  it('passes normal business delivery', () => {
    const body = finalizeDelivery({
      success: true,
      data: {
        type: 'ops',
        summary: '已返回 3 组 Vault APY 数据。',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'ops_query',
          exit_type: 'answered',
          next_actions: ['继续问 TVL'],
        },
      },
    })

    expect(body.critic_decision).toMatchObject({ pass: true, outcome: 'deliver' })
    expect(body.delivery_envelope).toMatchObject({ type: 'ops', summary: '已返回 3 组 Vault APY 数据。' })
  })

  it('blocks mismatched qna delivery on business intent', () => {
    const body = finalizeDelivery({
      success: true,
      data: {
        type: 'qna',
        summary: '这是错误的业务回答形态。',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'ops_query',
          exit_type: 'answered',
        },
      },
    })

    expect(body.critic_decision).toMatchObject({ pass: false, outcome: 'block', reason: 'intent_delivery_mismatch' })
    expect(body.delivery_envelope).toMatchObject({ type: 'failure' })
  })

  it('downgrades clarification to clarify outcome', () => {
    const body = finalizeDelivery({
      success: false,
      data: {
        type: 'ops',
        summary: '你希望看哪个时间范围？',
        error: 'missing_required_clarification',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'ops_query',
          exit_type: 'needs_clarification',
        },
      },
    })

    expect(body.critic_decision).toMatchObject({ pass: false, outcome: 'clarify' })
    expect(body.delivery_envelope).toMatchObject({ type: 'ops' })
  })
})
