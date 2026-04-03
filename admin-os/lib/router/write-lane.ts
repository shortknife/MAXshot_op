import { supabase } from '@/lib/supabase'
import { getCapabilityExecutionPolicy } from '@/lib/router/capability-catalog'

const WRITE_LANE_TABLE = 'runtime_write_lanes_op'

export type WriteLaneAcquireParams = {
  capabilityId: string
  customerId?: string | null
  operatorId: string
}

export type WriteLaneLease = {
  lane_key: string
  lease_id: string
  capability_id: string
  mutation_scope: string
  customer_id: string | null
  operator_id: string
}

function buildLeaseId() {
  return `lane-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildLaneKey(params: { mutationScope: string; customerId?: string | null }) {
  return `${params.mutationScope}:${params.customerId || 'global'}`
}

function isRecoverableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes(WRITE_LANE_TABLE) ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

export async function acquireWriteLane(params: WriteLaneAcquireParams): Promise<WriteLaneLease | null> {
  const policy = getCapabilityExecutionPolicy(params.capabilityId)
  if (!policy || policy.concurrency_safe || !policy.mutation_scope) return {
    lane_key: '',
    lease_id: '',
    capability_id: params.capabilityId,
    mutation_scope: policy?.mutation_scope || '',
    customer_id: params.customerId || null,
    operator_id: params.operatorId,
  }

  const payload = {
    lane_key: buildLaneKey({ mutationScope: policy.mutation_scope, customerId: params.customerId }),
    lease_id: buildLeaseId(),
    capability_id: params.capabilityId,
    mutation_scope: policy.mutation_scope,
    customer_id: params.customerId || null,
    operator_id: params.operatorId,
    acquired_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from(WRITE_LANE_TABLE).insert(payload)
    if (error) {
      const message = String((error as { message?: string; code?: string }).message || '')
      const code = String((error as { code?: string }).code || '')
      if (code === '23505' || message.includes('duplicate key')) {
        throw new Error('write_lane_busy')
      }
      throw error
    }
    return payload
  } catch (error) {
    if (error instanceof Error && error.message === 'write_lane_busy') throw error
    if (!isRecoverableError(error)) throw error
    return null
  }
}

export async function releaseWriteLane(lease: WriteLaneLease | null | undefined): Promise<void> {
  if (!lease?.lane_key || !lease.lease_id) return
  try {
    const { error } = await supabase
      .from(WRITE_LANE_TABLE)
      .delete()
      .eq('lane_key', lease.lane_key)
      .eq('lease_id', lease.lease_id)
    if (error) throw error
  } catch (error) {
    if (!isRecoverableError(error)) throw error
  }
}
