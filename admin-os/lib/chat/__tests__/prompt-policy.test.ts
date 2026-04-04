import { describe, expect, it } from 'vitest'

import { evaluatePromptPolicy } from '@/lib/chat/prompt-policy'

describe('prompt policy', () => {
  it('allows filesystem-managed intent and execution prompts', () => {
    const decision = evaluatePromptPolicy({
      customerId: 'maxshot',
      primaryCapabilityId: 'capability.product_doc_qna',
      promptRuntime: {
        assembly_mode: 'intent_plus_execution',
        prompt_count: 2,
        primary_prompt_slug: 'product_doc_qna',
        prompt_sources: ['filesystem_md'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '2',
          source: 'filesystem_md',
          hash: 'intent-hash',
          role: 'intent',
        },
        execution_prompt: {
          slug: 'product_doc_qna',
          version: '1',
          source: 'filesystem_md',
          hash: 'exec-hash',
          role: 'execution',
        },
      },
    })

    expect(decision.outcome).toBe('allow')
  })

  it('reviews intent source that is not filesystem-managed', () => {
    const decision = evaluatePromptPolicy({
      customerId: 'ops-observer',
      primaryCapabilityId: 'capability.product_doc_qna',
      promptRuntime: {
        assembly_mode: 'intent_plus_execution',
        prompt_count: 2,
        primary_prompt_slug: 'product_doc_qna',
        prompt_sources: ['local_stub', 'filesystem_md'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '2',
          source: 'local_stub',
          hash: 'intent-hash',
          role: 'intent',
        },
        execution_prompt: {
          slug: 'product_doc_qna',
          version: '1',
          source: 'filesystem_md',
          hash: 'exec-hash',
          role: 'execution',
        },
      },
    })

    expect(decision.outcome).toBe('review')
    expect(decision.reason).toBe('intent_prompt_source_not_allowed')
  })

  it('reviews missing execution prompt when capability requires it', () => {
    const decision = evaluatePromptPolicy({
      customerId: 'maxshot',
      primaryCapabilityId: 'capability.product_doc_qna',
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
    })

    expect(decision.outcome).toBe('review')
    expect(decision.reason).toBe('execution_prompt_required')
  })
})
