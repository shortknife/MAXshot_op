import { describe, expect, it } from 'vitest'
import { kbUploadQc } from '@/lib/capabilities/kb-upload-qc'

describe('kbUploadQc', () => {
  it('accepts a valid markdown faq source with chunk counts', async () => {
    const output = await kbUploadQc({
      capability_id: 'capability.kb_upload_qc',
      execution_id: 'exec-1',
      intent: { type: 'task_management', extracted_slots: {} },
      slots: {
        source_type: 'markdown',
        source_ref: 'app/configs/faq-kb/account-access.md',
        kb_scope: 'general',
      },
    })

    expect(output.status).toBe('success')
    expect((output.result as { ingest_status?: string }).ingest_status).toBe('accepted')
    expect((output.result as { chunk_count?: number }).chunk_count).toBeGreaterThan(0)
  })

  it('marks unsupported url fetching as needs_review', async () => {
    const output = await kbUploadQc({
      capability_id: 'capability.kb_upload_qc',
      execution_id: 'exec-2',
      intent: { type: 'task_management', extracted_slots: {} },
      slots: {
        source_type: 'url',
        source_ref: 'https://example.com/help-center',
      },
    })

    expect(output.status).toBe('success')
    expect((output.result as { ingest_status?: string }).ingest_status).toBe('needs_review')
  })

  it('rejects missing markdown files', async () => {
    const output = await kbUploadQc({
      capability_id: 'capability.kb_upload_qc',
      execution_id: 'exec-3',
      intent: { type: 'task_management', extracted_slots: {} },
      slots: {
        source_type: 'markdown',
        source_ref: 'app/configs/faq-kb/missing.md',
      },
    })

    expect(output.status).toBe('success')
    expect((output.result as { ingest_status?: string }).ingest_status).toBe('rejected')
  })
})
