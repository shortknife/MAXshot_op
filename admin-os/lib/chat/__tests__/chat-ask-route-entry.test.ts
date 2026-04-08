import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  runChatAsk: vi.fn(async (body: unknown) => ({
    status: 200,
    body: { success: true, echo: body },
    runtimeMeta: {
      session_id: 's1',
      customer_id: 'maxshot',
      requester_id: 'u1',
      entry_channel: 'web_app',
      intent_type: 'general_qna',
      intent_type_canonical: 'general_qna',
      primary_capability_id: 'capability.product_doc_qna',
      matched_capability_ids: ['capability.product_doc_qna'],
      source_plane: 'product_docs',
      step3_tokens_used: 0,
      model_source: 'local_stub',
      model_prompt_slug: 'intent_analyzer',
      verification_outcome: 'pass',
    },
  })),
  persistInteractionLearningLog: vi.fn(async () => null),
  persistRuntimeCostEvent: vi.fn(async () => null),
  enforceChatEntryIdentityContext: vi.fn(async (entry: unknown) => entry),
}))

vi.mock('@/lib/chat/chat-ask-service', () => ({ runChatAsk: mocks.runChatAsk }))
vi.mock('@/lib/interaction-learning/runtime', () => ({ persistInteractionLearningLog: mocks.persistInteractionLearningLog }))
vi.mock('@/lib/customers/runtime-entry', () => ({ enforceChatEntryIdentityContext: mocks.enforceChatEntryIdentityContext }))
vi.mock('@/lib/runtime-cost/runtime', async () => {
  const actual = await vi.importActual<typeof import('@/lib/runtime-cost/runtime')>('@/lib/runtime-cost/runtime')
  return { ...actual, persistRuntimeCostEvent: mocks.persistRuntimeCostEvent }
})

import { POST } from '@/app/api/chat/ask/route'

describe('/api/chat/ask entry envelope', () => {
  beforeEach(() => {
    mocks.runChatAsk.mockClear()
    mocks.enforceChatEntryIdentityContext.mockReset()
    mocks.enforceChatEntryIdentityContext.mockImplementation(async (entry: unknown) => entry)
  })

  it('normalizes the request into an entry envelope before dispatch', async () => {
    const req = new NextRequest('http://localhost/api/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ raw_query: '  你好  ', session_id: ' s1 ', requester_id: ' u1 ', customer_id: ' maxshot ' }),
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
      customer_id: 'maxshot',
    })
    expect(body.success).toBe(true)
  })

  it('returns deterministic mismatch errors from entry enforcement', async () => {
    mocks.enforceChatEntryIdentityContext.mockRejectedValueOnce(new Error('requester_customer_mismatch'))

    const req = new NextRequest('http://localhost/api/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ raw_query: 'test', requester_id: 'maxshot-ops', customer_id: 'ops-observer' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('requester_customer_mismatch')
    expect(mocks.runChatAsk).not.toHaveBeenCalled()
  })
})
