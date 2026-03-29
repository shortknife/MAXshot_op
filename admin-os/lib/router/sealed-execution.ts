import { randomUUID } from 'crypto'
import type { GateDecision, GateResult } from '@/lib/router/gate-decision'

export type SealerGateInput = Partial<Pick<GateDecision, 'gate_result' | 'require_confirmation' | 'gate_reason' | 'blocking_fields' | 'safe_to_seal' | 'reason_for_pending' | 'confirmation_request'>>

export type SealedExecutionEnvelope = {
  task_id: string
  execution_id: string
  status: 'created' | 'pending_confirmation'
  sealed_execution: {
    intent_name: string
    primary_capability_id: string | null
    matched_capability_ids: string[]
    slots: Record<string, unknown>
    entry: {
      entry_type: string
      entry_channel: string
      requester_id: string
      raw_query: string
    }
    gate: {
      gate_result: GateResult
      require_confirmation: boolean
      gate_reason: string
      blocking_fields: string[]
      safe_to_seal: boolean
    }
  }
}

export function normalizeSealerGate(gate: unknown, fallbackRequireConfirmation: boolean): {
  gate_result: GateResult
  require_confirmation: boolean
  gate_reason: string
  blocking_fields: string[]
  safe_to_seal: boolean
  reason_for_pending: string | null
  confirmation_request: Record<string, unknown> | null
} {
  const input = gate && typeof gate === 'object' ? (gate as Record<string, unknown>) : {}
  const gateResultRaw = String(input.gate_result || '').trim()
  const gateResult: GateResult = gateResultRaw === 'continue_chat' || gateResultRaw === 'require_confirmation'
    ? gateResultRaw
    : 'pass'
  const requireConfirmation = input.require_confirmation === true || fallbackRequireConfirmation === true || gateResult === 'require_confirmation'
  const blockingFields = Array.isArray(input.blocking_fields)
    ? input.blocking_fields.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  return {
    gate_result: requireConfirmation ? 'require_confirmation' : gateResult,
    require_confirmation: requireConfirmation,
    gate_reason: String(input.gate_reason || (requireConfirmation ? 'side_effect_confirmation_required' : 'ready_read_only')),
    blocking_fields: blockingFields,
    safe_to_seal: input.safe_to_seal === true && !requireConfirmation,
    reason_for_pending: requireConfirmation ? String(input.reason_for_pending || 'side_effect') : null,
    confirmation_request:
      requireConfirmation && input.confirmation_request && typeof input.confirmation_request === 'object'
        ? { ...(input.confirmation_request as Record<string, unknown>) }
        : null,
  }
}

export function assertSealable(params: {
  gate: ReturnType<typeof normalizeSealerGate>
  intentName: string
  inScope: boolean
}): { ok: true } | { ok: false; status: number; error: string; details: string; blocking_fields?: string[] } {
  if (!params.inScope || params.intentName === 'out_of_scope') {
    return {
      ok: false,
      status: 409,
      error: 'gate_blocked',
      details: 'Out-of-scope requests cannot be sealed.',
    }
  }
  if (params.gate.gate_result === 'continue_chat') {
    return {
      ok: false,
      status: 409,
      error: 'gate_blocked',
      details: 'Gate returned continue_chat. Request is not ready for sealing.',
      blocking_fields: params.gate.blocking_fields,
    }
  }
  return { ok: true }
}

export function deriveInitialSealedStatus(params: {
  gate: ReturnType<typeof normalizeSealerGate>
  capabilityRiskClass?: string | null
}): 'created' | 'pending_confirmation' {
  if (params.capabilityRiskClass === 'side_effect') return 'pending_confirmation'
  if (params.gate.require_confirmation || params.gate.gate_result === 'require_confirmation') return 'pending_confirmation'
  return 'created'
}

export function buildSealedExecutionEnvelope(params: {
  taskId?: string | null
  executionId?: string | null
  intentName: string
  entryType: string
  entryChannel: string
  requesterId: string
  rawQuery: string
  primaryCapabilityId: string | null
  matchedCapabilityIds: string[]
  slots: Record<string, unknown>
  gate: ReturnType<typeof normalizeSealerGate>
  capabilityRiskClass?: string | null
}): SealedExecutionEnvelope {
  const taskId = params.taskId || randomUUID()
  const executionId = params.executionId || randomUUID()
  const status = deriveInitialSealedStatus({ gate: params.gate, capabilityRiskClass: params.capabilityRiskClass })
  return {
    task_id: taskId,
    execution_id: executionId,
    status,
    sealed_execution: {
      intent_name: params.intentName,
      primary_capability_id: params.primaryCapabilityId,
      matched_capability_ids: params.matchedCapabilityIds,
      slots: { ...params.slots },
      entry: {
        entry_type: params.entryType,
        entry_channel: params.entryChannel,
        requester_id: params.requesterId,
        raw_query: params.rawQuery,
      },
      gate: {
        gate_result: status === 'pending_confirmation' ? 'require_confirmation' : params.gate.gate_result,
        require_confirmation: status === 'pending_confirmation',
        gate_reason: params.gate.gate_reason,
        blocking_fields: params.gate.blocking_fields,
        safe_to_seal: status === 'created',
      },
    },
  }
}
