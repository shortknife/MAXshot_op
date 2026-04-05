import type { CustomerWorkspacePreset } from '@/lib/customers/workspace'

const CAPABILITY_PLANE_MAP: Record<string, string> = {
  'capability.data_fact_query': 'ops_data',
  'capability.faq_answering': 'faq_kb',
  'capability.faq_fallback': 'faq_kb',
  'capability.faq_qa_review': 'faq_kb',
  'capability.kb_upload_qc': 'faq_kb',
  'capability.product_doc_qna': 'product_docs',
  'capability.content_generator': 'marketing',
  'capability.context_assembler': 'marketing',
}

const ROUTING_PRIORITY_INTENTS = new Set([
  'business_query',
  'ops_query',
  'audit_query',
  'memory_query',
  'general_qna',
  'documentation',
  'product_qna',
])

export type CustomerRoutingPriorityDecision = {
  primaryCapabilityId: string | null
  matchedCapabilityIds: string[]
  preferredPlane: string | null
  applied: boolean
  reason: string | null
}

export function resolveCapabilityPlane(capabilityId: string | null | undefined): string | null {
  if (!capabilityId) return null
  return CAPABILITY_PLANE_MAP[capabilityId] || null
}

export function applyCustomerRoutingPriority(params: {
  workspacePreset?: CustomerWorkspacePreset | null
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
}): CustomerRoutingPriorityDecision {
  const { workspacePreset, intentType, canonicalIntentType, primaryCapabilityId } = params
  const matchedCapabilityIds = Array.from(new Set((params.matchedCapabilityIds || []).filter(Boolean)))
  const preferredPlane = workspacePreset?.primary_plane || workspacePreset?.recommended_route_order?.[0] || null

  if (!workspacePreset || matchedCapabilityIds.length <= 1 || !ROUTING_PRIORITY_INTENTS.has(canonicalIntentType || intentType)) {
    return {
      primaryCapabilityId,
      matchedCapabilityIds,
      preferredPlane,
      applied: false,
      reason: null,
    }
  }

  const preferredCaps = workspacePreset.preferred_capabilities || []
  const routeOrder = workspacePreset.recommended_route_order || []
  const originalPrimary = primaryCapabilityId
  const indexed = matchedCapabilityIds.map((capabilityId, index) => ({
    capabilityId,
    index,
    preferredIndex: preferredCaps.indexOf(capabilityId),
    plane: resolveCapabilityPlane(capabilityId),
  }))

  indexed.sort((a, b) => {
    const byPreferred = (a.preferredIndex === -1 ? Number.MAX_SAFE_INTEGER : a.preferredIndex) - (b.preferredIndex === -1 ? Number.MAX_SAFE_INTEGER : b.preferredIndex)
    if (byPreferred !== 0) return byPreferred

    const aPlaneIndex = a.plane ? routeOrder.indexOf(a.plane) : -1
    const bPlaneIndex = b.plane ? routeOrder.indexOf(b.plane) : -1
    const byPlane = (aPlaneIndex === -1 ? Number.MAX_SAFE_INTEGER : aPlaneIndex) - (bPlaneIndex === -1 ? Number.MAX_SAFE_INTEGER : bPlaneIndex)
    if (byPlane !== 0) return byPlane

    return a.index - b.index
  })

  const sorted = indexed.map((item) => item.capabilityId)
  const nextPrimary = sorted[0] || primaryCapabilityId || null
  const applied = sorted.join('::') !== matchedCapabilityIds.join('::') || nextPrimary !== originalPrimary
  const reason = applied
    ? `workspace_route_priority:${preferredPlane || 'none'}`
    : null

  return {
    primaryCapabilityId: nextPrimary,
    matchedCapabilityIds: sorted,
    preferredPlane,
    applied,
    reason,
  }
}
