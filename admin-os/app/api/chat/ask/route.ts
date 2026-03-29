import { NextRequest, NextResponse } from 'next/server'
import { runChatAsk } from '@/lib/chat/chat-ask-service'
import { normalizeChatEntryEnvelope } from '@/lib/chat/entry-envelope'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = normalizeChatEntryEnvelope(body)
    const result = await runChatAsk(entry)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    return NextResponse.json(
      { error: 'chat_ask_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
