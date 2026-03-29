import { supabase } from '../../admin-os/lib/supabase'

export async function getExecutionById(executionId: string) {
  const { data, error } = await supabase
    .from('task_executions_op')
    .select('*')
    .eq('execution_id', executionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch execution: ${error.message}`)
  }

  return data
}

export async function updateExecutionStatus(
  executionId: string,
  status: string,
  result?: unknown,
  auditLog?: unknown
) {
  const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

  if (result !== undefined) {
    updateData.result = result
  }

  if (auditLog !== undefined) {
    updateData.audit_log = auditLog
  }

  const { error } = await supabase
    .from('task_executions_op')
    .update(updateData)
    .eq('execution_id', executionId)

  if (error) {
    throw new Error(`Failed to update execution: ${error.message}`)
  }
}
