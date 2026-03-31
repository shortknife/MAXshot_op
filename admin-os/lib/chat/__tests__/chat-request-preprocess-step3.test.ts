import { describe, expect, it } from 'vitest'
import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'
import { saveBusinessSessionContext } from '@/lib/chat/session-context'

describe('prepareChatRequest step3 contract', () => {
  it('exposes step3 harness result alongside prepared request fields', async () => {
    const prepared = await prepareChatRequest({
      rawQuery: '你能做什么业务呢？',
      sessionId: null,
      looksLikeContentBrief: () => false,
    })

    expect(prepared.step3.intent_type).toBe('general_qna')
    expect(prepared.step3.matched_capability_ids).toEqual(['capability.product_doc_qna'])
    expect(prepared.step3.matched_capability_id).toBe('capability.product_doc_qna')
    expect(prepared.step3.need_clarification).toBe(false)
    expect(prepared.step3.slots.question_shape).toBe('capability_overview')
    expect(prepared.intentType).toBe('general_qna')
  })

  it('inherits compare targets from active session context for follow-up queries', async () => {
    const sessionId = 'step3-compare-follow-up'
    saveBusinessSessionContext({
      sessionId,
      scope: 'yield',
      queryMode: 'metrics',
      filters: {
        chain: 'arbitrum',
        protocol: 'morpho',
        compare_targets: ['Maxshot USDC V2', 'dForce USDC'],
        time_window_days: 7,
      },
      metric: 'apy',
      aggregation: 'avg',
    })

    const prepared = await prepareChatRequest({
      rawQuery: '那按 base 呢？',
      sessionId,
      looksLikeContentBrief: () => false,
    })

    expect(prepared.intentType).toBe('business_query')
    expect(prepared.intentSlots.scope).toBe('yield')
    expect(prepared.intentSlots.chain).toBe('base')
    expect(prepared.intentSlots.compare_targets).toEqual(['Maxshot USDC V2', 'dForce USDC'])
    expect(prepared.followUpContextApplied).toBe(true)
  })
})
