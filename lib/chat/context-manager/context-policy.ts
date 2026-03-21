import type { EffectiveQueryPolicy, PolicyDecision, TurnRelationType } from '@/lib/chat/context-manager/types'

type PolicyTemplate = {
  inherit_context: boolean
  clear_pending_clarification: boolean
  override_fields: string[]
  trigger_recall: boolean
  effective_query_policy: EffectiveQueryPolicy
}

const TABLE: Record<TurnRelationType, PolicyTemplate> = {
  new_session: {
    inherit_context: false,
    clear_pending_clarification: true,
    override_fields: ['all'],
    trigger_recall: false,
    effective_query_policy: { mode: 'pass_through', notes: 'reset to clean context' },
  },
  continuation: {
    inherit_context: true,
    clear_pending_clarification: false,
    override_fields: [],
    trigger_recall: false,
    effective_query_policy: { mode: 'pass_through', notes: 'continue same topic' },
  },
  clarification_reply: {
    inherit_context: true,
    clear_pending_clarification: true,
    override_fields: ['missing_slots_only'],
    trigger_recall: false,
    effective_query_policy: { mode: 'pass_through', notes: 'use clarification reply directly' },
  },
  correction: {
    inherit_context: true,
    clear_pending_clarification: true,
    override_fields: ['corrected_fields_only'],
    trigger_recall: false,
    effective_query_policy: { mode: 'pass_through', notes: 'override corrected fields only' },
  },
  new_topic_same_window: {
    inherit_context: false,
    clear_pending_clarification: true,
    override_fields: ['all business fields'],
    trigger_recall: false,
    effective_query_policy: { mode: 'pass_through', notes: 'clear business context and start a new topic' },
  },
  history_callback: {
    inherit_context: true,
    clear_pending_clarification: false,
    override_fields: [],
    trigger_recall: true,
    effective_query_policy: { mode: 'pass_through_then_recall', notes: 'recall adapter enriches context' },
  },
}

export function resolveContextPolicy(turnRelationType: TurnRelationType): {
  policy_decision: PolicyDecision
  effective_query_policy: EffectiveQueryPolicy
} {
  const policy = TABLE[turnRelationType] || TABLE.continuation
  return {
    policy_decision: {
      inherit_context: policy.inherit_context,
      clear_pending_clarification: policy.clear_pending_clarification,
      override_fields: [...policy.override_fields],
      trigger_recall: policy.trigger_recall,
    },
    effective_query_policy: policy.effective_query_policy,
  }
}
