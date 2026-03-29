import { describe, expect, it } from 'vitest'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

function readBody(res: Awaited<ReturnType<typeof runChatAsk>>) {
  return res.body as any
}

describe('business runtime baselines', () => {
  it('handles calendar-week APY without re-clarifying time range', async () => {
    const res = await runChatAsk({ raw_query: '3月第一周的平均APY是多少' })
    const body = readBody(res)
    expect(res.status).toBe(200)
    expect(body?.data?.error).not.toBe('missing_required_clarification')
    expect(body?.data?.error).not.toBe('out_of_scope')
    expect(body?.data?.meta?.intent_type).toBe('business_query')
  }, 45000)

  it('handles month TVL query as business query instead of out of scope', async () => {
    const res = await runChatAsk({ raw_query: '2月份平均日tvl是多少' })
    const body = readBody(res)
    expect(res.status).toBe(200)
    expect(body?.data?.error).not.toBe('missing_required_clarification')
    expect(body?.data?.error).not.toBe('out_of_scope')
    expect(body?.data?.meta?.intent_type).toBe('business_query')
  }, 45000)

  it('handles exact-day top/bottom APY without re-clarifying time range', async () => {
    const res = await runChatAsk({ raw_query: '3月20日当天APY 最高和最低的vault 是那两个呢？' })
    const body = readBody(res)
    expect(res.status).toBe(200)
    expect(body?.data?.error).not.toBe('missing_required_clarification')
    expect(body?.data?.error).not.toBe('out_of_scope')
    expect(body?.data?.meta?.intent_type).toBe('business_query')
  }, 45000)
})
