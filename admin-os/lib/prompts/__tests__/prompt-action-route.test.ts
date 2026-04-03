import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const assertWriteEnabled = vi.fn()
  const releasePromptVersion = vi.fn()
  return {
    assertWriteEnabled,
    releasePromptVersion,
  }
})

vi.mock('@/lib/utils', () => ({
  assertWriteEnabled: mocks.assertWriteEnabled,
}))

vi.mock('@/lib/prompts/release', () => ({
  releasePromptVersion: mocks.releasePromptVersion,
}))

import { POST } from '@/app/api/prompt/action/route'

describe('prompt action route', () => {
  beforeEach(() => {
    mocks.assertWriteEnabled.mockReset()
    mocks.releasePromptVersion.mockReset()
  })

  it('returns 400 when approval is missing', async () => {
    const response = await POST(new Request('http://localhost/api/prompt/action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'release',
        slug: 'product_doc_qna',
        target_version: '8',
        operator_id: 'platform-admin',
        confirm_token: 'CONFIRM',
        approved: false,
      }),
    }) as unknown as Request)

    expect(response.status).toBe(400)
  })

  it('returns released payload when mutation succeeds', async () => {
    mocks.releasePromptVersion.mockResolvedValue({
      slug: 'product_doc_qna',
      action: 'release',
      target_version: '8',
      previous_version: '7',
      active_version: '8',
      event_id: 'release-1',
      release_source: 'supabase',
    })

    const response = await POST(new Request('http://localhost/api/prompt/action', {
      method: 'POST',
      body: JSON.stringify({
        action: 'release',
        slug: 'product_doc_qna',
        target_version: '8',
        operator_id: 'platform-admin',
        confirm_token: 'CONFIRM',
        release_note: 'Promote v8',
        approved: true,
      }),
    }) as unknown as Request)

    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload.active_version).toBe('8')
    expect(mocks.assertWriteEnabled).toHaveBeenCalled()
  })
})
