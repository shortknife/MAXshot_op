import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/intent-analyzer/deepseek-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/intent-analyzer/deepseek-client')>(
    '@/lib/intent-analyzer/deepseek-client'
  )
  return {
    ...actual,
    callDeepSeek: vi.fn(),
  }
})

import { parseIntent } from '@/lib/intent-analyzer/intent-parsing'
import { callDeepSeek } from '@/lib/intent-analyzer/deepseek-client'

describe('parseIntent degraded fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('degrades to clarification instead of out_of_scope when analyzer fails', async () => {
    vi.mocked(callDeepSeek).mockRejectedValueOnce(new Error('boom'))

    const result = await parseIntent('你能描述什么是MAXshot么？')

    expect(result.intent.type).toBe('general_qna')
    expect(result.intent.extracted_slots?.in_scope).toBe(true)
    expect(result.intent.extracted_slots?.degraded).toBe(true)
    expect(result.intent.extracted_slots?.reason).toBe('intent_analyzer_failed')
    expect(result.intent.extracted_slots?.need_clarification).toBe(true)
    expect(result.intent.extracted_slots?.matched_capability_ids).toEqual(['capability.product_doc_qna'])
  })
})
