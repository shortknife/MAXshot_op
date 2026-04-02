import { supabase } from '@/lib/supabase'

const INTERACTION_LOG_TABLE = 'interaction_learning_log_op'
const INTERACTION_LOG_LIMIT = 200

export type InteractionLearningLogRow = {
  log_id: string
  created_at: string
  session_id: string | null
  requester_id: string | null
  entry_channel: string | null
  customer_id: string | null
  raw_query: string
  effective_query: string | null
  intent_type: string | null
  intent_type_canonical: string | null
  primary_capability_id: string | null
  matched_capability_ids: string[]
  source_plane: string | null
  answer_type: string | null
  success: boolean
  status_code: number
  fallback_required: boolean
  review_required: boolean
  clarification_required: boolean
  confidence: number | null
  summary: string | null
  query_mode: string | null
  scope: string | null
  meta: Record<string, unknown>
}

export type InteractionLearningRuntime = {
  source: 'supabase' | 'empty'
  items: InteractionLearningLogRow[]
}

export type PersistInteractionLearningParams = {
  session_id?: string | null
  requester_id?: string | null
  entry_channel?: string | null
  customer_id?: string | null
  raw_query: string
  effective_query?: string | null
  intent_type?: string | null
  intent_type_canonical?: string | null
  primary_capability_id?: string | null
  matched_capability_ids?: string[]
  source_plane?: string | null
  answer_type?: string | null
  success: boolean
  status_code: number
  fallback_required?: boolean
  review_required?: boolean
  clarification_required?: boolean
  confidence?: number | null
  summary?: string | null
  query_mode?: string | null
  scope?: string | null
  meta?: Record<string, unknown>
}

function buildLogId() {
  return `ilog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isRecoverableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes(INTERACTION_LOG_TABLE) ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function normalizeRows(rows: unknown[]): InteractionLearningLogRow[] {
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const value = row as Record<string, unknown>
      return {
        log_id: String(value.log_id || ''),
        created_at: String(value.created_at || ''),
        session_id: typeof value.session_id === 'string' ? value.session_id : null,
        requester_id: typeof value.requester_id === 'string' ? value.requester_id : null,
        entry_channel: typeof value.entry_channel === 'string' ? value.entry_channel : null,
        customer_id: typeof value.customer_id === 'string' ? value.customer_id : null,
        raw_query: String(value.raw_query || ''),
        effective_query: typeof value.effective_query === 'string' ? value.effective_query : null,
        intent_type: typeof value.intent_type === 'string' ? value.intent_type : null,
        intent_type_canonical: typeof value.intent_type_canonical === 'string' ? value.intent_type_canonical : null,
        primary_capability_id: typeof value.primary_capability_id === 'string' ? value.primary_capability_id : null,
        matched_capability_ids: Array.isArray(value.matched_capability_ids)
          ? value.matched_capability_ids.map((item) => String(item || '')).filter(Boolean)
          : [],
        source_plane: typeof value.source_plane === 'string' ? value.source_plane : null,
        answer_type: typeof value.answer_type === 'string' ? value.answer_type : null,
        success: value.success === true,
        status_code: Number(value.status_code || 0),
        fallback_required: value.fallback_required === true,
        review_required: value.review_required === true,
        clarification_required: value.clarification_required === true,
        confidence: typeof value.confidence === 'number' ? value.confidence : null,
        summary: typeof value.summary === 'string' ? value.summary : null,
        query_mode: typeof value.query_mode === 'string' ? value.query_mode : null,
        scope: typeof value.scope === 'string' ? value.scope : null,
        meta: value.meta && typeof value.meta === 'object' ? (value.meta as Record<string, unknown>) : {},
      }
    })
}

export async function persistInteractionLearningLog(params: PersistInteractionLearningParams): Promise<{ log_id: string; source: 'supabase' } | null> {
  const payload = {
    log_id: buildLogId(),
    created_at: new Date().toISOString(),
    session_id: params.session_id || null,
    requester_id: params.requester_id || null,
    entry_channel: params.entry_channel || null,
    customer_id: params.customer_id || null,
    raw_query: params.raw_query,
    effective_query: params.effective_query || null,
    intent_type: params.intent_type || null,
    intent_type_canonical: params.intent_type_canonical || null,
    primary_capability_id: params.primary_capability_id || null,
    matched_capability_ids: params.matched_capability_ids || [],
    source_plane: params.source_plane || null,
    answer_type: params.answer_type || null,
    success: params.success,
    status_code: params.status_code,
    fallback_required: params.fallback_required === true,
    review_required: params.review_required === true,
    clarification_required: params.clarification_required === true,
    confidence: typeof params.confidence === 'number' ? params.confidence : null,
    summary: params.summary || null,
    query_mode: params.query_mode || null,
    scope: params.scope || null,
    meta: params.meta || {},
  }

  try {
    const { error } = await supabase.from(INTERACTION_LOG_TABLE).insert(payload)
    if (error) throw error
    return { log_id: payload.log_id, source: 'supabase' }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
    return null
  }
}

export async function loadInteractionLearningLogRuntime(): Promise<InteractionLearningRuntime> {
  try {
    const { data, error } = await supabase
      .from(INTERACTION_LOG_TABLE)
      .select('log_id,created_at,session_id,requester_id,entry_channel,customer_id,raw_query,effective_query,intent_type,intent_type_canonical,primary_capability_id,matched_capability_ids,source_plane,answer_type,success,status_code,fallback_required,review_required,clarification_required,confidence,summary,query_mode,scope,meta')
      .order('created_at', { ascending: false })
      .limit(INTERACTION_LOG_LIMIT)

    if (error) throw error
    if (Array.isArray(data) && data.length > 0) {
      return { source: 'supabase', items: normalizeRows(data) }
    }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
  }

  return { source: 'empty', items: [] }
}
