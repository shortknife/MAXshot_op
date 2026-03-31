type AuditEvent = {
  event_type?: string
  event_type_canonical?: string
  data?: Record<string, unknown>
}

export type AuditContractCheck = {
  passed: boolean
  errors: string[]
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function validateRouterAuditContract(events: unknown): AuditContractCheck {
  const list = asArray(events) as AuditEvent[]
  const errors: string[] = []
  if (!list.length) {
    return { passed: false, errors: ['audit_events_empty'] }
  }

  const byType = new Map<string, AuditEvent[]>()
  const routerScopedTypes = new Set([
    'router_start',
    'execution_status_updated',
    'intent_received',
    'task_decomposed',
    'memory_selected',
    'capability_executed',
    'capability_reject',
    'capability_fallback',
    'capability_failed',
    'router_complete',
    'router_error',
  ])
  for (const e of list) {
    const type = String(e?.event_type || '')
    if (!type) continue
    byType.set(type, [...(byType.get(type) || []), e])
    if (!routerScopedTypes.has(type)) continue
    if (!e?.event_type_canonical) {
      errors.push(`missing_event_type_canonical:${type}`)
    }
    const data = e?.data || {}
    if (!String((data as Record<string, unknown>).execution_id || '').trim()) {
      errors.push(`missing_execution_id:${type}`)
    }
    if (!String((data as Record<string, unknown>).step_status || '').trim()) {
      errors.push(`missing_step_status:${type}`)
    }
  }

  const mustTypes = ['task_decomposed', 'memory_selected', 'capability_executed']
  for (const t of mustTypes) {
    if (!byType.has(t)) errors.push(`missing_event:${t}`)
  }

  const memorySelected = (byType.get('memory_selected') || [])[0]
  if (memorySelected) {
    const refs = (memorySelected.data as Record<string, unknown>)?.memory_refs_ref
    if (!Array.isArray(refs)) {
      errors.push('memory_selected_missing_memory_refs_ref')
    }
  }

  const capabilityEvent = (byType.get('capability_executed') || [])[0]
  if (capabilityEvent) {
    const data = capabilityEvent.data as Record<string, unknown>
    if (typeof data?.elapsed_ms !== 'number') errors.push('capability_executed_missing_elapsed_ms')
    if (!String(data?.capability_version || '').trim()) errors.push('capability_executed_missing_capability_version')
  }

  return {
    passed: errors.length === 0,
    errors,
  }
}
