import type { SessionResolution, ThreadAction } from '@/lib/chat/context-manager/types'

function normalizeSessionId(input: string | null): string | null {
  const normalized = String(input || '').trim()
  return normalized || null
}

function detectThreadAction(rawQuery: string): ThreadAction {
  const text = String(rawQuery || '').trim().toLowerCase()
  if (/^\/(?:new|reset)\b/.test(text)) return 'reset'
  return 'continue'
}

export function resolveSession(params: {
  rawQuery: string
  sessionId: string | null
}): SessionResolution {
  const sessionId = normalizeSessionId(params.sessionId)
  const threadAction = detectThreadAction(params.rawQuery)
  return {
    session_id: sessionId,
    thread_action: threadAction,
    confidence: 1,
    resolution_reason: threadAction === 'reset' ? 'explicit reset command detected' : 'existing session reused',
    store_policy: {
      load_existing_context: threadAction !== 'reset',
      reset_previous_context: threadAction === 'reset',
      fork_from_session_id: null,
    },
  }
}

