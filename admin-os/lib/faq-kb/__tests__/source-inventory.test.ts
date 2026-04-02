import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  upsert: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateSelect: vi.fn(),
  single: vi.fn(),
  kbUploadQc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

vi.mock('@/lib/capabilities/kb-upload-qc', () => ({
  kbUploadQc: mocks.kbUploadQc,
}))

import { loadKbSourceInventoryRuntime, registerKbSourceDraft, transitionKbSourceItem } from '@/lib/faq-kb/source-inventory'

beforeEach(() => {
  for (const key of Object.keys(mocks) as Array<keyof typeof mocks>) mocks[key].mockReset()
})

describe('kb source inventory runtime', () => {
  it('falls back to computed inventory when runtime store is unavailable', async () => {
    mocks.kbUploadQc.mockResolvedValue({
      result: { ingest_status: 'accepted', document_count: 1, chunk_count: 2, qc_flags: [] },
    })
    mocks.from.mockImplementation((table: string) => {
      if (table === 'faq_kb_source_inventory_op') {
        return {
          select: mocks.select.mockReturnValue({
            order: mocks.order.mockReturnValue({
              limit: mocks.limit.mockResolvedValue({ data: null, error: new Error('relation faq_kb_source_inventory_op does not exist') }),
            }),
          }),
        }
      }

      return {
        select: mocks.select.mockReturnValue({
          order: mocks.order.mockReturnValue({
            limit: mocks.limit.mockResolvedValue({ data: null, error: new Error('relation faq_kb_qc_snapshot_op does not exist') }),
          }),
        }),
        upsert: mocks.upsert.mockResolvedValue({ error: null }),
      }
    })

    const runtime = await loadKbSourceInventoryRuntime()
    expect(runtime.source).toBe('computed')
    expect(runtime.items.length).toBeGreaterThan(0)
  })

  it('registers draft source when runtime store is available', async () => {
    mocks.kbUploadQc.mockResolvedValue({
      result: { ingest_status: 'needs_review', document_count: 1, chunk_count: 3, qc_flags: [] },
    })
    mocks.from.mockReturnValue({
      upsert: mocks.upsert.mockResolvedValue({ error: null }),
    })

    const result = await registerKbSourceDraft({
      title: 'New FAQ Source',
      kb_scope: 'billing',
      source_type: 'text',
      source_ref: 'hello world from faq',
      uploaded_by: 'op-1',
    })

    expect(result?.inventory_source).toBe('supabase')
    expect(result?.source_id).toContain('new-faq-source')
  })


  it('blocks transitions for customers without mutation policy', async () => {
    mocks.from.mockImplementation(() => ({
      select: mocks.select.mockReturnValue({
        eq: mocks.eq.mockReturnValue({
          maybeSingle: mocks.maybeSingle.mockResolvedValue({ data: { source_id: 'src-2', source_status: 'draft', customer_id: 'nexa-demo' }, error: null }),
        }),
      }),
      update: mocks.update,
    }))

    await expect(transitionKbSourceItem({ source_id: 'src-2', action: 'accept', operator_id: 'op-1' })).rejects.toThrow('customer_capability_not_allowed')
  })

  it('transitions draft source to accepted', async () => {
    mocks.from.mockImplementation(() => ({
      select: mocks.select.mockReturnValue({
        eq: mocks.eq.mockReturnValue({
          maybeSingle: mocks.maybeSingle.mockResolvedValue({ data: { source_id: 'src-1', source_status: 'draft', customer_id: 'maxshot' }, error: null }),
        }),
      }),
      update: mocks.update.mockReturnValue({
        eq: mocks.updateEq.mockReturnValue({
          select: mocks.updateSelect.mockReturnValue({
            single: mocks.single.mockResolvedValue({ data: { source_id: 'src-1', source_status: 'accepted' }, error: null }),
          }),
        }),
      }),
    }))

    const result = await transitionKbSourceItem({ source_id: 'src-1', action: 'accept', operator_id: 'op-1' })
    expect(result).toEqual({
      source_id: 'src-1',
      previous_status: 'draft',
      source_status: 'accepted',
      inventory_source: 'supabase',
    })
  })
})
