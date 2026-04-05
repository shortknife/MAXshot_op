import { describe, expect, it } from 'vitest'
import { applyCustomerRoutingPriority } from '@/lib/chat/customer-routing-priority'
import type { CustomerWorkspacePreset } from '@/lib/customers/workspace'

const demoPreset: CustomerWorkspacePreset = {
  customer_id: 'nexa-demo',
  workspace_version: '1',
  primary_plane: 'faq_kb',
  default_entry_path: '/chat',
  preferred_capabilities: ['capability.faq_answering', 'capability.product_doc_qna'],
  focused_surfaces: ['chat'],
  recommended_route_order: ['faq_kb', 'product_docs'],
  summary: 'faq first',
  quick_queries: [],
  file_path: 'customer-assets/nexa-demo/workspace.md',
}

const observerPreset: CustomerWorkspacePreset = {
  customer_id: 'ops-observer',
  workspace_version: '1',
  primary_plane: 'ops_data',
  default_entry_path: '/chat',
  preferred_capabilities: ['capability.data_fact_query', 'capability.product_doc_qna'],
  focused_surfaces: ['chat'],
  recommended_route_order: ['ops_data', 'product_docs'],
  summary: 'ops first',
  quick_queries: [],
  file_path: 'customer-assets/ops-observer/workspace.md',
}

describe('customer routing priority', () => {
  it('prefers faq capability for faq-first workspaces when multiple qna capabilities match', () => {
    const result = applyCustomerRoutingPriority({
      workspacePreset: demoPreset,
      intentType: 'general_qna',
      canonicalIntentType: 'general_qna',
      matchedCapabilityIds: ['capability.product_doc_qna', 'capability.faq_answering'],
      primaryCapabilityId: 'capability.product_doc_qna',
    })

    expect(result.primaryCapabilityId).toBe('capability.faq_answering')
    expect(result.matchedCapabilityIds[0]).toBe('capability.faq_answering')
    expect(result.applied).toBe(true)
  })

  it('prefers ops capability for ops-first workspaces when multiple planes match', () => {
    const result = applyCustomerRoutingPriority({
      workspacePreset: observerPreset,
      intentType: 'ops_query',
      canonicalIntentType: 'ops_query',
      matchedCapabilityIds: ['capability.product_doc_qna', 'capability.data_fact_query'],
      primaryCapabilityId: 'capability.product_doc_qna',
    })

    expect(result.primaryCapabilityId).toBe('capability.data_fact_query')
    expect(result.matchedCapabilityIds[0]).toBe('capability.data_fact_query')
    expect(result.reason).toBe('workspace_route_priority:ops_data')
  })
})
