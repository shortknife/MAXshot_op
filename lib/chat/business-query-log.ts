import { supabase } from '@/lib/supabase'

export async function logBusinessQuery(params: {
  userId: string
  rawQuery: string
  scope: string
  summary: string
  success: boolean
  sourceType?: string
  sourceId?: string
  promptMeta?: { slug?: string; version?: string; source?: string; hash?: string } | null
  errorCode?: string
}) {
  const payload = {
    user_id: params.userId,
    question_text: params.rawQuery,
    question_type: params.scope || 'business_query',
    time_range: JSON.stringify({ mode: 'realtime' }),
    data_sources: JSON.stringify({
      success: params.success,
      source_type: params.sourceType || null,
      source_id: params.sourceId || null,
      prompt_slug: params.promptMeta?.slug || null,
      prompt_version: params.promptMeta?.version || null,
      prompt_source: params.promptMeta?.source || null,
      prompt_hash: params.promptMeta?.hash || null,
      error_code: params.errorCode || null,
      data_plane: 'business',
    }),
    response_text: params.summary,
  }
  try {
    await supabase.from('data_query_logs').insert(payload)
  } catch {
    // Non-blocking logging: never fail user response
  }
}

