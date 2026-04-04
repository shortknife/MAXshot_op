import { describe, expect, it } from 'vitest'

import { attachSessionKernel, buildPreparedSessionKernel, finalizeSessionKernel } from '@/lib/chat/session-kernel'
import type { PreparedChatRequest } from '@/lib/chat/chat-request-preprocess'

function buildPreparedRequest(): PreparedChatRequest {
  return {
    rawQuery: '最近7天 APY 怎么样',
    sessionId: 'sess-001',
    effectiveQuery: '最近7天 APY 怎么样',
    intentQuery: '最近7天 APY 怎么样',
    previousTurns: 2,
    parsed: {
      intent: { extracted_slots: { scope: 'vault', query_mode: 'trend' } },
      prompt_meta: null,
    },
    intentType: 'business_query',
    canonicalIntentType: 'business_query',
    matchedCapabilityIds: ['capability.data_fact_query'],
    primaryCapabilityId: 'capability.data_fact_query',
    intentSlots: { scope: 'vault', query_mode: 'trend' },
    inScope: true,
    modelNeedClarification: false,
    modelClarificationQuestion: '',
    modelClarificationOptions: [],
    followUpContextApplied: true,
    sessionResolution: {
      session_id: 'sess-001',
      thread_action: 'continue_existing',
      resolution_reason: 'active_session_found',
    },
    turnRelation: {
      type: 'follow_up',
      reason: 'session_context_match',
    },
    contextEnvelope: {
      session_resolution: {
        session_id: 'sess-001',
        thread_action: 'continue_existing',
        resolution_reason: 'active_session_found',
      },
      turn_relation: {
        type: 'follow_up',
        reason: 'session_context_match',
      },
      conversation_context: {
        pending_clarification: {
          exists: true,
          scope: 'vault',
          original_query: '哪个 vault',
        },
        active_context: {
          scope: 'vault',
          query_mode: 'trend',
          metric: 'apy',
          aggregation: 'avg',
          time_window_days: 7,
          exact_day: null,
          date_from: '2026-03-20',
          date_to: '2026-03-27',
          chain: 'ethereum',
          protocol: 'aave',
          vault_name: 'USDC Vault',
          compare_targets: [],
        },
        recent_turns_summary: '用户在追问 vault APY 趋势',
      },
      registry_context: {
        matched_capability_ids: ['capability.data_fact_query'],
      },
      recall: {
        triggered_by: 'entity_match',
        recall_confidence: 0.78,
        recent_turns: [],
        active_context: {
          scope: 'vault',
          query_mode: 'trend',
        },
      },
      memory_runtime: {
        source_policy: 'hybrid_learning',
        ref_ids: ['mem-1', 'mem-2'],
        memory_ref_count: 2,
        learning_ref_count: 1,
        customer_ref_count: 1,
        summary: 'working mind includes 1 interaction-derived refs and 1 customer-profile refs',
      },
      effective_query: '最近7天 APY 怎么样',
      policy_decision: {
        action: 'allow',
        reason: 'in_scope',
      },
      effective_query_policy: {
        source: 'raw_query',
        transformed: false,
      },
    },
    step3: {
      intent_type: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      matched_capability_id: 'capability.data_fact_query',
      in_scope: true,
      need_clarification: false,
      clarification_question: '',
      clarification_options: [],
      slots: { scope: 'vault', query_mode: 'trend' },
      confidence: 0.9,
      raw_query: '最近7天 APY 怎么样',
      trace: {
        source: 'unit-test',
        prompt_slug: 'test',
        tokens_used: 12,
      },
    },
  }
}

describe('session kernel', () => {
  it('builds prepared kernel from request context', () => {
    const kernel = buildPreparedSessionKernel({
      prepared: buildPreparedRequest(),
      body: {
        customer_id: 'maxshot',
        requester_id: 'qa-runtime',
        entry_channel: 'web_app',
      },
    })

    expect(kernel.session_id).toBe('sess-001')
    expect(kernel.customer_id).toBe('maxshot')
    expect(kernel.thread_action).toBe('continue_existing')
    expect(kernel.turn_relation_type).toBe('follow_up')
    expect(kernel.pending_clarification).toBe(true)
    expect(kernel.active_chain).toBe('ethereum')
    expect(kernel.memory_policy).toBe('hybrid_learning')
    expect(kernel.learning_ref_count).toBe(1)
    expect(kernel.customer_ref_count).toBe(1)
    expect(kernel.recall_triggered).toBe(true)
    expect(kernel.recall_confidence).toBe(0.78)
  })

  it('finalizes kernel with verification and delivery outcome', () => {
    const prepared = buildPreparedSessionKernel({
      prepared: buildPreparedRequest(),
      body: {
        customer_id: 'maxshot',
        requester_id: 'qa-runtime',
      },
    })

    const finalized = finalizeSessionKernel({
      kernel: prepared,
      payload: {
        success: true,
        verification_decision: {
          outcome: 'review',
        },
        data: {
          type: 'qna',
          meta: {
            data_plane: 'faq_kb',
            answer_meta: {
              review_required: true,
            },
          },
        },
      },
    })

    expect(finalized.verification_outcome).toBe('review')
    expect(finalized.answer_type).toBe('review')
    expect(finalized.source_plane).toBe('faq_kb')

    const attached = attachSessionKernel({
      payload: { success: true, data: { meta: {} } },
      kernel: finalized,
    }) as { data: { meta: { session_kernel: { kernel_id: string } } } }

    expect(attached.data.meta.session_kernel.kernel_id).toBe(finalized.kernel_id)
  })
})
