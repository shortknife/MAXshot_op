import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'

const REASON_MESSAGES: Record<string, { message: string; next_step: 'clarify' | 'handoff' | 'retry_later' | 'manual_review' }> = {
  faq_low_confidence: {
    message: 'I found related FAQ material, but the answer confidence is too low to present as a grounded final answer.',
    next_step: 'manual_review',
  },
  faq_no_grounding_evidence: {
    message: 'I could not find grounded FAQ evidence for this question in the current KB scope.',
    next_step: 'handoff',
  },
  faq_out_of_scope: {
    message: 'This question is outside the supported FAQ scope for the current KB source.',
    next_step: 'handoff',
  },
  faq_generation_failed: {
    message: 'The FAQ answer could not be generated reliably from the available KB material.',
    next_step: 'retry_later',
  },
}

function buildFailure(reason: string): CapabilityOutput {
  return {
    capability_id: 'faq_fallback',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'faq_fallback',
      capability_version: '1.0',
      status: 'failed',
      used_skills: ['faq-fallback'],
    },
    used_skills: ['faq-fallback'],
    metadata: { rejected_reason: reason },
  }
}

export async function faqFallback(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (error) {
    return buildFailure(error instanceof Error ? error.message : 'invalid_slots')
  }

  let question = ''
  let reason = 'faq_generation_failed'
  try {
    question = readStringParam(slots, 'question', { required: true }) || ''
    reason = readStringParam(slots, 'reason', { required: true }) || 'faq_generation_failed'
  } catch (error) {
    return buildFailure(error instanceof Error ? error.message : 'invalid_required_slot')
  }
  const kbScope = readStringParam(slots, 'kb_scope') || null
  const channel = readStringParam(slots, 'channel') || null
  const fallback = REASON_MESSAGES[reason] || {
    message: 'The FAQ answer could not be grounded reliably and should be reviewed before use.',
    next_step: 'manual_review' as const,
  }
  const citations = Array.isArray(slots.citations) ? slots.citations : []
  const usedSkills = ['faq-fallback']

  return {
    capability_id: 'faq_fallback',
    capability_version: '1.0',
    status: 'success',
    result: {
      fallback_message: `${fallback.message} Question: ${question}`,
      review_required: true,
      reason,
      next_step: fallback.next_step,
      citations,
    },
    evidence: {
      sources: citations,
      doc_quotes: null,
      fallback_reason: reason,
    },
    audit: {
      capability_id: 'faq_fallback',
      capability_version: '1.0',
      status: 'success',
      used_skills: usedSkills,
    },
    used_skills: usedSkills,
    metadata: {
      kb_scope: kbScope,
      channel,
      review_required: true,
    },
  }
}
