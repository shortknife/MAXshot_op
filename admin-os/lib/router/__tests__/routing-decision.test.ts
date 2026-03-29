import { describe, expect, it } from 'vitest'
import { buildRoutingDecisionFromExecution, isRunnableExecutionStatus } from '@/lib/router/routing-decision'

describe('Step6 routing decision', () => {
  it('accepts confirmed executions and uses sealed capability authority', () => {
    const result = buildRoutingDecisionFromExecution({
      execution_id: 'exec-1',
      task_id: 'task-1',
      status: 'confirmed',
      payload: {
        intent: { type: 'legacy_should_not_win', extracted_slots: { scope: 'vault' } },
        sealed_execution: {
          intent_name: 'business_query',
          primary_capability_id: 'capability.data_fact_query',
          matched_capability_ids: ['capability.data_fact_query'],
          slots: { scope: 'yield', metric: 'apy' },
        },
      },
    })

    expect(result.dispatch_ready).toBe(true)
    if (!result.dispatch_ready) return
    expect(result.primary_capability_id).toBe('capability.data_fact_query')
    expect(result.intent.type).toBe('business_query')
    expect(result.intent.extracted_slots.scope).toBe('yield')
  })

  it('blocks non-confirmed executions', () => {
    const result = buildRoutingDecisionFromExecution({
      execution_id: 'exec-1',
      task_id: 'task-1',
      status: 'created',
      payload: {},
    })

    expect(result).toEqual({
      dispatch_ready: false,
      reason: 'status_not_confirmed',
    })
    expect(isRunnableExecutionStatus('confirmed')).toBe(true)
    expect(isRunnableExecutionStatus('created')).toBe(false)
  })

  it('rejects missing primary capability ids', () => {
    const result = buildRoutingDecisionFromExecution({
      execution_id: 'exec-1',
      task_id: 'task-1',
      status: 'confirmed',
      payload: {
        sealed_execution: {
          intent_name: 'business_query',
          slots: { scope: 'yield' },
        },
      },
    })

    expect(result).toEqual({
      dispatch_ready: false,
      reason: 'missing_primary_capability',
    })
  })
})

