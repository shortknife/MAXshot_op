import { MemoryRef } from './capability'

export interface Task {
  id: string
  task_id: string
  task_type: TaskType
  schedule_config?: ScheduleConfig
  status: TaskStatus
  created_at: string
  updated_at: string
}

export enum TaskType {
  AD_HOC = 'ad_hoc',
  SCHEDULED = 'scheduled',
  LONG_RUNNING = 'long_running',
}

export enum TaskStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ScheduleConfig {
  cron?: string
  interval_minutes?: number
  timezone?: string
}

export interface TaskDecomposition {
  capability_chain: string[]
  memory_refs: MemoryRef[]
  execution_plan: ExecutionStep[]
}

export interface ExecutionStep {
  step_number: number
  capability_id: string
  input: Record<string, unknown>
  expected_output: string
}

