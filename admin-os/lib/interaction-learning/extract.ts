import type { ChatEntryEnvelope } from '@/lib/chat/entry-envelope'

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export type ExtractedInteractionLearningPayload = {
  session_id: string | null
  requester_id: string | null
  entry_channel: string | null
  customer_id: string | null
  raw_query: string
  effective_query: string | null
  intent_type: string | null
  intent_type_canonical: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  source_plane: string | null
  answer_type: string | null
  success: boolean
  status_code: number
  fallback_required: boolean
  review_required: boolean
  clarification_required: boolean
  confidence: number | null
  summary: string | null
  query_mode: string | null
  scope: string | null
  meta: Record<string, unknown>
}

export function extractInteractionLearningPayload(params: {
  entry: ChatEntryEnvelope
  resultBody: unknown
  statusCode: number
}): ExtractedInteractionLearningPayload {
  const result = asObject(params.resultBody)
  const data = asObject(result.data)
  const meta = asObject(data.meta)
  const answerMeta = asObject(meta.answer_meta)
  const reviewPayload = asObject(answerMeta.review_payload)
  const queryContract = asObject(meta.query_contract)
  const filtersApplied = asObject(meta.filters_applied)
  const sessionKernel = asObject(meta.session_kernel)
  const promptRuntime = asObject(meta.prompt_runtime)
  const promptPolicy = asObject(meta.prompt_policy)
  const deliveryPosture = asObject(meta.delivery_posture)
  const customerRuntimePolicy = asObject(meta.customer_runtime_policy)
  const customerPolicyEvidence = asObject(meta.customer_policy_evidence)

  const matchedCapabilityIds = asStringArray(meta.matched_capability_ids)
  const primaryCapabilityId =
    asString(answerMeta.capability_id) ||
    asString(meta.primary_capability_id) ||
    matchedCapabilityIds[0] ||
    null

  const sourcePlane =
    asString(meta.data_plane) ||
    (primaryCapabilityId?.startsWith('capability.faq_') || primaryCapabilityId === 'capability.kb_upload_qc' ? 'faq_kb' : null) ||
    (primaryCapabilityId === 'capability.data_fact_query' ? 'ops_data' : null) ||
    (primaryCapabilityId === 'capability.product_doc_qna' ? 'product_doc' : null)

  let answerType = asString(meta.exit_type) || 'answered'
  if (answerMeta.review_required === true) answerType = 'review'
  else if (answerMeta.fallback_required === true) answerType = 'fallback'
  else if (meta.exit_type === 'needs_clarification') answerType = 'clarification'
  else if (result.success !== true) answerType = 'error'

  const summary = asString(data.summary) || asString(data.error)

  return {
    session_id: params.entry.session_id || null,
    requester_id: params.entry.requester_id || null,
    entry_channel: params.entry.entry_channel || null,
    customer_id: params.entry.customer_id || asString(meta.customer_id) || asString(reviewPayload.customer_id),
    raw_query: params.entry.raw_query,
    effective_query: asString(meta.effective_query),
    intent_type: asString(meta.intent_type),
    intent_type_canonical: asString(meta.intent_type_canonical),
    primary_capability_id: primaryCapabilityId,
    matched_capability_ids: matchedCapabilityIds,
    source_plane: sourcePlane,
    answer_type: answerType,
    success: result.success === true,
    status_code: params.statusCode,
    fallback_required: answerMeta.fallback_required === true,
    review_required: answerMeta.review_required === true,
    clarification_required: meta.exit_type === 'needs_clarification',
    confidence: asNumber(answerMeta.confidence),
    summary,
    query_mode: asString(meta.query_mode),
    scope: asString(meta.scope) || asString(queryContract.scope),
    meta: {
      exit_type: asString(meta.exit_type),
      filters_applied: filtersApplied,
      query_contract_ready: queryContract.completeness && typeof queryContract.completeness === 'object'
        ? (queryContract.completeness as Record<string, unknown>).ready === true
        : null,
      next_actions_count: Array.isArray(meta.next_actions) ? meta.next_actions.length : 0,
      review_payload_present: answerMeta.review_payload && typeof answerMeta.review_payload === 'object',
      confidence: asNumber(answerMeta.confidence),
      prompt_meta_slug: meta.intent_prompt && typeof meta.intent_prompt === 'object' ? asString((meta.intent_prompt as Record<string, unknown>).slug) : null,
      prompt_runtime: {
        assembly_mode: asString(promptRuntime.assembly_mode),
        primary_prompt_slug: asString(promptRuntime.primary_prompt_slug),
        prompt_count: asNumber(promptRuntime.prompt_count),
        prompt_sources: asStringArray(promptRuntime.prompt_sources),
      },
      prompt_policy: {
        outcome: asString(promptPolicy.outcome),
        reason: asString(promptPolicy.reason),
        checks: asStringArray(promptPolicy.checks),
      },
      customer_runtime_policy: {
        customer_id: asString(customerRuntimePolicy.customer_id),
        policy_version: asString(customerRuntimePolicy.policy_version),
        primary_plane: asString(customerRuntimePolicy.primary_plane),
        preferred_capability_count: asNumber(customerRuntimePolicy.preferred_capability_count),
        focused_surface_count: asNumber(customerRuntimePolicy.focused_surface_count),
        auth_primary_method: asString(customerRuntimePolicy.auth_primary_method),
        clarification_style: asString(customerRuntimePolicy.clarification_style),
        review_escalation_style: asString(customerRuntimePolicy.review_escalation_style),
      },
      customer_policy_audit: {
        customer_id: asString(customerPolicyEvidence.customer_id),
        policy_version: asString(customerPolicyEvidence.policy_version),
        summary: asString(customerPolicyEvidence.summary),
        primary_plane: asString(customerPolicyEvidence.primary_plane),
        default_entry_path: asString(customerPolicyEvidence.default_entry_path),
        auth_primary_method: asString(customerPolicyEvidence.auth_primary_method),
        auth_verification_posture: asString(customerPolicyEvidence.auth_verification_posture),
        delivery_summary_style: asString(customerPolicyEvidence.delivery_summary_style),
        review_escalation_style: asString(customerPolicyEvidence.review_escalation_style),
        clarification_style: asString(customerPolicyEvidence.clarification_style),
        focused_surfaces: asStringArray(customerPolicyEvidence.focused_surfaces),
        recommended_route_order: asStringArray(customerPolicyEvidence.recommended_route_order),
        preferred_capability_count: asNumber(customerPolicyEvidence.preferred_capability_count),
      },
      delivery_posture: {
        customer_id: asString(deliveryPosture.customer_id),
        delivery_version: asString(deliveryPosture.delivery_version),
        summary_style: asString(deliveryPosture.summary_style),
        next_action_style: asString(deliveryPosture.next_action_style),
        review_copy_style: asString(deliveryPosture.review_copy_style),
        citation_density: asString(deliveryPosture.citation_density),
      },
      session_kernel: {
        kernel_id: asString(sessionKernel.kernel_id),
        thread_action: asString(sessionKernel.thread_action),
        turn_relation_type: asString(sessionKernel.turn_relation_type),
        previous_turns: asNumber(sessionKernel.previous_turns),
        memory_policy: asString(sessionKernel.memory_policy),
        memory_ref_count: asNumber(sessionKernel.memory_ref_count),
        learning_ref_count: asNumber(sessionKernel.learning_ref_count),
        customer_ref_count: asNumber(sessionKernel.customer_ref_count),
        customer_recall_priority_applied: sessionKernel.customer_recall_priority_applied === true,
        customer_recall_priority: asString(sessionKernel.customer_recall_priority),
        recall_triggered: sessionKernel.recall_triggered === true,
        verification_outcome: asString(sessionKernel.verification_outcome),
        source_plane: asString(sessionKernel.source_plane),
        workspace_primary_plane: asString(sessionKernel.workspace_primary_plane),
        workspace_default_entry_path: asString(sessionKernel.workspace_default_entry_path),
        workspace_capability_count: asNumber(sessionKernel.workspace_capability_count),
        workspace_focus_count: asNumber(sessionKernel.workspace_focus_count),
        routing_priority_applied: sessionKernel.routing_priority_applied === true,
        routing_priority_reason: asString(sessionKernel.routing_priority_reason),
        customer_policy_loaded: sessionKernel.customer_policy_loaded === true,
        customer_policy_version: asString(sessionKernel.customer_policy_version),
        customer_policy_primary_plane: asString(sessionKernel.customer_policy_primary_plane),
        customer_policy_auth_method: asString(sessionKernel.customer_policy_auth_method),
      },
    },
  }
}
