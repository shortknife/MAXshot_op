import { ExecutionStatus } from './types/execution'
import { Intent } from './types/capability'
import { MemoryType } from './types/memory'
import { getExecutionById, updateExecutionStatus } from './utils/supabase'
import { decomposeTask } from './task-decomposition'
import { selectMemories, createWorkingMind } from './memory-selection'
import { CapabilityRegistry } from './capability-scheduling'
import { AuditLogger } from './audit-logging'
import { createHash } from 'crypto'
import { buildCapabilityRegistryRefIds, resolveCapabilityIds } from './capability-catalog'
import { buildMemoryRuntime } from '@/lib/capabilities/memory-refs'
import { buildRoutingDecisionFromExecution } from './routing-decision'

function toMemoryRefsRef(memoryRefs: unknown[]): string[] {
  if (!Array.isArray(memoryRefs)) return []
  return memoryRefs.slice(0, 20).map((item) => {
    if (item && typeof item === 'object' && typeof (item as any).id === 'string') {
      return String((item as any).id)
    }
    try {
      const payload = JSON.stringify(item)
      const digest = createHash('sha256').update(payload).digest('hex').slice(0, 16)
      return `hash:${digest}`
    } catch {
      const digest = createHash('sha256').update(String(item)).digest('hex').slice(0, 16)
      return `hash:${digest}`
    }
  })
}


function extractMatchedCapabilityIds(intent: Intent | undefined, slots: Record<string, unknown>): string[] {
  return resolveCapabilityIds(
    [
      ...((Array.isArray(intent?.matched_capability_ids) ? intent?.matched_capability_ids : []) as unknown[]),
      ...(Array.isArray(intent?.extracted_slots?.matched_capability_ids)
        ? (intent?.extracted_slots?.matched_capability_ids as unknown[])
        : []),
      intent?.extracted_slots?.matched_capability_id,
      ...(Array.isArray(slots?.matched_capability_ids) ? (slots.matched_capability_ids as unknown[]) : []),
      slots?.matched_capability_id,
    ],
    3
  )
}

function normalizeIntentSlots(intent: Intent, slots: Record<string, unknown>) {
  const normalized = { ...slots }
  const matchedCapabilityIds = extractMatchedCapabilityIds(intent, slots)
  const primaryCapabilityId = matchedCapabilityIds[0] || null
  const intentType = String(intent?.type || '')

  normalized.matched_capability_ids = matchedCapabilityIds
  normalized.matched_capability_id = primaryCapabilityId

  if (primaryCapabilityId === 'capability.data_fact_query') {
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
  } else {
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
  }

  return normalized
}

