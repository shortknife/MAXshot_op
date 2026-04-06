import { describe, expect, it } from 'vitest'

import { finalizeDelivery } from '@/lib/chat/delivery-critic'
import type { CustomerDeliveryPosture } from '@/lib/customers/delivery'
import type { CustomerClarificationPosture } from '@/lib/customers/clarification'

const demoClarificationPosture: CustomerClarificationPosture = {
  customer_id: 'nexa-demo',
  clarification_version: '1',
  clarification_style: 'guided',
  option_style: 'guided',
  summary: 'demo',
  question_prefix: '补一个关键上下文，我就继续把这个流程解释完整。',
  default_actions: ['补一个更具体的上下文', '继续追问这个工作流', '切换到当前 customer workspace'],
  file_path: 'customer-assets/nexa-demo/clarification.md',
}

const demoDeliveryPosture: CustomerDeliveryPosture = {
  customer_id: 'nexa-demo',
  delivery_version: '1',
  summary_style: 'explainer',
  next_action_style: 'guided',
  review_copy_style: 'customer',
  citation_density: 'balanced',
  default_next_actions: ['继续追问这个工作流', '打开 Customers workspace', '查看 Prompts'],
  review_next_actions: ['查看 FAQ Review 链路', '让系统解释下一步', '打开 Customers workspace'],
  file_path: 'customer-assets/nexa-demo/delivery.md',
}

const observerDeliveryPosture: CustomerDeliveryPosture = {
  customer_id: 'ops-observer',
  delivery_version: '1',
  summary_style: 'observer',
  next_action_style: 'audit',
  review_copy_style: 'observer',
  citation_density: 'compact',
  default_next_actions: ['打开 Audit', '查看 Interaction Log', '查看 Costs'],
  review_next_actions: ['打开 Audit', '查看 Interaction Log', '检查 verification 结果'],
  file_path: 'customer-assets/ops-observer/delivery.md',
}

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

  it('applies guided delivery posture defaults when upstream delivery is sparse', () => {
    const clarification = finalizeDelivery({
      success: false,
      data: {
        type: 'qna',
        summary: 'Please narrow the FAQ scope.',
        error: 'missing_required_clarification',
        meta: {
          intent_type: 'general_qna',
          intent_type_canonical: 'documentation',
          exit_type: 'needs_clarification',
          next_actions: [],
        },
      },
    }, {
      deliveryPosture: demoDeliveryPosture,
      clarificationPosture: demoClarificationPosture,
    })

    expect(clarification.delivery_envelope.meta.next_actions).toEqual([
      '补充一个更具体的上下文',
      '继续追问这个工作流',
      '切换到当前 customer workspace',
    ])
    expect(clarification.data.meta.delivery_posture).toEqual(expect.objectContaining({
      customer_id: 'nexa-demo',
      summary_style: 'explainer',
      next_action_style: 'guided',
    }))
    expect(clarification.delivery_envelope.summary).toContain('Add one more detail')
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

  it('adds observer framing for observer delivery posture on non-success outcomes', () => {
    const body = finalizeDelivery({
      success: false,
      data: {
        type: 'ops',
        summary: '未命中允许的 capability。',
        error: 'out_of_scope',
        meta: {
          intent_type: 'out_of_scope',
          intent_type_canonical: 'out_of_scope',
          exit_type: 'rejected',
        },
      },
    }, {
      deliveryPosture: observerDeliveryPosture,
    })

    expect(body.delivery_envelope.summary).toContain('Observer note:')
    expect(body.delivery_envelope.meta.next_actions).toEqual([
      '查看 Audit',
      '检查 capability 边界',
      '查看 Interaction Log',
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
