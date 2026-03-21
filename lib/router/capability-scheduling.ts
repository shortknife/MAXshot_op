import { CapabilityInputEnvelope, CapabilityOutput } from './types/capability'
import { dataFactQuery } from '../capabilities/data-fact-query'
import { businessDataQuery } from '../capabilities/business-data-query'
import { productDocQnA } from '../capabilities/product-doc-qna'
import { contentGenerator } from '../capabilities/content-generator'
import { contextAssembler } from '../capabilities/context-assembler'
import { getCapabilityDefinition, listActiveCapabilityDefinitions } from './capability-catalog'

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
    const byCanonicalId = new Map<string, CapabilityFunction>([
      ['capability.data_fact_query', businessDataQuery],
      ['capability.product_doc_qna', productDocQnA],
      ['capability.content_generator', contentGenerator],
      ['capability.context_assembler', contextAssembler],
      ['capability.publisher', pendingConfirmationCapability()],
    ])

    const activeCapabilityIds = new Set(listActiveCapabilityDefinitions().map((item) => item.capability_id))

    for (const [capabilityId, fn] of byCanonicalId.entries()) {
      if (!activeCapabilityIds.has(capabilityId)) continue
      this.capabilities.set(capabilityId, fn)
      const def = getCapabilityDefinition(capabilityId)
      if (def) {
        for (const alias of def.aliases) {
          this.capabilities.set(alias, fn)
        }
      }
    }
    this.capabilities.set('data_fact_query', dataFactQuery)
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

function pendingConfirmationCapability(): CapabilityFunction {
  return async (input: CapabilityInputEnvelope): Promise<CapabilityOutput> => ({
    capability_id: input.capability_id,
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: 'pending_confirmation_required',
    evidence: { sources: [], doc_quotes: null, fallback_reason: 'pending_confirmation_required' },
    audit: {
      capability_id: input.capability_id,
      capability_version: '1.0',
      status: 'failed',
      used_skills: [],
    },
    used_skills: [],
    metadata: { rejected_reason: 'pending_confirmation_required', fallback_reason: 'pending_confirmation_required' },
  })
}
