import {
  getCapabilityDefinition,
  getPrimaryCapabilityDefinition,
  MAX_MATCHED_CAPABILITIES,
  normalizeCapabilityCandidates,
  resolveCapabilityIds,
  type CapabilityDefinition,
} from '@/lib/router/capability-catalog'

export type ExecutionMode = 'deterministic' | 'llm_heavy' | 'hybrid'
export type GateResult = 'continue_chat' | 'pass' | 'require_confirmation'

export type GateDecision = {
  gate_result: GateResult
  require_confirmation: boolean
  gate_reason: string
  blocking_fields: string[]
  safe_to_seal: boolean
  capability_binding: {
    capability_id: string
    matched_capability_ids: string[]
  } | null
  confirmation_request?: {
    preview: Record<string, unknown>
    token: string
    summary: string
  }
  reason_for_pending?: string
  message: string
  audit: Record<string, unknown>
}

export type GateCheckInput = {
  intent_name?: unknown
  capability_binding?: { capability_id?: unknown } | null
  matched_capability_ids?: unknown
  execution_mode?: unknown
  entry_channel?: unknown
  slots?: unknown
  extracted_slots?: unknown
  need_clarification?: unknown
  query_contract?: {
    completeness?: {
      ready?: unknown
      missing_slots?: unknown
    }
  } | null
}

function isValidExecutionMode(value: unknown): value is ExecutionMode {
  return ['deterministic', 'llm_heavy', 'hybrid'].includes(String(value || ''))
}

function toRequiredRuntimeSlots(runtimeSchema: unknown): string[] {
  if (!runtimeSchema || typeof runtimeSchema !== 'object') return []
  const required = (runtimeSchema as { required?: unknown }).required
  return Array.isArray(required)
    ? required.map((item) => String(item || '').trim()).filter(Boolean)
    : []
}

function normalizeSlots(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {}
}

function readMissingSlots(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []
}

function buildAudit(params: {
  gateDecision: GateResult
  gateReason: string
  intentName?: string
  capability?: CapabilityDefinition | null
  matchedCapabilityIds: string[]
  executionMode?: ExecutionMode
  blockingFields?: string[]
  requireConfirmation?: boolean
  reasonForPending?: string
}): Record<string, unknown> {
  return {
    gate_decision: params.gateDecision,
    gate_reason: params.gateReason,
    reason: params.gateReason,
    intent_name: params.intentName || null,
    capability_id: params.capability?.capability_id || null,
    matched_capability_ids: params.matchedCapabilityIds,
    execution_mode: params.executionMode || null,
    blocking_fields: params.blockingFields || [],
    require_confirmation: params.requireConfirmation === true,
    reason_for_pending: params.reasonForPending || null,
    timestamp: new Date().toISOString(),
  }
}

function buildContinueChat(params: {
  gateReason: string
  message: string
  blockingFields?: string[]
  intentName?: string
  capability?: CapabilityDefinition | null
  matchedCapabilityIds: string[]
  executionMode?: ExecutionMode
}): GateDecision {
  const blockingFields = params.blockingFields || []
  return {
    gate_result: 'continue_chat',
    require_confirmation: false,
    gate_reason: params.gateReason,
    blocking_fields: blockingFields,
    safe_to_seal: false,
    capability_binding: params.capability
      ? {
          capability_id: params.capability.capability_id,
          matched_capability_ids: params.matchedCapabilityIds,
        }
      : null,
    message: params.message,
    audit: buildAudit({
      gateDecision: 'continue_chat',
      gateReason: params.gateReason,
      intentName: params.intentName,
      capability: params.capability,
      matchedCapabilityIds: params.matchedCapabilityIds,
      executionMode: params.executionMode,
      blockingFields,
    }),
  }
}

function buildPass(params: {
  intentName?: string
  capability: CapabilityDefinition
  matchedCapabilityIds: string[]
  executionMode: ExecutionMode
}): GateDecision {
  return {
    gate_result: 'pass',
    require_confirmation: false,
    gate_reason: 'ready_read_only',
    blocking_fields: [],
    safe_to_seal: true,
    capability_binding: {
      capability_id: params.capability.capability_id,
      matched_capability_ids: params.matchedCapabilityIds,
    },
    message: 'Gate check passed. Request is ready for sealing.',
    audit: buildAudit({
      gateDecision: 'pass',
      gateReason: 'ready_read_only',
      intentName: params.intentName,
      capability: params.capability,
      matchedCapabilityIds: params.matchedCapabilityIds,
      executionMode: params.executionMode,
    }),
  }
}

