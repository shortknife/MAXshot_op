'use server'

import { Execution, ExecutionStatus } from '../types/execution'
import { Intent } from '../types/capability'
import { MemoryType } from '../types/memory'
import { getExecutionById, updateExecutionStatus } from '../utils/supabase'
import { decomposeTask } from './task-decomposition'
import { selectMemories, createWorkingMind } from './memory-selection'
import { CapabilityRegistry } from './capability-scheduling'
import { AuditLogger } from './audit-logging'


function normalizeIntentSlots(intentType: string, slots: Record<string, unknown>) {
  const normalized = { ...slots }

  switch (intentType) {
    case 'audit_query': {
      if (!normalized.template_id) {
        normalized.template_id = 'latest_audit_events'
      }
      if (!normalized.template_slots || typeof normalized.template_slots !== 'object') {
        normalized.template_slots = { limit: 20 }
      }
      break
    }
    case 'ops_summary': {
      if (!normalized.template_id) {
        normalized.template_id = 'execution_status_breakdown'
      }
      if (!normalized.template_slots || typeof normalized.template_slots !== 'object') {
        normalized.template_slots = { days: 7 }
      }
      break
    }
    case 'memory_query': {
      if (!normalized.template_id) {
        normalized.template_id = 'memory_recent_insights'
      }
      if (!normalized.template_slots || typeof normalized.template_slots !== 'object') {
        normalized.template_slots = { limit: 10 }
      }
      break
    }
    default:
      break
  }

  return normalized
}

export async function executeRouter(executionId: string) {
  const logger = AuditLogger.getInstance()
  const registry = CapabilityRegistry.getInstance()

  try {
    logger.log('router_start', { execution_id: executionId, status: 'confirmed' })

    const execution = await getExecutionById(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    logger.log('router_preflight', {
      execution_id: executionId,
      status: execution.status,
      reason: execution.status === 'confirmed' ? 'ok' : 'status_not_confirmed',
    })

    if (execution.status !== 'confirmed') {
      logger.log('execution_not_confirmed', {
        execution_id: executionId,
        status: execution.status,
        reason: 'status_not_confirmed',
      })
      await logger.flush(executionId)
      return {
        capability_outputs: [],
        final_answer: 'Execution not confirmed',
        success: false,
        error: 'Execution not confirmed',
      }
    }

    await updateExecutionStatus(executionId, ExecutionStatus.IN_PROGRESS)
    logger.log('execution_status_updated', {
      execution_id: executionId,
      status: 'in_progress',
      reason: 'router_start',
    })

    const intent = execution.payload?.intent
    if (!intent) {
      throw new Error('No intent found in execution payload')
    }

    logger.log('intent_received', { execution_id: executionId, status: 'in_progress', intent_type: intent.type })

    const decomposition = await decomposeTask(intent)
    logger.log('task_decomposed', {
      execution_id: executionId,
      status: 'in_progress',
      capability_chain: decomposition.capability_chain,
      memory_query: decomposition.memory_query,
    })

    const memoryRefs = await selectMemories(
      decomposition.memory_query.types as MemoryType[],
      decomposition.memory_query.context_tags
    )
    const workingMind = createWorkingMind(memoryRefs)
    logger.log('memory_selected', { execution_id: executionId, status: 'in_progress', count: memoryRefs.length })

    const normalizedSlots = normalizeIntentSlots(intent.type, (execution.payload as any)?.slots || {})

    const capabilityInputs = decomposition.capability_chain.map(capabilityId => ({
      capability_id: capabilityId,
      execution_id: executionId,
      intent,
      slots: execution.payload?.slots || {},
      memory_refs: workingMind.memory_refs,
      context: execution.payload?.context || {},
    }))

    const outputs: unknown[] = []
    for (const input of capabilityInputs) {
      const output = await registry.executeCapability(input)
      logger.log('capability_executed', {
        execution_id: executionId,
        capability_id: output.capability_id,
        status: output.status,
      })
      outputs.push(output)

      if (output.metadata?.rejected_reason) {
        logger.log('capability_reject', {
          execution_id: executionId,
          capability_id: output.capability_id,
          status: output.status,
          reason: output.metadata.rejected_reason,
        })
      }

      if (output.metadata?.fallback_reason) {
        logger.log('capability_fallback', {
          execution_id: executionId,
          capability_id: output.capability_id,
          status: output.status,
          reason: output.metadata.fallback_reason,
        })
      }

      const auditEvents = (output.metadata as any)?.audit_events
      if (Array.isArray(auditEvents)) {
        for (const event of auditEvents) {
          if (event && typeof event.event_type === 'string') {
            logger.log(event.event_type, event.data || {})
          }
        }
      }

      if (output.metadata?.template_path && output.metadata?.template_hash) {
        logger.log('template_resolved', {
          execution_id: executionId,
          capability_id: output.capability_id,
          status: output.status,
          template_id: output.metadata.template_id,
          path: output.metadata.template_path,
          sha256: output.metadata.template_hash,
        })
      }

      if (output.metadata?.fallback_reason === 'template_fallback') {
        logger.log('template_fallback', {
          execution_id: executionId,
          capability_id: output.capability_id,
          status: output.status,
          reason: 'template_id_missing_or_invalid',
        })
      }

      if (output.recommendations && output.recommendations.length > 0) {
        logger.log('recommendation_received', {
          execution_id: executionId,
          capability_id: output.capability_id,
          decision: 'not_applied',
          recommendations: output.recommendations,
        })
      }

      const typedOutput = output as { capability_id: string; status: string; error?: string }
      if (typedOutput.status === 'failed') {
        logger.log('capability_failed', {
          execution_id: executionId,
          capability_id: typedOutput.capability_id,
          error: typedOutput.error,
        })
      }
    }

    const success = outputs.every(o => {
      const typed = o as { status: string }
      return typed.status === 'success'
    })
    const finalAnswer = success
      ? (outputs[outputs.length - 1] as any)?.result?.toString() || 'No output'
      : 'Execution failed'

    const result = {
      capability_outputs: outputs,
      final_answer: finalAnswer,
      success,
      error: success ? undefined : 'One or more capabilities failed',
    }

    await updateExecutionStatus(
      executionId,
      success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
      result
    )

    await logger.flush(executionId)

    logger.log('router_complete', {
      execution_id: executionId,
      status: success ? 'completed' : 'failed',
      success,
      final_answer: finalAnswer,
    })

    return result
  } catch (error) {
    logger.log('router_error', {
      execution_id: executionId,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })

    await updateExecutionStatus(
      executionId,
      ExecutionStatus.FAILED
    )

    await logger.flush(executionId)

    throw error
  }
}
