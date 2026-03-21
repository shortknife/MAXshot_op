import { IntentAnalysisResult, callDeepSeek } from './deepseek-client'
import { toCanonicalIntentType } from './intent-taxonomy'

export async function parseIntent(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  try {
    const result = await callDeepSeek(rawQuery, sessionContext)

    validateIntentOutput(result.intent)
    // Compatibility/audit field only.
    // Downstream runtime decisions should prefer matched capability ids over this canonical label.
    result.intent.extracted_slots = {
      ...(result.intent.extracted_slots || {}),
      intent_type_canonical: toCanonicalIntentType(result.intent.type),
    }

    return result
  } catch {
    return {
      intent: {
        type: 'out_of_scope',
        extracted_slots: { in_scope: false, reason: 'intent_analyzer_failed' },
        confidence: 0.5,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: {
        slug: 'intent_analyzer',
        version: '0',
        source: 'local_stub',
      },
    }
  }
}

function validateIntentOutput(intent: { type: string; extracted_slots: Record<string, unknown>; confidence: number }) {
  if (!intent.type) {
    throw new Error('Intent type is required')
  }

  if (!intent.extracted_slots || typeof intent.extracted_slots !== 'object') {
    throw new Error('extracted_slots must be an object')
  }

  if (typeof intent.confidence !== 'number' || intent.confidence < 0 || intent.confidence > 1) {
    throw new Error('confidence must be a number between 0 and 1')
  }

  const validIntentTypes = [
    'ops_query',
    'ops_summary',
    'audit_query',
    'memory_query',
    'business_query',
    'documentation',
    'small_talk',
    'mixed',
    'content_generation',
    'content_brief',
    'general_qna',
    'product_qna',
    'task_management',
    'metric_query',
    'marketing_gen',
    'out_of_scope',
  ]

  if (!validIntentTypes.includes(intent.type)) {
    throw new Error(`Invalid intent type: ${intent.type}`)
  }
}

export async function parseIntentWithSession(rawQuery: string, sessionId: string): Promise<IntentAnalysisResult> {
  return parseIntent(rawQuery, sessionId)
}
