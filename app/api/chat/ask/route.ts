import { NextRequest, NextResponse } from 'next/server'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const result = await runChatAsk(body)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    return NextResponse.json(
      { error: 'chat_ask_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
