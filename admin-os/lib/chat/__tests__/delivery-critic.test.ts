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

  it('fills fallback summary and next actions when upstream delivery is sparse', () => {
    const failed = finalizeDelivery({
      success: false,
      data: {
        type: 'ops',
        summary: '',
        error: 'no_data_in_selected_range',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'ops_query',
          exit_type: 'rejected',
          next_actions: [],
        },
      },
    })

    expect(failed.delivery_envelope.summary).toBe('该时间区间内未检索到足够业务数据，暂时无法给出可靠结论。')
    expect(failed.data.summary).toBe('该时间区间内未检索到足够业务数据，暂时无法给出可靠结论。')

    const clarification = finalizeDelivery({
      success: false,
      data: {
        type: 'ops',
        summary: '请补充查询条件',
        error: 'missing_required_clarification',
        meta: {
          intent_type: 'business_query',
          intent_type_canonical: 'ops_query',
          exit_type: 'needs_clarification',
          next_actions: [],
        },
      },
    })

    expect(clarification.delivery_envelope.meta.next_actions).toEqual([
      '请给出时间范围',
      '请指定查询对象',
      '请说明希望的统计口径',
    ])
    expect(clarification.data.meta.next_actions).toEqual([
      '请给出时间范围',
      '请指定查询对象',
      '请说明希望的统计口径',
    ])
  })

  it('preserves marketing draft on canonical delivery envelope', () => {
    const body = finalizeDelivery({
      success: true,
      data: {
        type: 'marketing',
        summary: '已生成草稿，你可以继续改写语气或缩短长度。',
        draft: 'draft body',
        meta: {
          intent_type: 'marketing_gen',
          intent_type_canonical: 'marketing_gen',
          exit_type: 'draft_generated',
          next_actions: ['点击缩短'],
        },
      },
    })

    expect(body.delivery_envelope).toMatchObject({
      type: 'marketing',
      draft: 'draft body',
    })
  })
})
