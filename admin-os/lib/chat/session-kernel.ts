import { createHash } from 'crypto'

import type { PreparedChatRequest } from '@/lib/chat/chat-request-preprocess'

export type SessionKernelSnapshot = {
  kernel_id: string
  session_id: string | null
  customer_id: string | null
  requester_id: string | null
  entry_channel: string | null
  thread_action: string
  resolution_reason: string
  turn_relation_type: string
  turn_relation_reason: string
  previous_turns: number
  follow_up_context_applied: boolean
  active_scope: string | null
  active_query_mode: string | null
  active_chain: string | null
  active_protocol: string | null
  active_vault_name: string | null
  pending_clarification: boolean
  pending_scope: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  memory_policy: 'router_context_only' | 'hybrid_learning'
  memory_ref_count: number
  learning_ref_count: number
  recall_triggered: boolean
  recall_confidence: number | null
  verification_outcome: string | null
  answer_type: string | null
  source_plane: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function buildKernelId(input: { sessionId: string | null; rawQuery: string; turnRelationType: string; primaryCapabilityId: string | null }) {
  const digest = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16)
  return `sk-${digest}`
}

export function buildPreparedSessionKernel(params: {
  prepared: PreparedChatRequest
  body: Record<string, unknown>
}): SessionKernelSnapshot {
  const { prepared, body } = params
  const active = prepared.contextEnvelope.conversation_context.active_context
  const pending = prepared.contextEnvelope.conversation_context.pending_clarification
  const memoryRuntime = prepared.contextEnvelope.memory_runtime
  return {
    kernel_id: buildKernelId({
      sessionId: prepared.sessionId,
      rawQuery: prepared.rawQuery,
      turnRelationType: prepared.turnRelation.type,
      primaryCapabilityId: prepared.primaryCapabilityId,
    }),
    session_id: prepared.sessionId,
    customer_id: typeof body.customer_id === 'string' ? String(body.customer_id).trim() || null : null,
    requester_id: typeof body.requester_id === 'string' ? String(body.requester_id).trim() || null : null,
    entry_channel: typeof body.entry_channel === 'string' ? String(body.entry_channel).trim() || 'web_app' : 'web_app',
    thread_action: prepared.sessionResolution.thread_action,
    resolution_reason: prepared.sessionResolution.resolution_reason,
    turn_relation_type: prepared.turnRelation.type,
    turn_relation_reason: prepared.turnRelation.reason,
    previous_turns: prepared.previousTurns,
    follow_up_context_applied: prepared.followUpContextApplied,
    active_scope: active.scope,
    active_query_mode: active.query_mode,
    active_chain: active.chain,
    active_protocol: active.protocol,
    active_vault_name: active.vault_name,
    pending_clarification: pending.exists,
    pending_scope: pending.scope,
    primary_capability_id: prepared.primaryCapabilityId,
    matched_capability_ids: prepared.matchedCapabilityIds,
    memory_policy: memoryRuntime.source_policy,
    memory_ref_count: memoryRuntime.memory_ref_count,
    learning_ref_count: memoryRuntime.learning_ref_count,
    recall_triggered: prepared.contextEnvelope.recall !== null,
    recall_confidence: prepared.contextEnvelope.recall?.recall_confidence ?? null,
    verification_outcome: null,
    answer_type: null,
    source_plane: null,
  }
}

export function finalizeSessionKernel(params: {
  kernel: SessionKernelSnapshot
  payload: Record<string, unknown>
}): SessionKernelSnapshot {
  const data = asRecord(params.payload.data)
  const meta = asRecord(data.meta)
  const answerMeta = asRecord(meta.answer_meta)
  const verificationDecision = asRecord(params.payload.verification_decision)
  const sourcePlane =
    asString(meta.data_plane) ||
    (params.kernel.primary_capability_id === 'capability.data_fact_query'
      ? 'ops_data'
      : params.kernel.primary_capability_id === 'capability.product_doc_qna'
        ? 'product_docs'
        : typeof params.kernel.primary_capability_id === 'string' && params.kernel.primary_capability_id.startsWith('capability.faq_')
          ? 'faq_kb'
          : null)
  const answerType =
    asString(meta.exit_type) ||
    (answerMeta.review_required === true
      ? 'review'
      : answerMeta.fallback_required === true
        ? 'fallback'
        : typeof data.type === 'string'
          ? data.type
          : null)

  return {
    ...params.kernel,
    verification_outcome: asString(verificationDecision.outcome),
    answer_type: answerType,
    source_plane: sourcePlane,
  }
}

export function attachSessionKernel(params: {
  payload: Record<string, unknown>
  kernel: SessionKernelSnapshot
}): Record<string, unknown> {
  const data = asRecord(params.payload.data)
  const meta = asRecord(data.meta)
  return {
    ...params.payload,
    data: {
      ...data,
      meta: {
        ...meta,
        session_kernel: params.kernel,
      },
    },
  }
}
