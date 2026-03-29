import { CapabilityInputEnvelope, CapabilityOutput } from '../types'
import { dataFactQuery } from '../capabilities/data-fact-query'
import { productDocQnA } from '../capabilities/product-doc-qna'
import { contentGenerator } from '../capabilities/content-generator'

export class CapabilityRegistry {
  private static instance: CapabilityRegistry
  private capabilities: Map<string, CapabilityFunction>

  private constructor() {
    this.capabilities = new Map()
    this.registerDefaultCapabilities()
  }

  static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry()
    }
    return CapabilityRegistry.instance
  }

  private registerDefaultCapabilities() {
    this.capabilities.set('data_fact_query', dataFactQuery)
    this.capabilities.set('product_doc_qna', productDocQnA)
    this.capabilities.set('content_generator', contentGenerator)
  }

  registerCapability(id: string, fn: CapabilityFunction) {
    this.capabilities.set(id, fn)
  }

  async executeCapability(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
    const capabilityFn = this.capabilities.get(input.capability_id)

    if (!capabilityFn) {
      return {
        capability_id: input.capability_id,
        capability_version: '1.0',
        status: 'failed',
        result: null,
        error: `Capability not found: ${input.capability_id}`,
        evidence: { sources: [], doc_quotes: null, fallback_reason: 'capability_not_found' },
        audit: {
          capability_id: input.capability_id,
          capability_version: '1.0',
          status: 'failed',
          used_skills: [],
        },
        used_skills: [],
        metadata: { rejected_reason: 'capability_not_found', fallback_reason: 'capability_not_found' },
      }
    }

    return capabilityFn(input)
  }

}

type CapabilityFunction = (input: CapabilityInputEnvelope) => Promise<CapabilityOutput>