function buildRequireConfirmation(params: {
  intentName?: string
  capability: CapabilityDefinition
  matchedCapabilityIds: string[]
  executionMode: ExecutionMode
  entryChannel?: string
}): GateDecision {
  return {
    gate_result: 'require_confirmation',
    require_confirmation: true,
    gate_reason: 'side_effect_confirmation_required',
    blocking_fields: [],
    safe_to_seal: false,
    capability_binding: {
      capability_id: params.capability.capability_id,
      matched_capability_ids: params.matchedCapabilityIds,
    },
    confirmation_request: {
      preview: {
        intent_name: params.intentName || null,
        capability_id: params.capability.capability_id,
        matched_capability_ids: params.matchedCapabilityIds,
        entry_channel: params.entryChannel || null,
      },
      token: `confirm_${Date.now()}`,
      summary: 'Side-effect capability requires confirmation before execution.',
    },
    reason_for_pending: 'side_effect',
    message: 'Gate requires explicit confirmation before sealing/execution.',
    audit: buildAudit({
      gateDecision: 'require_confirmation',
      gateReason: 'side_effect_confirmation_required',
      intentName: params.intentName,
      capability: params.capability,
      matchedCapabilityIds: params.matchedCapabilityIds,
      executionMode: params.executionMode,
      requireConfirmation: true,
      reasonForPending: 'side_effect',
    }),
  }
}

export function evaluateGateDecision(input: GateCheckInput): GateDecision {
  const intentName = String(input.intent_name || '').trim()
  const requestedCapabilityCandidates = normalizeCapabilityCandidates([
    ...(Array.isArray(input.matched_capability_ids) ? input.matched_capability_ids : []),
    input.capability_binding?.capability_id,
  ])
  const matchedCapabilityIds = resolveCapabilityIds(requestedCapabilityCandidates, MAX_MATCHED_CAPABILITIES)
  const capability =
    getPrimaryCapabilityDefinition(matchedCapabilityIds) ||
    getCapabilityDefinition(String(input.capability_binding?.capability_id || ''))
  const executionMode = isValidExecutionMode(input.execution_mode) ? input.execution_mode : undefined
  const slots = normalizeSlots(input.slots || input.extracted_slots)
  const queryContractMissingSlots = readMissingSlots(input.query_contract?.completeness?.missing_slots)

  if (!intentName) {
    return buildContinueChat({
      gateReason: 'missing_intent_name',
      message: 'Intent name is required for Execution creation.',
      matchedCapabilityIds,
      executionMode,
    })
  }

  if (slots.in_scope === false || intentName === 'out_of_scope') {
    return buildContinueChat({
      gateReason: 'out_of_scope',
      message: 'Out-of-scope requests cannot proceed to sealing.',
      matchedCapabilityIds,
      executionMode,
      intentName,
    })
  }

  if (!capability) {
    return buildContinueChat({
      gateReason: 'missing_capability_binding',
      message: 'Capability binding or matched capability ids are required for Execution creation.',
      matchedCapabilityIds,
      executionMode,
      intentName,
    })
  }

  if (!executionMode) {
    return buildContinueChat({
      gateReason: 'missing_or_invalid_execution_mode',
      message: 'Valid execution mode is required for Execution creation.',
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  if (requestedCapabilityCandidates.length > MAX_MATCHED_CAPABILITIES) {
    return buildContinueChat({
      gateReason: 'too_many_capability_matches',
      message: 'Too many capability matches. Clarification required before Execution creation.',
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  if (capability.risk_class === 'side_effect') {
    return buildRequireConfirmation({
      intentName,
      capability,
      matchedCapabilityIds,
      executionMode,
      entryChannel: String(input.entry_channel || '').trim(),
    })
  }

  const clarificationBlockingFields = readMissingSlots(slots.required_slots)
  if (input.need_clarification === true || slots.need_clarification === true) {
    return buildContinueChat({
      gateReason: 'missing_required_clarification',
      message: 'Clarification required before Execution creation.',
      blockingFields: clarificationBlockingFields,
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  if (queryContractMissingSlots.length > 0) {
    return buildContinueChat({
      gateReason: 'missing_query_contract_fields',
      message: `Query contract is incomplete: ${queryContractMissingSlots.join(', ')}`,
      blockingFields: queryContractMissingSlots,
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  const requiredRuntimeSlots = toRequiredRuntimeSlots(capability.runtime_slot_schema)
  const missingRuntimeSlots = requiredRuntimeSlots.filter((slotName) => {
    const value = slots[slotName]
    return value === null || typeof value === 'undefined' || value === ''
  })
  if (missingRuntimeSlots.length > 0) {
    return buildContinueChat({
      gateReason: 'missing_required_slots',
      message: `Missing required runtime slots: ${missingRuntimeSlots.join(', ')}`,
      blockingFields: missingRuntimeSlots,
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  if (capability.lifecycle !== 'active') {
    return buildContinueChat({
      gateReason: 'capability_not_active',
      message: `Capability ${capability.capability_id} lifecycle is ${capability.lifecycle}, not active.`,
      matchedCapabilityIds,
      executionMode,
      intentName,
      capability,
    })
  }

  return buildPass({
    intentName,
    capability,
    matchedCapabilityIds,
    executionMode,
  })
}
