export interface Memory {
  id: string
  type: MemoryType
  content: string
  context: Record<string, unknown>
  weight: number
  confidence?: number
  source_execution_id?: string
  created_at: string
}

export enum MemoryType {

  FOUNDATION = 'foundation',
  EXPERIENCE = 'experience',
  INSIGHT = 'insight',
}

export interface MemoryQuery {
  type?: MemoryType
  min_weight?: number
  context_tags?: string[]
  limit?: number
}

import { MemoryRef } from './capability'

export interface MemorySelectionResult {
  foundation_memories: MemoryRef[]
  experience_memories: MemoryRef[]
  insight_memories: MemoryRef[]
  total_selected: number
}

export interface WorkingMind {
  memory_refs: MemoryRef[]
  execution_id: string
  timestamp: string
}
