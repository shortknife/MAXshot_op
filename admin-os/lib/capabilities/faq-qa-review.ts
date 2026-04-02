import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'

function buildFailure(reason: string): CapabilityOutput {
  return {
    capability_id: 'faq_qa_review',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'faq_qa_review',
      capability_version: '1.0',
      status: 'failed',
      used_skills: ['faq-qa-review'],
    },
    used_skills: ['faq-qa-review'],
    metadata: { rejected_reason: reason },
  }
}

export async function faqQaReview(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (error) {
    return buildFailure(error instanceof Error ? error.message : 'invalid_slots')
  }

  let question = ''
  let reason = ''
  try {
    question = readStringParam(slots, 'question', { required: true }) || ''
    reason = readStringParam(slots, 'reason', { required: true }) || ''
  } catch (error) {
    return buildFailure(error instanceof Error ? error.message : 'invalid_required_slot')
  }

  const draftAnswer = readStringParam(slots, 'draft_answer') || null
  const customerId = readStringParam(slots, 'customer_id') || null
  const customerContext = readStringParam(slots, 'customer_context') || null
  const channel = readStringParam(slots, 'channel') || null
  const kbScope = readStringParam(slots, 'kb_scope') || null
  const confidence = typeof slots.confidence === 'number' ? slots.confidence : null
  const citations = Array.isArray(slots.citations) ? slots.citations : []

  const priority = reason === 'faq_out_of_scope' ? 'normal' : 'high'
  const reviewPayload = {
    question,
    draft_answer: draftAnswer,
    reason,
    citations,
    confidence,
    customer_id: customerId,
    customer_context: customerContext,
    channel,
    kb_scope: kbScope,
    priority,
  }

  return {
    capability_id: 'faq_qa_review',
    capability_version: '1.0',
    status: 'success',
    result: {
      review_payload: reviewPayload,
      manual_review_required: true,
      queue_status: 'prepared',
    },
    evidence: {
      sources: citations,
      doc_quotes: null,
      fallback_reason: reason,
    },
    audit: {
      capability_id: 'faq_qa_review',
      capability_version: '1.0',
      status: 'success',
      used_skills: ['faq-qa-review'],
    },
    used_skills: ['faq-qa-review'],
    metadata: {
      manual_review_required: true,
      queue_status: 'prepared',
      priority,
    },
  }
}
