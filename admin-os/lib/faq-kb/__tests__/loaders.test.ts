import { describe, expect, it } from 'vitest'

import { buildKbQcPreview, loadFaqKbManifest, loadFaqReviewQueue } from '@/lib/faq-kb/loaders'

describe('faq kb loaders', () => {
  it('loads bounded kb manifest', () => {
    const manifest = loadFaqKbManifest()
    expect(manifest.documents.length).toBeGreaterThanOrEqual(3)
  })

  it('loads review queue seed through loader', () => {
    const queue = loadFaqReviewQueue()
    expect(queue.items.length).toBeGreaterThan(0)
    expect(queue.items[0]?.review_id).toBeTruthy()
  })

  it('builds qc preview from manifest and synthetic seed items', async () => {
    const preview = await buildKbQcPreview()
    expect(preview.items.some((item) => item.source_id === 'account-access')).toBe(true)
    expect(preview.items.some((item) => item.source_id === 'billing-invoice-upload-url')).toBe(true)
  })
})
