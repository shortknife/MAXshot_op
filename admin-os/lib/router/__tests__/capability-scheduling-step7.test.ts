import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  businessDataQuery: vi.fn(),
  productDocQnA: vi.fn(),
  faqAnswering: vi.fn(),
  contentGenerator: vi.fn(),
  contextAssembler: vi.fn(),
}))

vi.mock('@/lib/capabilities/data-fact-query', () => ({
  dataFactQuery: mocks.businessDataQuery,
}))

vi.mock('@/lib/capabilities/business-data-query', () => ({
  businessDataQuery: mocks.businessDataQuery,
}))

vi.mock('@/lib/capabilities/product-doc-qna', () => ({
  productDocQnA: mocks.productDocQnA,
}))

vi.mock('@/lib/capabilities/faq-answering', () => ({
  faqAnswering: mocks.faqAnswering,
}))

vi.mock('@/lib/capabilities/content-generator', () => ({
  contentGenerator: mocks.contentGenerator,
}))

vi.mock('@/lib/capabilities/context-assembler', () => ({
  contextAssembler: mocks.contextAssembler,
}))

import { CapabilityRegistry } from '@/lib/router/capability-scheduling'

describe('Step7 capability registry', () => {
  beforeEach(() => {
    mocks.businessDataQuery.mockReset()
    mocks.productDocQnA.mockReset()
    mocks.faqAnswering.mockReset()
    mocks.contentGenerator.mockReset()
    mocks.contextAssembler.mockReset()
  })

  it('returns explicit failure for unknown capabilities', async () => {
    const registry = CapabilityRegistry.getInstance()
    const output = await registry.executeCapability({
      capability_id: 'capability.unknown',
      execution_id: 'exec-1',
      intent: { type: 'business_query', extracted_slots: {} },
      slots: {},
    })

    expect(output.status).toBe('failed')
    expect(output.error).toBe('capability_not_found')
  })

  it('keeps publisher blocked with pending confirmation semantics', async () => {
    const registry = CapabilityRegistry.getInstance()
    const output = await registry.executeCapability({
      capability_id: 'capability.publisher',
      execution_id: 'exec-1',
      intent: { type: 'marketing_gen', extracted_slots: {} },
      slots: {},
    })

    expect(output.status).toBe('failed')
    expect(output.error).toBe('pending_confirmation_required')
    expect(output.metadata?.rejected_reason).toBe('pending_confirmation_required')
  })

  it('normalizes successful business capability outputs to canonical ids', async () => {
    mocks.businessDataQuery.mockResolvedValue({
      capability_id: 'business_data_query',
      capability_version: '1.0',
      status: 'success',
      result: { rows: [{ value: 1 }] },
      evidence: { sources: [{ source: 'stub' }], doc_quotes: null },
      audit: {
        capability_id: 'business_data_query',
        capability_version: '1.0',
        status: 'success',
        used_skills: ['stub'],
      },
      used_skills: ['stub'],
    })

    const registry = CapabilityRegistry.getInstance()
    const output = await registry.executeCapability({
      capability_id: 'capability.data_fact_query',
      execution_id: 'exec-1',
      intent: { type: 'business_query', extracted_slots: { scope: 'yield' } },
      slots: { scope: 'yield' },
    })

    expect(output.status).toBe('success')
    expect(output.capability_id).toBe('capability.data_fact_query')
    expect(output.audit.capability_id).toBe('capability.data_fact_query')
  })

  it('executes product qna through the qna capability path', async () => {
    mocks.productDocQnA.mockResolvedValue({
      capability_id: 'product_doc_qna',
      capability_version: '1.1',
      status: 'success',
      result: { answer: 'MAXshot definition' },
      evidence: { sources: [{ source: 'stub' }], doc_quotes: null },
      audit: {
        capability_id: 'product_doc_qna',
        capability_version: '1.1',
        status: 'success',
        used_skills: ['stub'],
      },
      used_skills: ['stub'],
    })

    const registry = CapabilityRegistry.getInstance()
    const output = await registry.executeCapability({
      capability_id: 'capability.product_doc_qna',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: {} },
      slots: {},
    })

    expect(output.status).toBe('success')
    expect(output.capability_id).toBe('capability.product_doc_qna')
  })

  it('executes faq answering through its canonical capability path', async () => {
    mocks.faqAnswering.mockResolvedValue({
      capability_id: 'faq_answering',
      capability_version: '1.0',
      status: 'success',
      result: { answer: 'Use the forgot password link.' },
      evidence: { sources: [{ source: 'stub' }], doc_quotes: null },
      audit: {
        capability_id: 'faq_answering',
        capability_version: '1.0',
        status: 'success',
        used_skills: ['stub'],
      },
      used_skills: ['stub'],
    })

    const registry = CapabilityRegistry.getInstance()
    const output = await registry.executeCapability({
      capability_id: 'capability.faq_answering',
      execution_id: 'exec-1',
      intent: { type: 'general_qna', extracted_slots: { question: 'How do I reset my password?' } },
      slots: { question: 'How do I reset my password?' },
    })

    expect(output.status).toBe('success')
    expect(output.capability_id).toBe('capability.faq_answering')
  })

  it('executes content generator and context assembler through their canonical paths', async () => {
    mocks.contentGenerator.mockResolvedValue({
      capability_id: 'content_generator',
      capability_version: '1.0',
      status: 'success',
      result: { draft: 'copy' },
      evidence: { sources: [{ source: 'stub' }], doc_quotes: null },
      audit: {
        capability_id: 'content_generator',
        capability_version: '1.0',
        status: 'success',
        used_skills: ['stub'],
      },
      used_skills: ['stub'],
    })
    mocks.contextAssembler.mockResolvedValue({
      capability_id: 'context_assembler',
      capability_version: '1.0',
      status: 'success',
      result: { context: {} },
      evidence: { sources: [{ source: 'stub' }], doc_quotes: null },
      audit: {
        capability_id: 'context_assembler',
        capability_version: '1.0',
        status: 'success',
        used_skills: ['stub'],
      },
      used_skills: ['stub'],
    })

    const registry = CapabilityRegistry.getInstance()
    const content = await registry.executeCapability({
      capability_id: 'capability.content_generator',
      execution_id: 'exec-1',
      intent: { type: 'marketing_gen', extracted_slots: { topic: 'launch' } },
      slots: { topic: 'launch' },
    })
    const context = await registry.executeCapability({
      capability_id: 'capability.context_assembler',
      execution_id: 'exec-1',
      intent: { type: 'marketing_gen', extracted_slots: {} },
      slots: {},
    })

    expect(content.status).toBe('success')
    expect(content.capability_id).toBe('capability.content_generator')
    expect(context.status).toBe('success')
    expect(context.capability_id).toBe('capability.context_assembler')
  })
})
