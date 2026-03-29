import { buildCapabilityRegistryRefIds, getCapabilityDefinition, getPrimaryCapabilityId, resolveCapabilityIds } from './capability-catalog'
import type { Execution } from './types/execution'
import type { Intent } from './types/capability'

export type RoutingDecision = {
  primary_capability_id: string
  matched_capability_ids: string[]
  intent_name: string
  intent: Intent
  memory_refs_ref: string[]
  dispatch_ready: true
}

type RoutingDecisionBlocked = {
  dispatch_ready: false
  reason: string
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {}
}

export function isRunnableExecutionStatus(status: unknown): boolean {
  return String(status || '').trim().toLowerCase() === 'confirmed'
}

export function buildRoutingDecisionFromExecution(execution: Execution): RoutingDecision | RoutingDecisionBlocked {
  if (!isRunnableExecutionStatus(execution.status)) {
    return {
      dispatch_ready: false,
      reason: 'status_not_confirmed',
    }
  }

  const payload = toRecord(execution.payload)
  const sealedExecution = toRecord(payload.sealed_execution)
  const sealedSlots = toRecord(sealedExecution.slots)
  const fallbackIntent = toRecord(payload.intent)
  const fallbackSlots = toRecord(payload.slots)
  const fallbackExtractedSlots =
    fallbackIntent.extracted_slots && typeof fallbackIntent.extracted_slots === 'object'
      ? (fallbackIntent.extracted_slots as Record<string, unknown>)
      : {}

  const matchedCapabilityIds = resolveCapabilityIds(
    [
      ...(Array.isArray(sealedExecution.matched_capability_ids) ? sealedExecution.matched_capability_ids : []),
      sealedExecution.primary_capability_id,
      ...(Array.isArray(fallbackIntent.matched_capability_ids) ? fallbackIntent.matched_capability_ids : []),
      ...(Array.isArray(fallbackExtractedSlots.matched_capability_ids) ? fallbackExtractedSlots.matched_capability_ids : []),
      fallbackExtractedSlots.matched_capability_id,
      payload.primary_capability_id,
      payload.matched_capability_ids,
    ].flat(),
    3
  )
  const primaryCapabilityId = getPrimaryCapabilityId([
    sealedExecution.primary_capability_id,
    ...matchedCapabilityIds,
  ])

  if (!primaryCapabilityId || !getCapabilityDefinition(primaryCapabilityId)) {
    return {
      dispatch_ready: false,
      reason: 'missing_primary_capability',
    }
  }

  const intentName =
    String(sealedExecution.intent_name || fallbackIntent.type || '').trim() || 'out_of_scope'

  const slots =
    Object.keys(sealedSlots).length > 0
      ? { ...sealedSlots }
      : Object.keys(fallbackSlots).length > 0
        ? { ...fallbackSlots }
        : { ...fallbackExtractedSlots }

  const intent: Intent = {
    type: intentName,
    extracted_slots: {
      ...slots,
      matched_capability_ids: matchedCapabilityIds,
      matched_capability_id: primaryCapabilityId,
    },
    matched_capability_ids: matchedCapabilityIds,
  }

  return {
    primary_capability_id: primaryCapabilityId,
    matched_capability_ids: matchedCapabilityIds,
    intent_name: intentName,
    intent,
    memory_refs_ref: buildCapabilityRegistryRefIds(matchedCapabilityIds),
    dispatch_ready: true,
  }
}
