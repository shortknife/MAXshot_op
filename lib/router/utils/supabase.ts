import { supabase } from '@/lib/supabase'
import { Execution, ExecutionStatus } from '../router/types/execution'

export async function getExecutionById(executionId: string): Promise<Execution | null> {
  const { data, error } = await supabase
    .from('task_executions_op')
    .select('execution_id, task_id, status, payload, result, created_at, updated_at')
    .eq('execution_id', executionId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as Execution
}

export async function updateExecutionStatus(
  executionId: string,
  status: ExecutionStatus | string,
  result?: unknown
) {
  const updateData: Record<string, unknown> = { status }
  if (result !== undefined) {
    updateData.result = result
  }

  await supabase
    .from('task_executions_op')
    .update(updateData)
    .eq('execution_id', executionId)
}
