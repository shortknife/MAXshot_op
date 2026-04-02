import { supabase } from '@/lib/supabase'
import { kbUploadQc } from '@/lib/capabilities/kb-upload-qc'
import { loadFaqKbManifest } from '@/lib/faq-kb/loaders'
import { isMutationAllowedForCustomer } from '@/lib/customers/runtime'
import { loadKbQcRuntimePreview } from '@/lib/faq-kb/qc-runtime'

const KB_SOURCE_TABLE = 'faq_kb_source_inventory_op'
const KB_SOURCE_LIMIT = 200

export type KbSourceStatus = 'draft' | 'accepted' | 'rejected'
export type KbSourceType = 'markdown' | 'text' | 'url' | 'pdf'

export type KbSourceInventoryItem = {
  source_id: string
  title: string
  customer_id: string | null
  kb_scope: string | null
  source_type: KbSourceType
  source_ref: string
  source_status: KbSourceStatus
  qc_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number
  chunk_count: number
  qc_flags: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
  uploaded_by: string | null
  customer_context: string | null
  created_at: string
  updated_at: string
}

export type KbSourceInventoryRuntime = {
  source: 'supabase' | 'computed'
  items: KbSourceInventoryItem[]
}

type KbSourceRow = {
  source_id: string
  title: string
  customer_id: string | null
  kb_scope: string | null
  source_type: KbSourceType
  source_ref: string
  source_status: KbSourceStatus
  qc_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number | null
  chunk_count: number | null
  qc_flags: unknown
  uploaded_by: string | null
  customer_context: string | null
  created_at: string
  updated_at: string
}

type RegisterKbSourceDraftParams = {
  source_id?: string | null
  title: string
  customer_id?: string | null
  kb_scope?: string | null
  source_type: KbSourceType
  source_ref: string
  uploaded_by: string
  customer_context?: string | null
}

type TransitionKbSourceParams = {
  source_id: string
  action: 'accept' | 'reject'
  operator_id: string
}

const KB_SOURCE_TRANSITIONS: Record<TransitionKbSourceParams['action'], { from: KbSourceStatus[]; to: KbSourceStatus }> = {
  accept: { from: ['draft'], to: 'accepted' },
  reject: { from: ['draft'], to: 'rejected' },
}

function buildSourceId(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
  return `${normalized || 'kb-source'}-${Math.random().toString(36).slice(2, 6)}`
}

function normalizeQcFlags(value: unknown): Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }> {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object') as Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
    : []
}

function isRecoverableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes(KB_SOURCE_TABLE) ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function toInventoryItem(row: KbSourceRow): KbSourceInventoryItem {
  return {
    source_id: row.source_id,
    title: row.title,
    customer_id: row.customer_id,
    kb_scope: row.kb_scope,
    source_type: row.source_type,
    source_ref: row.source_ref,
    source_status: row.source_status,
    qc_status: row.qc_status,
    document_count: Number(row.document_count || 0),
    chunk_count: Number(row.chunk_count || 0),
    qc_flags: normalizeQcFlags(row.qc_flags),
    uploaded_by: row.uploaded_by,
    customer_context: row.customer_context,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function computeInventoryFallback(): Promise<KbSourceInventoryItem[]> {
  const manifest = loadFaqKbManifest()
  const qcPreview = await loadKbQcRuntimePreview()
  const qcById = new Map(qcPreview.items.map((item) => [item.source_id, item]))
  const now = new Date().toISOString()

  return (manifest.documents || []).map((doc) => {
    const qc = qcById.get(doc.id)
    return {
      source_id: doc.id,
      title: doc.title,
      customer_id: null,
      kb_scope: doc.kb_scope || null,
      source_type: 'markdown',
      source_ref: doc.path,
      source_status: 'accepted',
      qc_status: qc?.ingest_status || 'accepted',
      document_count: qc?.document_count || 1,
      chunk_count: qc?.chunk_count || 0,
      qc_flags: qc?.qc_flags || [],
      uploaded_by: 'system_manifest',
      customer_context: null,
      created_at: now,
      updated_at: now,
    } satisfies KbSourceInventoryItem
  })
}

export async function loadKbSourceInventoryRuntime(): Promise<KbSourceInventoryRuntime> {
  try {
    const { data, error } = await supabase
      .from(KB_SOURCE_TABLE)
      .select('source_id,title,customer_id,kb_scope,source_type,source_ref,source_status,qc_status,document_count,chunk_count,qc_flags,uploaded_by,customer_context,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(KB_SOURCE_LIMIT)

    if (error) throw error

    if (Array.isArray(data) && data.length > 0) {
      return {
        source: 'supabase',
        items: data.map((row) => toInventoryItem(row as KbSourceRow)),
      }
    }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
  }

  return {
    source: 'computed',
    items: await computeInventoryFallback(),
  }
}

export async function registerKbSourceDraft(params: RegisterKbSourceDraftParams): Promise<{ source_id: string; inventory_source: 'supabase' } | null> {
  const sourceId = params.source_id?.trim() || buildSourceId(params.title)
  const qc = await kbUploadQc({
    capability_id: 'capability.kb_upload_qc',
    execution_id: `kb-source-${sourceId}`,
    intent: { type: 'task_management', extracted_slots: {} },
    slots: {
        source_type: params.source_type,
        source_ref: params.source_ref,
        customer_id: params.customer_id || null,
        kb_scope: params.kb_scope || null,
      customer_context: params.customer_context || null,
      uploaded_by: params.uploaded_by,
    },
  })

  const qcResult = (qc.result || {}) as {
    ingest_status?: 'accepted' | 'needs_review' | 'rejected'
    document_count?: number
    chunk_count?: number
    qc_flags?: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
  }

  const payload = {
    source_id: sourceId,
    title: params.title,
    customer_id: params.customer_id || null,
    kb_scope: params.kb_scope || null,
    source_type: params.source_type,
    source_ref: params.source_ref,
    source_status: 'draft' as KbSourceStatus,
    qc_status: qcResult.ingest_status || 'rejected',
    document_count: Number(qcResult.document_count || 0),
    chunk_count: Number(qcResult.chunk_count || 0),
    qc_flags: Array.isArray(qcResult.qc_flags) ? qcResult.qc_flags : [],
    uploaded_by: params.uploaded_by,
    customer_context: params.customer_context || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { error } = await supabase.from(KB_SOURCE_TABLE).upsert(payload, { onConflict: 'source_id' })
    if (error) throw error
    return { source_id: sourceId, inventory_source: 'supabase' }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
    return null
  }
}

export async function transitionKbSourceItem(params: TransitionKbSourceParams): Promise<{ source_id: string; previous_status: KbSourceStatus; source_status: KbSourceStatus; inventory_source: 'supabase' } | null> {
  const transition = KB_SOURCE_TRANSITIONS[params.action]

  try {
    const { data: existing, error: loadError } = await supabase
      .from(KB_SOURCE_TABLE)
.select('source_id,source_status,customer_id')
      .eq('source_id', params.source_id)
      .maybeSingle()

    if (loadError) throw loadError
    if (!existing) return null

    const previousStatus = String((existing as { source_status?: string }).source_status || '') as KbSourceStatus
    const customerId = typeof (existing as { customer_id?: string | null }).customer_id === 'string' ? (existing as { customer_id?: string | null }).customer_id : null
    if (customerId && !isMutationAllowedForCustomer(customerId, 'capability.kb_upload_qc')) {
      throw new Error('customer_capability_not_allowed')
    }
    if (!transition.from.includes(previousStatus)) {
      throw new Error(`invalid_transition:${previousStatus}->${transition.to}`)
    }

    const { data: updated, error: updateError } = await supabase
      .from(KB_SOURCE_TABLE)
      .update({ source_status: transition.to, updated_at: new Date().toISOString() })
      .eq('source_id', params.source_id)
.select('source_id,source_status,customer_id')
      .single()

    if (updateError) throw updateError

    return {
      source_id: String((updated as { source_id?: string }).source_id || params.source_id),
      previous_status: previousStatus,
      source_status: String((updated as { source_status?: string }).source_status || transition.to) as KbSourceStatus,
      inventory_source: 'supabase',
    }
  } catch (error) {
    if (!isRecoverableError(error)) throw error
    return null
  }
}
