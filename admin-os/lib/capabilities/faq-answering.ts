import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'
import { searchFaqKb } from './faq-kb-retriever'

function readNumberParam(params: Record<string, unknown>, key: string): number | undefined {
  const raw = params[key]
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function buildFallbackResult(question: string, reason: string, citations: unknown[] = []) {
  return {
    answer: `I could not ground a reliable FAQ answer for: ${question}`,
    summary: 'No grounded FAQ answer available.',
    citations,
    confidence: 0,
    fallback_required: true,
    review_required: true,
    reason,
  }
}

export async function faqAnswering(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    return {
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'failed',
      result: null,
      error: reason,
      evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
      audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'failed', used_skills: ['faq-kb-retriever'] },
      used_skills: ['faq-kb-retriever'],
      metadata: { rejected_reason: reason },
    }
  }

  const question = readStringParam(slots, 'question', { required: true }) || ''
  const kbScope = readStringParam(slots, 'kb_scope') || null
  const topK = readNumberParam(slots, 'top_k') ?? 3
  const minConfidence = readNumberParam(slots, 'min_confidence') ?? 0.35
  const matches = searchFaqKb({ question, kb_scope: kbScope, top_k: topK })
  const best = matches[0] || null
  const citations = matches.map((match) => ({
    source_id: match.source_id,
    title: match.heading ? `${match.title} / ${match.heading}` : match.title,
    snippet: match.snippet,
    score: match.score,
  }))

  const confidence = best ? Math.min(1, Math.max(0, best.score / 12)) : 0
  const used_skills = ['faq-kb-retriever', 'deterministic-faq-answering']

  if (!best || confidence < minConfidence) {
    const reason = best ? 'faq_low_confidence' : 'faq_no_grounding_evidence'
    return {
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'success',
      result: buildFallbackResult(question, reason, citations),
      evidence: { sources: citations, doc_quotes: null, fallback_reason: reason },
      audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'success', used_skills },
      used_skills,
      metadata: { kb_scope: kbScope, retrieval_count: matches.length, confidence, fallback_reason: reason },
    }
  }

  const answer = best.snippet
  return {
    capability_id: 'faq_answering',
    capability_version: '1.0',
    status: 'success',
    result: {
      answer,
      summary: answer,
      citations,
      confidence,
      fallback_required: false,
      review_required: false,
      reason: null,
    },
    evidence: { sources: citations, doc_quotes: null },
    audit: { capability_id: 'faq_answering', capability_version: '1.0', status: 'success', used_skills },
    used_skills,
    metadata: { kb_scope: kbScope, retrieval_count: matches.length, confidence },
  }
}
