import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  upsert: vi.fn(),
  kbUploadQc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

vi.mock('@/lib/capabilities/kb-upload-qc', () => ({
  kbUploadQc: mocks.kbUploadQc,
}))

import { loadKbQcRuntimePreview } from '@/lib/faq-kb/qc-runtime'

beforeEach(() => {
  mocks.from.mockReset()
  mocks.select.mockReset()
  mocks.order.mockReset()
  mocks.limit.mockReset()
  mocks.upsert.mockReset()
  mocks.kbUploadQc.mockReset()
})

describe('kb qc runtime preview', () => {
  it('uses runtime rows when full snapshot exists', async () => {
    mocks.from.mockReturnValue({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({
            data: [
              {
                source_id: 'account-access',
                title: 'Account Access FAQ',
                kb_scope: 'general',
                source_type: 'markdown',
                ingest_status: 'accepted',
                document_count: 1,
                chunk_count: 4,
                qc_flags: [],
                generated_at: '2026-04-02T10:00:00.000Z',
              },
              {
                source_id: 'plans-billing',
                title: 'Plans and Billing FAQ',
                kb_scope: 'billing',
                source_type: 'markdown',
                ingest_status: 'accepted',
                document_count: 1,
                chunk_count: 4,
                qc_flags: [],
                generated_at: '2026-04-02T10:00:00.000Z',
              },
              {
                source_id: 'knowledge-base',
                title: 'Knowledge Base FAQ',
                kb_scope: 'kb',
                source_type: 'markdown',
                ingest_status: 'accepted',
                document_count: 1,
                chunk_count: 4,
                qc_flags: [],
                generated_at: '2026-04-02T10:00:00.000Z',
              },
              {
                source_id: 'security-access',
                title: 'Security and Access FAQ',
                kb_scope: 'security',
                source_type: 'markdown',
                ingest_status: 'accepted',
                document_count: 1,
                chunk_count: 4,
                qc_flags: [],
                generated_at: '2026-04-02T10:00:00.000Z',
              },
              {
                source_id: 'integrations-sync',
                title: 'Integrations and Sync FAQ',
                kb_scope: 'integrations',
                source_type: 'markdown',
                ingest_status: 'accepted',
                document_count: 1,
                chunk_count: 4,
                qc_flags: [],
                generated_at: '2026-04-02T10:00:00.000Z',
              },
            ],
            error: null,
          }),
        }),
      }),
    })

    const preview = await loadKbQcRuntimePreview()
    expect(preview.source).toBe('supabase')
    expect(preview.items).toHaveLength(5)
    expect(mocks.kbUploadQc).not.toHaveBeenCalled()
  })

  it('computes and returns preview when runtime table is unavailable', async () => {
    mocks.from.mockImplementation(() => ({
      select: mocks.select.mockReturnValue({
        order: mocks.order.mockReturnValue({
          limit: mocks.limit.mockResolvedValue({ data: null, error: new Error('relation faq_kb_qc_snapshot_op does not exist') }),
        }),
      }),
      upsert: mocks.upsert.mockResolvedValue({ error: new Error('relation faq_kb_qc_snapshot_op does not exist') }),
    }))
    mocks.kbUploadQc.mockResolvedValue({
      result: { ingest_status: 'accepted', document_count: 1, chunk_count: 4, qc_flags: [] },
    })

    const preview = await loadKbQcRuntimePreview()
    expect(preview.source).toBe('computed')
    expect(preview.items).toHaveLength(5)
    expect(mocks.kbUploadQc).toHaveBeenCalled()
  })
})
