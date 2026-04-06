export type ThreadAction = 'continue' | 'fork_new' | 'reset'

export type TurnRelationType =
  | 'new_session'
  | 'continuation'
  | 'clarification_reply'
  | 'correction'
  | 'new_topic_same_window'
  | 'history_callback'

export type SessionResolution = {
  session_id: string | null
  thread_action: ThreadAction
  confidence: number
  resolution_reason: string
  store_policy: {
    load_existing_context: boolean
    reset_previous_context: boolean
    fork_from_session_id: string | null
  }
}

export type TurnRelation = {
  type: TurnRelationType
  confidence: number
  reason: string
  source: 'llm' | 'fallback' | 'system'
}

export type PendingClarificationSnapshot = {
  exists: boolean
  turns: number
  scope: string | null
  missing_slots: string[]
  original_query: string | null
}

export type ActiveContextSnapshot = {
  scope: string | null
  query_mode: string | null
  metric: string | null
  chain: string | null
  protocol: string | null
  vault_name: string | null
  compare_targets: string[]
  time_window_days: number | null
  aggregation: string | null
  exact_day: string | null
  date_from: string | null
  date_to: string | null
  updated_at: number | null
}

export type PolicyDecision = {
  inherit_context: boolean
  clear_pending_clarification: boolean
  override_fields: string[]
  trigger_recall: boolean
}

export type EffectiveQueryPolicy = {
  mode: 'pass_through' | 'pass_through_then_recall'
  notes: string
}

export type RecallResult = {
  recall_hits: Array<{
    source_type: 'recent_turn' | 'session_summary' | 'active_context'
    source_id: string
    match_reason: string
    summary: string
  }>
  recall_summary: string
  recall_confidence: number
  resolved_reference: {
    entity_type: string
    entity_name: string
    inferred_scope: string | null
  } | null
}

export type ContextEnvelope = {
  session_resolution: SessionResolution
  turn_relation: TurnRelation
  conversation_context: {
    pending_clarification: PendingClarificationSnapshot
    active_context: ActiveContextSnapshot
    recent_turns_summary: Array<{ role: string; content: string }>
  }
  registry_context: {
    registry_id: string
    registry_version: string
    active_capability_ids: string[]
  }
  memory_runtime: {
    source_policy: 'router_context_only' | 'hybrid_learning'
    ref_ids: string[]
    memory_ref_count: number
    learning_ref_count: number
    customer_ref_count?: number
    customer_recall_priority_applied?: boolean
    customer_recall_priority?: string | null
    summary: string | null
  }
  effective_query: string
  policy_decision: PolicyDecision
  effective_query_policy: EffectiveQueryPolicy
  recall: RecallResult | null
  context_ready: boolean
}
