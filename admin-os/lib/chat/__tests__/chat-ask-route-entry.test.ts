import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  runChatAsk: vi.fn(async (body: unknown) => ({
    status: 200,
    body: { success: true, echo: body },
  })),
}))

vi.mock('@/lib/chat/chat-ask-service', () => ({ runChatAsk: mocks.runChatAsk }))

import { POST } from '@/app/api/chat/ask/route'

describe('/api/chat/ask entry envelope', () => {
  it('normalizes the request into an entry envelope before dispatch', async () => {
    const req = new NextRequest('http://localhost/api/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ raw_query: '  你好  ', session_id: ' s1 ', requester_id: ' u1 ' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mocks.runChatAsk).toHaveBeenCalledWith({
      raw_query: '你好',
      rewrite_action: undefined,
      draft: undefined,
      session_id: 's1',
      entry_channel: 'web_app',
      requester_id: 'u1',
    })
    expect(body.success).toBe(true)
  })
})
