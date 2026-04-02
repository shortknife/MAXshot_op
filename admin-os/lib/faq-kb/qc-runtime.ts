import { supabase } from '@/lib/supabase'
import { kbUploadQc } from '@/lib/capabilities/kb-upload-qc'
import { loadFaqKbManifest, type KbQcPreviewItem } from '@/lib/faq-kb/loaders'

const FAQ_KB_QC_TABLE = 'faq_kb_qc_snapshot_op'
const FAQ_KB_QC_LIMIT = 200

export type KbQcRuntimePreview = {
  generated_at: string
  source: 'supabase' | 'computed'
  items: KbQcPreviewItem[]
}

type KbQcRow = {
  source_id: string
  title: string
  kb_scope: string | null
  source_type: string
  ingest_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number | null
  chunk_count: number | null
  qc_flags: unknown
  generated_at: string
}

function isRecoverableQcError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    message.includes('Missing Supabase environment variables') ||
    message.includes('faq_kb_qc_snapshot_op') ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function normalizeFlags(value: unknown): Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }> {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object') as Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
    : []
}

function toPreviewItem(row: KbQcRow): KbQcPreviewItem {
  return {
    source_id: row.source_id,
    title: row.title,
    kb_scope: String(row.kb_scope || ''),
    source_type: row.source_type,
    ingest_status: row.ingest_status,
    document_count: Number(row.document_count || 0),
    chunk_count: Number(row.chunk_count || 0),
    qc_flags: normalizeFlags(row.qc_flags),
  }
}

async function computeManifestQc(): Promise<KbQcPreviewItem[]> {
  const manifest = loadFaqKbManifest()
  return Promise.all(
    (manifest.documents || []).map(async (doc) => {
      const output = await kbUploadQc({
        capability_id: 'capability.kb_upload_qc',
        execution_id: `qc-${doc.id}`,
        intent: { type: 'task_management', extracted_slots: {} },
        slots: {
          source_type: 'markdown',
          source_ref: doc.path,
          kb_scope: doc.kb_scope || null,
        },
      })
      const result = (output.result || {}) as {
        ingest_status?: 'accepted' | 'needs_review' | 'rejected'
        document_count?: number
        chunk_count?: number
        qc_flags?: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
      }
      return {
        source_id: doc.id,
        title: doc.title,
        kb_scope: String(doc.kb_scope || ''),
        source_type: 'markdown',
        ingest_status: result.ingest_status || 'rejected',
        document_count: Number(result.document_count || 0),
        chunk_count: Number(result.chunk_count || 0),
        qc_flags: Array.isArray(result.qc_flags) ? result.qc_flags : [],
      } satisfies KbQcPreviewItem
    })
  )
}

async function upsertKbQcSnapshot(items: KbQcPreviewItem[]): Promise<void> {
  const payload = items.map((item) => ({
    source_id: item.source_id,
    title: item.title,
    kb_scope: item.kb_scope || null,
    source_type: item.source_type,
    ingest_status: item.ingest_status,
    document_count: item.document_count,
    chunk_count: item.chunk_count,
    qc_flags: item.qc_flags,
    generated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from(FAQ_KB_QC_TABLE).upsert(payload, { onConflict: 'source_id' })
  if (error) throw error
}

export async function loadKbQcRuntimePreview(): Promise<KbQcRuntimePreview> {
  const manifest = loadFaqKbManifest()
  const manifestIds = new Set((manifest.documents || []).map((doc) => doc.id))

  try {
    const { data, error } = await supabase
      .from(FAQ_KB_QC_TABLE)
      .select('source_id,title,kb_scope,source_type,ingest_status,document_count,chunk_count,qc_flags,generated_at')
      .order('generated_at', { ascending: false })
      .limit(FAQ_KB_QC_LIMIT)

    if (error) throw error

    const runtimeRows = Array.isArray(data) ? data.map((row) => row as KbQcRow).filter((row) => manifestIds.has(row.source_id)) : []
    if (runtimeRows.length >= manifestIds.size && manifestIds.size > 0) {
      const generatedAt = runtimeRows.reduce((latest, row) => (row.generated_at > latest ? row.generated_at : latest), runtimeRows[0]?.generated_at || new Date().toISOString())
      return {
        generated_at: generatedAt,
        source: 'supabase',
        items: runtimeRows.map(toPreviewItem),
      }
    }
  } catch (error) {
    if (!isRecoverableQcError(error)) throw error
  }

  const computedItems = await computeManifestQc()
  try {
    await upsertKbQcSnapshot(computedItems)
  } catch (error) {
    if (!isRecoverableQcError(error)) throw error
  }

  return {
    generated_at: new Date().toISOString(),
    source: 'computed',
    items: computedItems,
  }
}
