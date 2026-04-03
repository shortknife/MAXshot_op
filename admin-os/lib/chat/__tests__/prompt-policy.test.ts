import { describe, expect, it } from 'vitest'

import { evaluatePromptPolicy } from '@/lib/chat/prompt-policy'

describe('prompt policy', () => {
  it('allows maxshot intent stub with approved execution prompt', () => {
    const decision = evaluatePromptPolicy({
      customerId: 'maxshot',
      primaryCapabilityId: 'capability.product_doc_qna',
      promptRuntime: {
        assembly_mode: 'intent_plus_execution',
        prompt_count: 2,
        primary_prompt_slug: 'product_doc_qna',
        prompt_sources: ['local_stub', 'supabase'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '1',
          source: 'local_stub',
          hash: 'intent-hash',
          role: 'intent',
        },
        execution_prompt: {
          slug: 'product_doc_qna',
          version: '7',
          source: 'supabase',
          hash: 'exec-hash',
          role: 'execution',
        },
      },
    })

    expect(decision.outcome).toBe('allow')
  })

  it('reviews ops-observer when intent prompt comes from local stub', () => {
    const decision = evaluatePromptPolicy({
      customerId: 'ops-observer',
      primaryCapabilityId: 'capability.product_doc_qna',
      promptRuntime: {
        assembly_mode: 'intent_plus_execution',
        prompt_count: 2,
        primary_prompt_slug: 'product_doc_qna',
        prompt_sources: ['local_stub', 'supabase'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '1',
          source: 'local_stub',
          hash: 'intent-hash',
          role: 'intent',
        },
        execution_prompt: {
          slug: 'product_doc_qna',
          version: '7',
          source: 'supabase',
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
        prompt_sources: ['supabase'],
        intent_prompt: {
          slug: 'intent_analyzer',
          version: '1',
          source: 'supabase',
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
