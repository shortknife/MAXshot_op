import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getExecutionById = vi.fn()
  const updateExecutionStatus = vi.fn()
  const decomposeTask = vi.fn()
  const selectMemories = vi.fn()
  const createWorkingMind = vi.fn()
  const executeCapability = vi.fn()
  const log = vi.fn()
  const flush = vi.fn()
  const clear = vi.fn()
  const buildMemoryRuntime = vi.fn(() => ({ ref_ids: ['capability_registry_v1:capability.data_fact_query'] }))
  return {
    getExecutionById,
    updateExecutionStatus,
    decomposeTask,
    selectMemories,
    createWorkingMind,
    executeCapability,
    log,
    flush,
    clear,
    buildMemoryRuntime,
  }
})

vi.mock('@/lib/router/utils/supabase', () => ({
  getExecutionById: mocks.getExecutionById,
  updateExecutionStatus: mocks.updateExecutionStatus,
}))

vi.mock('@/lib/router/task-decomposition', () => ({
  decomposeTask: mocks.decomposeTask,
}))

vi.mock('@/lib/router/memory-selection', () => ({
  selectMemories: mocks.selectMemories,
  createWorkingMind: mocks.createWorkingMind,
}))

vi.mock('@/lib/router/capability-scheduling', () => ({
  CapabilityRegistry: {
    getInstance: () => ({
      executeCapability: mocks.executeCapability,
    }),
  },
}))

vi.mock('@/lib/router/audit-logging', () => ({
  AuditLogger: {
    getInstance: () => ({
      clear: mocks.clear,
      log: mocks.log,
      flush: mocks.flush,
    }),
  },
}))

vi.mock('@/lib/capabilities/memory-refs', () => ({
  buildMemoryRuntime: mocks.buildMemoryRuntime,
}))

import { executeRouter } from '@/lib/router/router-main'

describe('Step6 router main', () => {
  beforeEach(() => {
    mocks.getExecutionById.mockReset()
    mocks.updateExecutionStatus.mockReset()
    mocks.decomposeTask.mockReset()
    mocks.selectMemories.mockReset()
    mocks.createWorkingMind.mockReset()
    mocks.executeCapability.mockReset()
    mocks.log.mockReset()
    mocks.flush.mockReset()
    mocks.clear.mockReset()
    mocks.buildMemoryRuntime.mockClear()
  })

  it('returns blocked routing decision for non-confirmed executions', async () => {
    mocks.getExecutionById.mockResolvedValue({
      execution_id: 'exec-1',
      task_id: 'task-1',
      status: 'created',
      payload: {
        sealed_execution: {
          intent_name: 'business_query',
          primary_capability_id: 'capability.data_fact_query',
          matched_capability_ids: ['capability.data_fact_query'],
          slots: { scope: 'yield' },
        },
      },
    })

    const result = await executeRouter('exec-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('status_not_confirmed')
    expect(result.routing_decision).toEqual({
      dispatch_ready: false,
      reason: 'status_not_confirmed',
    })
    expect(mocks.decomposeTask).not.toHaveBeenCalled()
  })

  it('returns stable routing_decision for confirmed executions', async () => {
    mocks.getExecutionById.mockResolvedValue({
      execution_id: 'exec-1',
      task_id: 'task-1',
      status: 'confirmed',
      payload: {
        intent: { type: 'legacy_wrong', extracted_slots: { scope: 'vault' } },
        sealed_execution: {
          intent_name: 'business_query',
          primary_capability_id: 'capability.data_fact_query',
          matched_capability_ids: ['capability.data_fact_query'],
          slots: { scope: 'yield', metric: 'apy' },
        },
      },
    })
    mocks.decomposeTask.mockResolvedValue({
      capability_chain: ['capability.data_fact_query'],
      memory_query: { types: ['foundation'], context_tags: ['capability.data_fact_query'] },
    })
    mocks.selectMemories.mockResolvedValue([{ id: 'capability_registry_v1:capability.data_fact_query' }])
    mocks.createWorkingMind.mockReturnValue({
      memory_refs: [{ id: 'capability_registry_v1:capability.data_fact_query' }],
    })
    mocks.executeCapability.mockResolvedValue({
      capability_id: 'capability.data_fact_query',
      capability_version: '1.0',
      status: 'success',
      result: 'ok',
      evidence: { sources: [], doc_quotes: null },
      audit: { capability_id: 'capability.data_fact_query', capability_version: '1.0', status: 'success', used_skills: [] },
      used_skills: [],
    })

    const result = await executeRouter('exec-1')

    expect(result.success).toBe(true)
    expect(result.routing_decision).toEqual({
      primary_capability_id: 'capability.data_fact_query',
      matched_capability_ids: ['capability.data_fact_query'],
      capability_chain: ['capability.data_fact_query'],
      memory_query: { types: ['foundation'], context_tags: ['capability.data_fact_query'] },
      memory_refs_ref: ['capability_registry_v1:capability.data_fact_query'],
      dispatch_ready: true,
    })
    expect(mocks.decomposeTask).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'business_query',
        extracted_slots: expect.objectContaining({ scope: 'yield', metric: 'apy' }),
      })
    )
    expect(mocks.clear).toHaveBeenCalledTimes(1)
    expect(mocks.clear).toHaveBeenCalledWith('exec-1')
    const routerCompleteCall = mocks.log.mock.calls.find((call) => call[0] === 'router_complete')
    expect(routerCompleteCall).toBeTruthy()
    const routerCompleteOrder = mocks.log.mock.invocationCallOrder.find(
      (_, index) => mocks.log.mock.calls[index]?.[0] === 'router_complete'
    )
    expect(routerCompleteOrder).toBeDefined()
    expect(mocks.flush.mock.invocationCallOrder[0]).toBeGreaterThan(Number(routerCompleteOrder))
  })
})
