import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  assertWriteEnabled: vi.fn(),
  registerKbSourceDraft: vi.fn(),
  transitionKbSourceItem: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({ assertWriteEnabled: mocks.assertWriteEnabled }))
vi.mock('@/lib/faq-kb/source-inventory', () => ({
  registerKbSourceDraft: mocks.registerKbSourceDraft,
  transitionKbSourceItem: mocks.transitionKbSourceItem,
}))

import { POST } from '@/app/api/kb-source/action/route'

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/kb-source/action', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('kb source action route', () => {
  beforeEach(() => {
    mocks.assertWriteEnabled.mockReset()
    mocks.registerKbSourceDraft.mockReset()
    mocks.transitionKbSourceItem.mockReset()
  })

  it('requires approval', async () => {
    const res = await POST(buildRequest({ action: 'register', approved: false }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('approval_required')
  })

  it('registers draft source', async () => {
    mocks.registerKbSourceDraft.mockResolvedValue({ source_id: 'src-1', inventory_source: 'supabase' })

    const res = await POST(buildRequest({
      action: 'register',
      approved: true,
      operator_id: 'op-1',
      confirm_token: 'token',
      title: 'Source',
      source_type: 'text',
      source_ref: 'hello world',
      kb_scope: 'general',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source_status).toBe('draft')
  })

  it('transitions draft source', async () => {
    mocks.transitionKbSourceItem.mockResolvedValue({ source_id: 'src-1', previous_status: 'draft', source_status: 'accepted', inventory_source: 'supabase' })

    const res = await POST(buildRequest({
      action: 'accept',
      approved: true,
      operator_id: 'op-1',
      confirm_token: 'token',
      source_id: 'src-1',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source_status).toBe('accepted')
  })
})
