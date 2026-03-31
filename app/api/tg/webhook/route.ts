import { NextRequest, NextResponse } from 'next/server'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

type TgUpdate = {
  update_id?: number
  message?: {
    message_id?: number
    text?: string
    chat?: { id?: number | string }
    from?: { id?: number | string }
    message_thread_id?: number | string
  }
}

function getSessionId(update: TgUpdate): string | null {
  const chatId = String(update.message?.chat?.id || '').trim()
  if (!chatId) return null
  const threadId = String(update.message?.message_thread_id || '').trim()
  return threadId ? `tg:${chatId}:th:${threadId}` : `tg:${chatId}`
}

function extractRawQuery(update: TgUpdate): string {
  const text = String(update.message?.text || '').trim()
  if (!text) return ''
  if (/^\/start\b/i.test(text)) {
    return '你好'
  }
  if (/^\/new\b/i.test(text) || /^\/reset\b/i.test(text)) {
    return '/new'
  }
  return text
}

function toTelegramReply(payload: unknown): string {
  const body = payload as {
    success?: boolean
    error?: string
    details?: string
    data?: { summary?: string; error?: string; meta?: { next_actions?: string[] } }
  }
  if (body?.error) return `${body.error}${body.details ? `: ${body.details}` : ''}`
  const summary = String(body?.data?.summary || '').trim()
  const nextActions = Array.isArray(body?.data?.meta?.next_actions)
    ? body.data.meta.next_actions.filter(Boolean).slice(0, 3)
    : []
  if (!summary) return '已收到你的问题，但当前没有可展示结果。'
  if (!nextActions.length) return summary
  return `${summary}\n\n你可以继续问：\n- ${nextActions.join('\n- ')}`
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // Do not fail webhook processing due to upstream Telegram send failure.
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const header = req.headers.get('x-telegram-bot-api-secret-token') || ''
      if (header !== secret) {
        return NextResponse.json({ ok: false, error: 'invalid_webhook_secret' }, { status: 401 })
      }
    }

    const update = (await req.json()) as TgUpdate
    const chatId = String(update.message?.chat?.id || '').trim()
    const rawQuery = extractRawQuery(update)
    const sessionId = getSessionId(update)

    if (!chatId || !rawQuery) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'unsupported_update' })
    }

    const result = await runChatAsk({
      raw_query: rawQuery,
      session_id: sessionId,
      entry_channel: 'tg_bot',
      requester_id: String(update.message?.from?.id || '').trim() || null,
    })
    const replyText = toTelegramReply(result.body)
    await sendTelegramMessage(chatId, replyText)

    return NextResponse.json({
      ok: true,
      update_id: update.update_id || null,
      session_id: sessionId,
      status: result.status,
      replied: true,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'tg_webhook_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
