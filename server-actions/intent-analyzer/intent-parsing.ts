import { IntentAnalysisResult, callDeepSeek } from './deepseek-client'

export async function parseIntent(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  try {
    const result = await callDeepSeek(rawQuery, sessionContext)

    validateIntentOutput(result.intent)

    return result
  } catch (error) {
    return {
      intent: {
        type: 'general_qna',
        extracted_slots: {},
        confidence: 0.5,
      },
      raw_query: rawQuery,
      tokens_used: 0,
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
    'content_generation',
    'general_qna',
    'task_management',
    'metric_query',
    'marketing_gen',
  ]

  if (!validIntentTypes.includes(intent.type)) {
    throw new Error(`Invalid intent type: ${intent.type}`)
  }
}

export async function parseIntentWithSession(rawQuery: string, sessionId: string): Promise<IntentAnalysisResult> {
  return parseIntent(rawQuery, sessionId)
}
