import { describe, expect, it } from 'vitest'

import { GET } from '@/app/api/customers/workspace/route'

describe('GET /api/customers/workspace', () => {
  it('returns preset for valid customer', async () => {
    const req = new Request('http://localhost/api/customers/workspace?customer_id=maxshot')
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.preset.customer_id).toBe('maxshot')
  })

  it('rejects missing customer_id', async () => {
    const req = new Request('http://localhost/api/customers/workspace')
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBe('missing_customer_id')
  })
})
