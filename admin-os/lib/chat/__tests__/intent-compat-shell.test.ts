import { describe, expect, it } from 'vitest'
import { normalizeChatIntent } from '@/lib/chat/intent-compat'

describe('intent-compat compatibility shell', () => {
  it('does not override official Step 3 capability authority', () => {
    const result = normalizeChatIntent({
      parsed: {
        intent: {
          type: 'general_qna',
          extracted_slots: {
            matched_capability_ids: ['capability.product_doc_qna'],
            matched_capability_id: 'capability.product_doc_qna',
            question_shape: 'capability_overview',
            need_clarification: false,
          },
        },
      },
      intentQuery: '你能做什么业务呢？',
      previousTurns: 0,
      looksLikeContentBrief: () => false,
    })

    expect(result.intentType).toBe('general_qna')
    expect(result.extractedSlots.matched_capability_id).toBe('capability.product_doc_qna')
    expect(result.extractedSlots.question_shape).toBe('capability_overview')
  })

  it('routes faq-style support questions into faq answering', () => {
    const result = normalizeChatIntent({
      parsed: {
        intent: {
          type: 'general_qna',
          extracted_slots: {
            matched_capability_ids: ['capability.product_doc_qna'],
            matched_capability_id: 'capability.product_doc_qna',
          },
        },
      },
      intentQuery: 'How do I reset my password?',
      previousTurns: 0,
      looksLikeContentBrief: () => false,
    })

    expect(result.intentType).toBe('general_qna')
    expect(result.extractedSlots.matched_capability_id).toBe('capability.faq_answering')
    expect(result.extractedSlots.question).toBe('How do I reset my password?')
  })
})
