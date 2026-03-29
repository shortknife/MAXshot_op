import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { resolveInputMemoryRefs, resolveInputMemoryRuntime } from './memory-refs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function buildContextFromInput(input: CapabilityInputEnvelope, memoryRefs: unknown[]) {
  const context = isRecord(input.context) ? { ...input.context } : {}
  const payload = isRecord((input as { payload?: unknown }).payload) ? ((input as { payload?: Record<string, unknown> }).payload || {}) : {}
  const memoryRuntime = resolveInputMemoryRuntime(input)
  return {
    ...context,
    memory_refs: memoryRefs,
    memory_runtime: memoryRuntime,
    payload,
    assembled_at: new Date().toISOString(),
  }
}

export async function contextAssembler(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  const usedSkills = ['memory-ref-assembler']
  const memoryRefs = resolveInputMemoryRefs(input)
  const memoryRuntime = resolveInputMemoryRuntime(input)
  const context = buildContextFromInput(input, memoryRefs)

  return {
    capability_id: 'context_assembler',
    capability_version: '1.0',
    status: 'success',
    result: {
      memory_refs: memoryRefs,
      memory_refs_ref: memoryRuntime.ref_ids,
      memory_runtime: memoryRuntime,
      context,
      memory_type: 'foundation',
      loaded_at: new Date().toISOString(),
    },
    evidence: {
      sources: [
        {
          source: 'router_context',
          source_type: 'envelope',
          source_id: 'context.memory_refs',
          row_count: memoryRefs.length,
          data_plane: 'governance',
        },
      ],
      doc_quotes: null,
    },
    audit: {
      capability_id: 'context_assembler',
      capability_version: '1.0',
      status: 'success',
      used_skills: usedSkills,
    },
    used_skills: usedSkills,
    metadata: {
      source_policy: 'router_context_only',
      memory_ref_count: memoryRefs.length,
      memory_refs_ref: memoryRuntime.ref_ids,
      memory_runtime: memoryRuntime,
    },
  }
}
