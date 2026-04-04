import { describe, expect, it } from 'vitest'

import { getPromptBySlug, loadActivePromptInventory, loadPromptHistories } from '@/lib/prompts/prompt-registry'

describe('prompt filesystem registry', () => {
  it('resolves canonical prompt slug from markdown inventory', async () => {
    const resolved = await getPromptBySlug('product_doc_qna')
    expect(resolved?.source).toBe('filesystem_md')
    expect(resolved?.prompt.slug).toBe('product_doc_qna')
    expect(resolved?.prompt.file_path).toContain('prompts/execution/product_doc_qna.v1.md')
  })

  it('resolves legacy alias to canonical prompt', async () => {
    const resolved = await getPromptBySlug('product_doc_qna_op_v1')
    expect(resolved?.prompt.slug).toBe('product_doc_qna')
  })

  it('loads active inventory and histories from markdown files', async () => {
    const inventory = await loadActivePromptInventory()
    const histories = await loadPromptHistories()
    expect(inventory.length).toBeGreaterThanOrEqual(7)
    expect(histories.intent_analyzer?.[0]?.is_active).toBe(true)
  })
})
