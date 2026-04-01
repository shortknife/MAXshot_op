import { CapabilityInputEnvelope, CapabilityOutput } from './types/capability'
import { dataFactQuery } from '../capabilities/data-fact-query'
import { businessDataQuery } from '../capabilities/business-data-query'
import { productDocQnA } from '../capabilities/product-doc-qna'
import { faqAnswering } from '../capabilities/faq-answering'
import { kbUploadQc } from '../capabilities/kb-upload-qc'
import { contentGenerator } from '../capabilities/content-generator'
import { contextAssembler } from '../capabilities/context-assembler'
import { getCapabilityDefinition, listActiveCapabilityDefinitions } from './capability-catalog'
import { buildCapabilityFailureOutput, normalizeCapabilityExecutionResult } from './capability-execution'

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
      ['capability.faq_answering', faqAnswering],
      ['capability.kb_upload_qc', kbUploadQc],
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
      const normalizedCapabilityId = getCapabilityDefinition(input.capability_id)?.capability_id || String(input.capability_id || '').trim()
      if (normalizedCapabilityId === 'capability.publisher') {
        return buildCapabilityFailureOutput({
          requested_capability_id: input.capability_id,
          reason: 'pending_confirmation_required',
        })
      }
      return buildCapabilityFailureOutput({
        requested_capability_id: input.capability_id,
        reason: 'capability_not_found',
      })
    }

    const output = await capabilityFn(input)
    return normalizeCapabilityExecutionResult(input.capability_id, output)
  }
}

type CapabilityFunction = (input: CapabilityInputEnvelope) => Promise<CapabilityOutput>

function pendingConfirmationCapability(): CapabilityFunction {
  return async (input: CapabilityInputEnvelope): Promise<CapabilityOutput> =>
    buildCapabilityFailureOutput({
      requested_capability_id: input.capability_id,
      reason: 'pending_confirmation_required',
    })
}
