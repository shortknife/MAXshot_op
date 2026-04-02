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

  it('rejects register when customer mutation policy does not allow it', async () => {
    const res = await POST(buildRequest({
      action: 'register',
      approved: true,
      operator_id: 'op-1',
      confirm_token: 'token',
      title: 'Source',
      customer_id: 'nexa-demo',
      source_type: 'text',
      source_ref: 'hello world',
      kb_scope: 'general',
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('customer_capability_not_allowed')
    expect(mocks.registerKbSourceDraft).not.toHaveBeenCalled()
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

  it('rejects transition when operator is outside customer scope', async () => {
    mocks.transitionKbSourceItem.mockRejectedValue(new Error('operator_customer_scope_not_allowed'))

    const res = await POST(buildRequest({
      action: 'accept',
      approved: true,
      operator_id: 'demo-reviewer',
      confirm_token: 'token',
      source_id: 'src-1',
    }))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('operator_customer_scope_not_allowed')
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
