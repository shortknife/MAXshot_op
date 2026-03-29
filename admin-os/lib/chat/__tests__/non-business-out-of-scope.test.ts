import { describe, expect, it } from 'vitest'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

describe('non-business generic product theory', () => {
  it('stays out_of_scope instead of pretending to be MAXshot product docs', async () => {
    const result = await runChatAsk({ raw_query: '这个产品的核心原理是什么？' })
    const body = result.body as any

    expect(result.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.data.error).toBe('out_of_scope')
    expect(body.data.meta.exit_type).toBe('rejected')
  })
})
