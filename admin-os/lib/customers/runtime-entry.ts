import type { ChatEntryEnvelope } from '@/lib/chat/entry-envelope'
import { resolveIdentityById } from '@/lib/auth/identity-registry'
import { appendAuditEvent } from '@/lib/router/audit-logging'
import { buildWriteBlockedEvent } from '@/lib/utils'
import { assertOperatorCustomerAccess, assertOperatorPlatformAccess } from '@/lib/customers/access'
import { supabase } from '@/lib/supabase'

export type ExecutionEntryCustomerContext = {
  execution_id: string
  customer_id: string | null
  requester_id: string | null
  source: 'payload.customer_id' | 'payload.context.customer_id' | 'identity.customer_id' | 'unknown'
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readExecutionCustomerFromPayload(payload: unknown): { customer_id: string | null; source: ExecutionEntryCustomerContext['source'] } {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const directCustomerId = readString(record.customer_id)
  if (directCustomerId) {
    return { customer_id: directCustomerId, source: 'payload.customer_id' }
  }
  const context = record.context && typeof record.context === 'object' ? (record.context as Record<string, unknown>) : null
  const contextCustomerId = readString(context?.customer_id)
  if (contextCustomerId) {
    return { customer_id: contextCustomerId, source: 'payload.context.customer_id' }
  }
  return { customer_id: null, source: 'unknown' }
}

export async function resolveExecutionCustomerContext(executionId: string): Promise<ExecutionEntryCustomerContext | null> {
  const normalizedExecutionId = readString(executionId)
  if (!normalizedExecutionId) return null

  const { data, error } = await supabase
    .from('task_executions_op')
    .select('execution_id, requester_id, payload')
    .eq('execution_id', normalizedExecutionId)
    .maybeSingle()

  if (error) throw new Error(`execution_context_load_failed:${error.message}`)
  if (!data) return null

  const requesterId = readString(data.requester_id)
  const payloadResolution = readExecutionCustomerFromPayload(data.payload)
  if (payloadResolution.customer_id) {
    return {
      execution_id: normalizedExecutionId,
      requester_id: requesterId,
      customer_id: payloadResolution.customer_id,
      source: payloadResolution.source,
    }
  }

  if (requesterId) {
    const identity = await resolveIdentityById(requesterId)
    const identityCustomerId = readString(identity?.customer_id)
    if (identityCustomerId) {
      return {
        execution_id: normalizedExecutionId,
        requester_id: requesterId,
        customer_id: identityCustomerId,
        source: 'identity.customer_id',
      }
    }
  }

  return {
    execution_id: normalizedExecutionId,
    requester_id: requesterId,
    customer_id: null,
    source: 'unknown',
  }
}

export async function assertExecutionEntryAccess(params: { executionId: string; operatorId?: string | null; requestPath: string }) {
  const context = await resolveExecutionCustomerContext(params.executionId)
  if (!context) throw new Error('execution_not_found')

  try {
    if (context.customer_id) {
      assertOperatorCustomerAccess({ operatorId: params.operatorId, customerId: context.customer_id })
    } else {
      assertOperatorPlatformAccess(params.operatorId)
    }
  } catch (error) {
    await appendAuditEvent(
      params.executionId,
      buildWriteBlockedEvent({
        reason: error instanceof Error ? error.message : 'operator_customer_scope_not_allowed',
        operatorId: params.operatorId || undefined,
        requestPath: params.requestPath,
      }),
    ).catch(() => null)
    throw error
  }

  return context
}

export async function enforceRequesterCustomerContext(params: { requesterId?: string | null; customerId?: string | null }) {
  const requesterId = readString(params.requesterId)
  if (!requesterId) {
    return { requester_id: null, customer_id: readString(params.customerId) || null }
  }

  const identity = await resolveIdentityById(requesterId)
  if (!identity) {
    throw new Error('requester_identity_not_found')
  }

  const identityCustomerId = readString(identity.customer_id)
  const requestedCustomerId = readString(params.customerId)

  if (requestedCustomerId && identityCustomerId && requestedCustomerId !== identityCustomerId) {
    throw new Error('requester_customer_mismatch')
  }

  return {
    requester_id: requesterId,
    customer_id: requestedCustomerId || identityCustomerId || null,
  }
}

export async function enforceChatEntryIdentityContext(entry: ChatEntryEnvelope): Promise<ChatEntryEnvelope> {
  const normalized = await enforceRequesterCustomerContext({
    requesterId: entry.requester_id,
    customerId: entry.customer_id,
  })

  return {
    ...entry,
    requester_id: normalized.requester_id,
    customer_id: normalized.customer_id,
  }
}
