import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/prompt/action/route'

describe('prompt action route', () => {
  it('rejects Supabase prompt mutations because prompts are filesystem-managed', async () => {
    const response = await POST()
    const payload = await response.json()

    expect(response.status).toBe(410)
    expect(payload.error).toBe('prompt_filesystem_managed')
  })
})