export async function executeRouter(executionId: string) {
  const logger = AuditLogger.getInstance()
  const registry = CapabilityRegistry.getInstance()
  const runtimeStatus = 'in_progress'
  const fsdStepStatus = 'executing'

  try {
    logger.clear(executionId)
    logger.log('router_start', { execution_id: executionId, status: 'confirmed' })

    const execution = await getExecutionById(executionId)
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`)
    }

    const routingDecision = buildRoutingDecisionFromExecution(execution)

    logger.log('router_preflight', {
      execution_id: executionId,
      status: execution.status,
      reason: routingDecision.dispatch_ready ? 'ok' : routingDecision.reason,
    })

    if (!routingDecision.dispatch_ready) {
      logger.log('execution_not_runnable', {
        execution_id: executionId,
        status: execution.status,
        reason: routingDecision.reason,
      })
      await logger.flush(executionId)
      return {
        routing_decision: routingDecision,
        capability_outputs: [],
        final_answer: 'Execution not runnable',
        success: false,
        error: routingDecision.reason,
      }
    }

    await updateExecutionStatus(executionId, ExecutionStatus.IN_PROGRESS)
    logger.log('execution_status_updated', {
      execution_id: executionId,
      status: runtimeStatus,
      step_status: fsdStepStatus,
      reason: 'router_start',
    })

    const intent = routingDecision.intent

    logger.log('intent_received', {
      execution_id: executionId,
      status: runtimeStatus,
      intent_type: intent.type,
      intent_name: routingDecision.intent_name,
      matched_capability_ids: routingDecision.matched_capability_ids,
      memory_refs_ref: routingDecision.memory_refs_ref,
      step_status: fsdStepStatus,
    })

    const decomposition = await decomposeTask(intent)
    logger.log('task_decomposed', {
      execution_id: executionId,
      status: runtimeStatus,
      step_status: fsdStepStatus,
      intent_name: intent.type,
      capability_chain: decomposition.capability_chain,
      memory_query: decomposition.memory_query,
      memory_refs_ref: buildCapabilityRegistryRefIds(decomposition.capability_chain),
    })

    const memoryRefs = await selectMemories(
      decomposition.memory_query.types as MemoryType[],
      decomposition.memory_query.context_tags
    )
    const workingMind = createWorkingMind(memoryRefs)
    logger.log('memory_selected', {
      execution_id: executionId,
      status: runtimeStatus,
      step_status: fsdStepStatus,
      intent_name: intent.type,
      count: memoryRefs.length,
      memory_refs_ref: toMemoryRefsRef(memoryRefs),
      memory_ref_count: memoryRefs.length,
    })

    const normalizedSlots = normalizeIntentSlots(intent, intent.extracted_slots || {})

    const outputs: unknown[] = []
    let rollingMemoryRefs: unknown[] = workingMind.memory_refs
    let rollingMemoryRuntime = buildMemoryRuntime(rollingMemoryRefs)
    let rollingContext: Record<string, unknown> = {
      ...((execution.payload as any)?.context || {}),
      memory_refs: workingMind.memory_refs,
      memory_runtime: rollingMemoryRuntime,
    }

    for (const capabilityId of decomposition.capability_chain) {
      const startedAt = Date.now()
      const input = {
        capability_id: capabilityId,
        execution_id: executionId,
        intent,
        slots: normalizedSlots,
        memory_refs: rollingMemoryRefs,
        memory_refs_ref: rollingMemoryRuntime.ref_ids,
        context: rollingContext,
      }
      const output = await registry.executeCapability(input)
      const elapsedMs = Date.now() - startedAt
      const outputStatus = (output as any).status
      logger.log('capability_executed', {
        execution_id: executionId,
        capability_id: (output as any).capability_id,
        capability_version: (output as any).capability_version || '1.0',
        status: outputStatus,
        step_status: outputStatus === 'success' ? 'completed' : outputStatus === 'failed' ? 'failed' : fsdStepStatus,
        intent_name: intent.type,
        invocation_source: 'router',
        elapsed_ms: elapsedMs,
        failure_mode: outputStatus === 'failed' ? 'capability_failed' : null,
      })
      outputs.push(output)

      if ((output as any).metadata?.rejected_reason) {
        logger.log('capability_reject', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          status: (output as any).status,
          reason: (output as any).metadata.rejected_reason,
        })
      }

      if ((output as any).metadata?.fallback_reason) {
        logger.log('capability_fallback', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          status: (output as any).status,
          reason: (output as any).metadata.fallback_reason,
        })
      }

      const auditEvents = (output as any).metadata?.audit_events
      if (Array.isArray(auditEvents)) {
        for (const event of auditEvents) {
          if (event && typeof event.event_type === 'string') {
            logger.log(event.event_type, event.data || {})
          }
        }
      }

      if ((output as any).metadata?.template_path && (output as any).metadata?.template_hash) {
        logger.log('template_resolved', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          status: (output as any).status,
          template_id: (output as any).metadata.template_id,
          path: (output as any).metadata.template_path,
          sha256: (output as any).metadata.template_hash,
        })
      }

      if ((output as any).metadata?.fallback_reason === 'template_fallback') {
        logger.log('template_fallback', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          status: (output as any).status,
          reason: 'template_id_missing_or_invalid',
        })
      }

      if ((output as any).recommendations && (output as any).recommendations.length > 0) {
        logger.log('recommendation_received', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          decision: 'not_applied',
          recommendations: (output as any).recommendations,
        })
      }

      if ((output as any).status === 'failed') {
        logger.log('capability_failed', {
          execution_id: executionId,
          capability_id: (output as any).capability_id,
          status: 'failed',
          step_status: 'failed',
          intent_name: intent.type,
          error: (output as any).error,
        })
      }

      // Bridge context between capability steps (FSD compatibility layer):
      // later capabilities consume upstream assembled context/memory_refs when present.
      const resultObj = (output as any)?.result
      if (resultObj && typeof resultObj === 'object') {
        if (Array.isArray((resultObj as any).memory_refs)) {
          rollingMemoryRefs = (resultObj as any).memory_refs
        }
        if ((resultObj as any).context && typeof (resultObj as any).context === 'object') {
          rollingContext = {
            ...rollingContext,
            ...((resultObj as any).context as Record<string, unknown>),
          }
        }
        rollingMemoryRuntime = buildMemoryRuntime(rollingMemoryRefs)
        rollingContext.memory_refs = rollingMemoryRefs
        rollingContext.memory_runtime = rollingMemoryRuntime
      }
    }

    const success = outputs.every(o => (o as any).status === 'success')
    const finalAnswer = success
      ? ((outputs[outputs.length - 1] as any)?.result?.toString() || 'No output')
      : 'Execution failed'

    const result = {
      routing_decision: {
        primary_capability_id: routingDecision.primary_capability_id,
        matched_capability_ids: routingDecision.matched_capability_ids,
        capability_chain: decomposition.capability_chain,
        memory_query: decomposition.memory_query,
        memory_refs_ref: rollingMemoryRuntime.ref_ids,
        dispatch_ready: true,
      },
      capability_outputs: outputs,
      final_answer: finalAnswer,
      success,
      error: success ? undefined : 'One or more capabilities failed',
    }

    logger.log('router_complete', {
      execution_id: executionId,
      status: success ? 'completed' : 'failed',
      success,
      final_answer: finalAnswer,
      step_status: success ? 'completed' : 'failed',
    })

    await updateExecutionStatus(
      executionId,
      success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
      result
    )

    await logger.flush(executionId)

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
