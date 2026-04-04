import { describe, expect, it } from 'vitest'

import { attachPromptRuntime, buildPromptRuntime } from '@/lib/chat/prompt-runtime'

describe('prompt runtime', () => {
  it('builds a unified runtime snapshot from intent and execution prompt metadata', () => {
    const snapshot = buildPromptRuntime({
      data: {
        meta: {
          intent_prompt: {
            slug: 'intent_analyzer',
            version: '2',
            source: 'filesystem_md',
            hash: 'intent-hash',
          },
          qna_prompt: {
            prompt_slug: 'product_doc_qna',
            prompt_version: '1',
            prompt_source: 'filesystem_md',
            prompt_hash: 'qna-hash',
          },
        },
      },
    })

    expect(snapshot.assembly_mode).toBe('intent_plus_execution')
    expect(snapshot.primary_prompt_slug).toBe('product_doc_qna')
    expect(snapshot.prompt_count).toBe(2)
    expect(snapshot.prompt_sources).toEqual(['filesystem_md'])
  })

  it('attaches prompt runtime into response meta', () => {
    const attached = attachPromptRuntime({
      payload: { success: true, data: { meta: {} } },
      promptRuntime: {
        assembly_mode: 'intent_only',
        prompt_count: 1,
        primary_prompt_slug: 'intent_analyzer',
        prompt_sources: ['filesystem_md'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '2',
          source: 'filesystem_md',
          hash: 'intent-hash',
          role: 'intent',
        },
        execution_prompt: null,
      },
    }) as { data: { meta: { prompt_runtime: { primary_prompt_slug: string } } } }

    expect(attached.data.meta.prompt_runtime.primary_prompt_slug).toBe('intent_analyzer')
  })
})
