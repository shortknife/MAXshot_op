import { CapabilityInputEnvelope, CapabilityOutput } from '../types'
import { ensureObjectParam, readStringParam } from '../utils/params'

type MemoryRef = {
  id?: string
  summary?: string
  style_constraints?: string[]
}

function buildFailure(reason: string): CapabilityOutput {
  return {
    capability_id: 'content_generator',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'content_generator',
      capability_version: '1.0',
      status: 'failed',
      used_skills: [],
    },
    used_skills: [],
    metadata: { rejected_reason: reason },
  }
}

function normalizeStyleConstraints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

function extractMemoryConstraints(memoryRefs: unknown): { constraints: string[]; sources: MemoryRef[] } {
  if (!Array.isArray(memoryRefs)) return { constraints: [], sources: [] }
  const sources: MemoryRef[] = []
  const constraints: string[] = []
  for (const ref of memoryRefs) {
    if (ref && typeof ref === 'object') {
      const r = ref as MemoryRef
      sources.push({ id: r.id, summary: r.summary, style_constraints: r.style_constraints })
      if (Array.isArray(r.style_constraints)) {
        constraints.push(...r.style_constraints.filter((c) => typeof c === 'string'))
      }
    }
  }
  return { constraints, sources }
}

function buildTemplate({ topic, platform, tone, goal, styleConstraints }: {
  topic: string
  platform: string
  tone: string
  goal: string
  styleConstraints: string[]
}) {
  const headline = `${platform.toUpperCase()} — ${topic}`
  const bullets = [
    `Audience intent: ${goal}`,
    `Tone: ${tone}`,
    styleConstraints.length ? `Style constraints: ${styleConstraints.join('; ')}` : 'Style constraints: none',
  ]
  const copy = `Create ${platform} content about ${topic}. Keep tone ${tone}. ${styleConstraints.length ? 'Follow constraints listed above.' : ''}`
  return { headline, bullets, copy }
}

export async function contentGenerator(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    return buildFailure(reason)
  }

  let topic: string | undefined
  try {
    topic = readStringParam(slots, 'topic', { required: true, label: 'topic' })
  } catch (e) {
    return buildFailure('missing_topic')
  }
  const tone = readStringParam(slots, 'tone') || 'neutral'
  const platform = readStringParam(slots, 'platform') || 'general'
  const goal = readStringParam(slots, 'goal') || 'awareness'
  const baseConstraints = normalizeStyleConstraints(slots['style_constraints'])
  const memory = extractMemoryConstraints(input.memory_refs)
  const styleConstraints = [...baseConstraints, ...memory.constraints]

  const result = buildTemplate({ topic, platform, tone, goal, styleConstraints })

  const used_skills: string[] = ['template-render']

  const evidenceSources: unknown[] = [
    { source: 'slots', topic, platform, tone, goal, style_constraints: baseConstraints },
  ]
  if (memory.sources.length) {
    evidenceSources.push({ source: 'memory_refs', refs: memory.sources })
  }

  return {
    capability_id: 'content_generator',
    capability_version: '1.0',
    status: 'success',
    result,
    error: undefined,
    evidence: {
      sources: evidenceSources,
      doc_quotes: null,
      fallback_reason: undefined,
    },
    audit: {
      capability_id: 'content_generator',
      capability_version: '1.0',
      status: 'success',
      used_skills,
    },
    used_skills,
    metadata: {},
  }
}
