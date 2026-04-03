import { describe, expect, it } from 'vitest'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

describe('qna capability overview', () => {
  it('returns capability overview instead of missing document fallback', async () => {
    const res = await runChatAsk({ raw_query: '你能做什么业务呢？' })
    expect(res.status).toBe(200)
    const body = res.body as any
    expect(body?.success).toBe(true)
    expect(String(body?.data?.summary || '')).toContain('我当前支持的业务能力主要有')
    expect(String(body?.data?.summary || '')).not.toContain('No document specified')
    expect(body?.data?.meta?.intent_type).toBe('general_qna')
    expect(body?.data?.meta?.session_kernel?.kernel_id).toMatch(/^sk-/)
    expect(body?.data?.meta?.session_kernel?.verification_outcome).toBeTruthy()
    expect(body?.data?.meta?.prompt_runtime?.assembly_mode).toBeTruthy()
    expect(body?.data?.meta?.prompt_runtime?.primary_prompt_slug).toBeTruthy()
  }, 45000)
})
