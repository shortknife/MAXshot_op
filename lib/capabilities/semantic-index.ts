import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type IndexIntent = {
  id: string
  examples?: string[]
  required_slots?: string[]
  optional_slots?: string[]
  defaults?: Record<string, unknown>
  semantics?: Record<string, unknown>
  clarification_order?: string[]
  plan_id?: string
  fallback_provider?: string
}

type BusinessQueryIndex = {
  capability_id: string
  version: string
  timezone?: string
  sources?: {
    priority?: string[]
    semantics?: Record<string, unknown>
  }
  intents?: IndexIntent[]
  follow_up_policy?: {
    next_actions_are_examples?: boolean
    ui_mode?: string
    max_clarification_turns?: number
  }
  clarification_policy?: {
    timezone?: string
    default_yield_aggregation?: string
  }
}

type MemoryRefLike = {
  id: string
  type: 'foundation' | 'experience' | 'insight'
  content: string
  context: Record<string, unknown>
  weight: number
  confidence?: number
}

let cachedIndex: BusinessQueryIndex | null = null

function getIndexPath() {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '../../app/configs/capability-index/business_data_query.index.json')
}

export function loadBusinessQueryIndex(): BusinessQueryIndex {
  if (cachedIndex) return cachedIndex
  const raw = readFileSync(getIndexPath(), 'utf8')
  cachedIndex = JSON.parse(raw) as BusinessQueryIndex
  return cachedIndex
}

export function resolveBusinessIntentId(rawQuery: string, scope: string): string {
  const text = String(rawQuery || '').toLowerCase()
  if (scope === 'vault') return 'vault_list'
  if (scope === 'execution') {
    return /(详情|detail|execution_id|最近一笔|latest)/.test(text) ? 'execution_detail' : 'execution_summary'
  }
  if (scope === 'yield') {
    if (/(排名|排行|rank|top)/.test(text)) return 'yield_ranking'
    if (/(走势|趋势|trend|每天|每日|哪天|最高日|最低日)/.test(text)) return 'yield_trend'
    return 'yield_summary'
  }
  return 'unknown'
}

export function getBusinessIntentDefinition(intentId: string): IndexIntent | null {
  const index = loadBusinessQueryIndex()
  return index.intents?.find((item) => item.id === intentId) || null
}

export function buildBusinessMemoryRefs(intentId: string): MemoryRefLike[] {
  const index = loadBusinessQueryIndex()
  const intent = getBusinessIntentDefinition(intentId)
  const refs: MemoryRefLike[] = [
    {
      id: 'business_data_query.index.sources',
      type: 'foundation',
      content: 'Business data query source allowlist and field semantics.',
      context: {
        capability_id: index.capability_id,
        version: index.version,
        timezone: index.timezone || 'Asia/Shanghai',
        source_priority: index.sources?.priority || [],
        source_semantics: index.sources?.semantics || {},
      },
      weight: 1,
      confidence: 1,
    },
    {
      id: 'business_data_query.index.policy',
      type: 'foundation',
      content: 'Business query clarification and follow-up policy.',
      context: {
        capability_id: index.capability_id,
        timezone: index.timezone || 'Asia/Shanghai',
        follow_up_policy: index.follow_up_policy || {},
        clarification_policy: index.clarification_policy || {},
      },
      weight: 0.9,
      confidence: 1,
    },
  ]
  if (intent) {
    refs.push({
      id: `business_data_query.intent.${intent.id}`,
      type: 'foundation',
      content: `Semantic index for ${intent.id}`,
      context: {
        intent_id: intent.id,
        defaults: intent.defaults || {},
        semantics: intent.semantics || {},
        required_slots: intent.required_slots || [],
        optional_slots: intent.optional_slots || [],
        clarification_order: intent.clarification_order || [],
        plan_id: intent.plan_id || null,
        fallback_provider: intent.fallback_provider || null,
      },
      weight: 1,
      confidence: 1,
    })
  }
  return refs
}

export function buildFollowUpExamples(intentId: string, dynamicExamples: string[] = []): string[] {
  const intent = getBusinessIntentDefinition(intentId)
  const examples = [...dynamicExamples]
  if (intent?.examples?.length) {
    for (const sample of intent.examples) {
      if (!examples.includes(sample)) examples.push(sample)
    }
  }
  return examples.slice(0, 3)
}

export function getYieldDefaultAggregation(intentId: string): string | null {
  const intent = getBusinessIntentDefinition(intentId)
  if (!intent) return null
  return String(intent.defaults?.aggregation || '').trim() || null
}

export function getBusinessFollowUpPolicy(): BusinessQueryIndex['follow_up_policy'] {
  const index = loadBusinessQueryIndex()
  return index.follow_up_policy || {}
}
