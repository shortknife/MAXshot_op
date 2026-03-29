import { describe, expect, it } from 'vitest'
import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'

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
})
