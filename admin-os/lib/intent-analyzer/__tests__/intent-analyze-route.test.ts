import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/intent/analyze/route'

describe('/api/intent/analyze step3 response', () => {
  it('returns the official step3 object', async () => {
    const req = new NextRequest('http://localhost/api/intent/analyze', {
      method: 'POST',
      body: JSON.stringify({ raw_query: '你能做什么业务呢？' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.step3.intent_type).toBe('general_qna')
    expect(body.step3.matched_capability_id).toBe('capability.product_doc_qna')
    expect(body.step3.need_clarification).toBe(false)
    expect(body.trace.analyzer).toBe('intent-analyzer')
    expect(body.intent).toBeUndefined()
  })

  it('keeps ops summary meaning only inside step3', async () => {
    const req = new NextRequest('http://localhost/api/intent/analyze', {
      method: 'POST',
      body: JSON.stringify({ raw_query: '给我一个 ops summary' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.step3.intent_type).toBe('business_query')
    expect(body.step3.slots.intent_type_canonical).toBe('ops_query')
    expect(body.step3.matched_capability_id).toBe('capability.data_fact_query')
    expect(body.intent).toBeUndefined()
  })
})
