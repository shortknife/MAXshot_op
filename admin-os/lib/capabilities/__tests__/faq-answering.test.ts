import { describe, expect, it } from 'vitest'
import { faqAnswering } from '@/lib/capabilities/faq-answering'

describe('faqAnswering', () => {
  it('returns a grounded faq answer with citations', async () => {
    const output = await faqAnswering({
      capability_id: 'capability.faq_answering',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: { question: 'How do I reset my password?' } },
      slots: { question: 'How do I reset my password?' },
    })

    expect(output.status).toBe('success')
    expect((output.result as { fallback_required?: boolean }).fallback_required).toBe(false)
    expect((output.result as { answer?: string }).answer).toContain('Forgot password')
    expect(Array.isArray((output.result as { citations?: unknown[] }).citations)).toBe(true)
  })

  it('returns bounded fallback when no grounded answer is found', async () => {
    const output = await faqAnswering({
      capability_id: 'capability.faq_answering',
      execution_id: 'exec-2',
      intent: { type: 'general_qna', extracted_slots: { question: 'How do I cancel via carrier pigeon?' } },
      slots: { question: 'How do I cancel via carrier pigeon?' },
    })

    expect(output.status).toBe('success')
    expect((output.result as { fallback_required?: boolean }).fallback_required).toBe(true)
    expect(output.evidence.fallback_reason).toBeTruthy()
  })
})
