import pricing from '@/app/configs/runtime-cost/runtime_cost_pricing_v1.json'
import { supabase } from '@/lib/supabase'

const COST_EVENTS_TABLE = 'runtime_cost_events_op'
const COST_EVENTS_LIMIT = 200

type CostPricingRow = {
  source: string
  prompt_slug: string
  input_cost_per_1k_tokens_usd: number
}

export type RuntimeCostEventRow = {
  event_id: string
  created_at: string
  session_id: string | null
  customer_id: string | null
  requester_id: string | null
  entry_channel: string | null
  raw_query: string
  intent_type: string | null
  intent_type_canonical: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  source_plane: string | null
  answer_type: string | null
  verification_outcome: string | null
  fallback_required: boolean
  review_required: boolean
  success: boolean
  status_code: number
  model_source: string | null
  model_prompt_slug: string | null
  tokens_used: number
  estimated_cost_usd: number
  duration_ms: number
  meta: Record<string, unknown>
}

export type RuntimeCostEventParams = Omit<RuntimeCostEventRow, 'event_id' | 'created_at'>

export type RuntimeCostEventsRuntime = {
  source: 'supabase' | 'empty'
  items: RuntimeCostEventRow[]
}

function isRecoverableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes(COST_EVENTS_TABLE) ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function buildEventId() {
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeRows(rows: unknown[]): RuntimeCostEventRow[] {
  return rows.filter((row) => row && typeof row === 'object').map((row) => {
    const value = row as Record<string, unknown>
    return {
      event_id: String(value.event_id || ''),
      created_at: String(value.created_at || ''),
      session_id: typeof value.session_id === 'string' ? value.session_id : null,
      customer_id: typeof value.customer_id === 'string' ? value.customer_id : null,
      requester_id: typeof value.requester_id === 'string' ? value.requester_id : null,
      entry_channel: typeof value.entry_channel === 'string' ? value.entry_channel : null,
      raw_query: String(value.raw_query || ''),
      intent_type: typeof value.intent_type === 'string' ? value.intent_type : null,
      intent_type_canonical: typeof value.intent_type_canonical === 'string' ? value.intent_type_canonical : null,
      primary_capability_id: typeof value.primary_capability_id === 'string' ? value.primary_capability_id : null,
      matched_capability_ids: Array.isArray(value.matched_capability_ids) ? value.matched_capability_ids.map((item) => String(item || '')).filter(Boolean) : [],
      source_plane: typeof value.source_plane === 'string' ? value.source_plane : null,
      answer_type: typeof value.answer_type === 'string' ? value.answer_type : null,
      verification_outcome: typeof value.verification_outcome === 'string' ? value.verification_outcome : null,
      fallback_required: value.fallback_required === true,
      review_required: value.review_required === true,
      success: value.success === true,
      status_code: Number(value.status_code || 0),
      model_source: typeof value.model_source === 'string' ? value.model_source : null,
      model_prompt_slug: typeof value.model_prompt_slug === 'string' ? value.model_prompt_slug : null,
      tokens_used: Number(value.tokens_used || 0),
      estimated_cost_usd: Number(value.estimated_cost_usd || 0),
      duration_ms: Number(value.duration_ms || 0),
      meta: value.meta && typeof value.meta === 'object' ? (value.meta as Record<string, unknown>) : {},
    }
  })
}

export function estimateRuntimeCostUsd(params: {
  model_source: string | null
  model_prompt_slug: string | null
  tokens_used: number
}): number {
  const table = Array.isArray((pricing as { models?: CostPricingRow[] }).models) ? (pricing as { models: CostPricingRow[] }).models : []
  const row = table.find((item) => item.source === (params.model_source || 'local_stub') && item.prompt_slug === (params.model_prompt_slug || 'intent_analyzer'))
  if (!row) return 0
  const tokens = Number.isFinite(params.tokens_used) ? params.tokens_used : 0
  return Number(((tokens / 1000) * row.input_cost_per_1k_tokens_usd).toFixed(6))
}

export async function persistRuntimeCostEvent(params: RuntimeCostEventParams): Promise<{ event_id: string; source: 'supabase' } | null> {
  const payload = {
    event_id: buildEventId(),
    created_at: new Date().toISOString(),
    ...params,
  }
  try {
    const { error } = await supabase.from(COST_EVENTS_TABLE).insert(payload)
    if (error) throw error
    return { event_id: payload.event_id, source: 'supabase' }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
    return null
  }
}

export async function loadRuntimeCostEvents(): Promise<RuntimeCostEventsRuntime> {
  try {
    const { data, error } = await supabase
      .from(COST_EVENTS_TABLE)
      .select('event_id,created_at,session_id,customer_id,requester_id,entry_channel,raw_query,intent_type,intent_type_canonical,primary_capability_id,matched_capability_ids,source_plane,answer_type,verification_outcome,fallback_required,review_required,success,status_code,model_source,model_prompt_slug,tokens_used,estimated_cost_usd,duration_ms,meta')
      .order('created_at', { ascending: false })
      .limit(COST_EVENTS_LIMIT)
    if (error) throw error
    if (Array.isArray(data) && data.length > 0) return { source: 'supabase', items: normalizeRows(data) }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
  }
  return { source: 'empty', items: [] }
}
