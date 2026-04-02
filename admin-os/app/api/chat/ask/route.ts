import { NextRequest, NextResponse } from 'next/server'
import { runChatAsk } from '@/lib/chat/chat-ask-service'
import { normalizeChatEntryEnvelope } from '@/lib/chat/entry-envelope'
import { buildPerfQueryMeta, createPerfTrace } from '@/lib/observability/request-performance'
import { extractInteractionLearningPayload } from '@/lib/interaction-learning/extract'
import { persistInteractionLearningLog } from '@/lib/interaction-learning/runtime'
import { extractRuntimeCostEvent } from '@/lib/runtime-cost/extract'
import { persistRuntimeCostEvent } from '@/lib/runtime-cost/runtime'

export async function POST(req: NextRequest) {
  const readJsonStartedAt = Date.now()
  const requestStartedAt = Date.now()
  let perf: ReturnType<typeof createPerfTrace> | null = null
  try {
    const body = await req.json()
    const entry = normalizeChatEntryEnvelope(body)
    perf = createPerfTrace('api.chat.ask', buildPerfQueryMeta(String(entry?.raw_query || ''), { has_session_id: Boolean(entry?.session_id) }))
    perf.stage('read_json', { stage_duration_ms: Date.now() - readJsonStartedAt })
    perf.stage('normalize_entry')
    const result = await perf.measure('run_chat_ask', () => runChatAsk(entry))
    const learningPayload = extractInteractionLearningPayload({
      entry,
      resultBody: result.body,
      statusCode: result.status,
    })
    await perf.measure('persist_interaction_learning_log', () =>
      persistInteractionLearningLog(learningPayload).catch((error) => {
        console.error('interaction_learning_log_failed', error)
        return null
      })
    )
    const costEvent = extractRuntimeCostEvent({
      entry,
      resultBody: result.body,
      statusCode: result.status,
      runtimeMeta: result.runtimeMeta,
      durationMs: Date.now() - requestStartedAt,
    })
    await perf.measure('persist_runtime_cost_event', () =>
      persistRuntimeCostEvent(costEvent).catch((error) => {
        console.error('runtime_cost_event_failed', error)
        return null
      })
    )
    perf.finish({ status: result.status })
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    perf?.fail(error)
    return NextResponse.json(
      { error: 'chat_ask_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
