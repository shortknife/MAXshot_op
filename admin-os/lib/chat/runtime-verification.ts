type VerificationOutcome = 'pass' | 'review' | 'clarify' | 'block'

type VerificationDecision = {
  stage: 'verify'
  pass: boolean
  outcome: VerificationOutcome
  reason: string | null
  checks: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function buildDecision(outcome: VerificationOutcome, reason: string | null, checks: string[]): VerificationDecision {
  return {
    stage: 'verify',
    pass: outcome === 'pass',
    outcome,
    reason,
    checks,
  }
}

export function evaluateRuntimeVerification(body: Record<string, unknown>): VerificationDecision {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const answerMeta = asRecord(meta.answer_meta)
  const criticDecision = asRecord(meta.critic_decision)
  const intentType = String(meta.intent_type_canonical || meta.intent_type || '')
  const exitType = String(meta.exit_type || '')
  const dataType = String(data.type || '')
  const capabilityId = String(answerMeta.capability_id || '')
  const checks: string[] = []

  if (exitType === 'needs_clarification' || String(data.error || '') === 'missing_required_clarification') {
    checks.push('clarification_flow')
    return buildDecision('clarify', 'needs_clarification', checks)
  }

  if (body.success !== true) {
    checks.push('failure_path')
    return buildDecision('block', String(data.error || body.error || 'delivery_failed') || 'delivery_failed', checks)
  }

  if (dataType === 'ops' || String(meta.data_plane || '') === 'business' || intentType === 'business_query') {
    checks.push('business_contract')
    if (criticDecision.pass === false) {
      return buildDecision('review', String(criticDecision.reason || 'business_critic_failed') || 'business_critic_failed', checks)
    }
    if (typeof meta.row_count === 'number' && meta.row_count === 0 && exitType === 'answered') {
      checks.push('empty_answered_rows')
      return buildDecision('review', 'empty_answered_rows', checks)
    }
    return buildDecision('pass', null, checks)
  }

  if (dataType === 'qna') {
    checks.push('qna_grounding')
    if (answerMeta.review_required === true || answerMeta.fallback_required === true) {
      return buildDecision('review', String(answerMeta.reason || 'qna_review_required') || 'qna_review_required', checks)
    }
    const confidence = typeof answerMeta.confidence === 'number' ? answerMeta.confidence : null
    if (confidence !== null && confidence < 0.6) {
      checks.push('low_confidence')
      return buildDecision('review', 'qna_low_confidence', checks)
    }
    if (capabilityId === 'capability.faq_answering') {
      const citations = asStringArray(answerMeta.citations).length || (Array.isArray(answerMeta.citations) ? answerMeta.citations.length : 0)
      if (citations === 0) {
        checks.push('missing_citations')
        return buildDecision('review', 'faq_missing_citations', checks)
      }
    }
    return buildDecision('pass', null, checks)
  }

  checks.push('default_pass')
  return buildDecision('pass', null, checks)
}

export function applyRuntimeVerification(body: Record<string, unknown>): Record<string, unknown> {
  const data = asRecord(body.data)
  const meta = asRecord(data.meta)
  const verification = evaluateRuntimeVerification(body)
  return {
    ...body,
    verification_decision: verification,
    data: {
      ...data,
      meta: {
        ...meta,
        verification,
      },
    },
  }
}
