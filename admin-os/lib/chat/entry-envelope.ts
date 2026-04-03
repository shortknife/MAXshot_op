export type ChatEntryEnvelope = {
  raw_query: string
  rewrite_action?: string
  draft?: string
  session_id?: string
  entry_channel?: string
  requester_id?: string | null
  customer_id?: string | null
}

function cleanString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

export function normalizeChatEntryEnvelope(body: unknown): ChatEntryEnvelope {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

  return {
    raw_query: cleanString(input.raw_query) || '',
    rewrite_action: cleanString(input.rewrite_action),
    draft: cleanString(input.draft),
    session_id: cleanString(input.session_id),
    entry_channel: cleanString(input.entry_channel) || 'web_app',
    requester_id: cleanString(input.requester_id) || null,
    customer_id: cleanString(input.customer_id) || null,
  }
}
