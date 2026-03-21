import { buildMemoryRuntime } from '@/lib/capabilities/memory-refs'
import type {
  ActiveContextSnapshot,
  ContextEnvelope,
  EffectiveQueryPolicy,
  PendingClarificationSnapshot,
  PolicyDecision,
  RecallResult,
  SessionResolution,
  TurnRelation,
} from '@/lib/chat/context-manager/types'
import { listActiveCapabilityDefinitions, getCapabilityRegistryMeta, mergeMemoryRefIds } from '@/lib/router/capability-catalog'

function toMemoryRefs(refIds: string[]): Array<{ id: string }> {
  return refIds.map((id) => ({ id }))
}

export function assembleContextEnvelope(params: {
  sessionResolution: SessionResolution
  turnRelation: TurnRelation
  effectiveQuery: string
  pendingClarification: PendingClarificationSnapshot
  activeContext: ActiveContextSnapshot
  policyDecision: PolicyDecision
  effectiveQueryPolicy: EffectiveQueryPolicy
  recall: RecallResult | null
  matchedCapabilityIds: string[]
}): ContextEnvelope {
  const registryMeta = getCapabilityRegistryMeta()
  const activeCapabilityIds = listActiveCapabilityDefinitions().map((item) => item.capability_id)
  const memoryRefIds = mergeMemoryRefIds([], params.matchedCapabilityIds)
  const memoryRuntime = buildMemoryRuntime(toMemoryRefs(memoryRefIds))

  return {
    session_resolution: params.sessionResolution,
    turn_relation: params.turnRelation,
    conversation_context: {
      pending_clarification: params.pendingClarification,
      active_context: params.activeContext,
    },
    registry_context: {
      registry_id: registryMeta.registry_id,
      registry_version: registryMeta.version,
      active_capability_ids: activeCapabilityIds,
    },
    memory_runtime: memoryRuntime,
    effective_query: params.effectiveQuery,
    policy_decision: params.policyDecision,
    effective_query_policy: params.effectiveQueryPolicy,
    recall: params.recall,
    context_ready: true,
  }
}
