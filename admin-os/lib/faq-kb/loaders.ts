import fs from 'fs'
import path from 'path'

import { kbUploadQc } from '@/lib/capabilities/kb-upload-qc'

export type FaqKbManifestDocument = {
  id: string
  title: string
  kb_scope?: string | null
  path: string
  keywords?: string[]
}

export type FaqKbManifest = {
  registry_id: string
  version: string
  documents: FaqKbManifestDocument[]
}

export type FaqReviewQueueItem = {
  review_id: string
  question: string
  reason: string
  priority: 'high' | 'normal'
  queue_status: string
  customer_id?: string | null
  kb_scope: string | null
  channel: string | null
  confidence: number | null
  created_at: string
  draft_answer: string | null
  citations: Array<{ source_id?: string; title?: string; snippet?: string }>
  review_queue_label?: string | null
  operator_hint?: string | null
  suggested_actions?: string[]
  escalation_style?: 'operator' | 'guided' | 'observer' | null
}

export type KbQcPreviewItem = {
  source_id: string
  title: string
  kb_scope: string
  source_type: string
  ingest_status: 'accepted' | 'needs_review' | 'rejected'
  document_count: number
  chunk_count: number
  qc_flags: Array<{ code: string; severity: 'info' | 'warning' | 'error'; message: string }>
}

const FAQ_KB_DIR = 'app/configs/faq-kb'
const MANIFEST_PATH = path.join(FAQ_KB_DIR, 'faq_kb_manifest_v1.json')
const REVIEW_QUEUE_PATH = path.join(FAQ_KB_DIR, 'review_queue_seed_v1.json')
const QC_SEED_PATH = path.join(FAQ_KB_DIR, 'qc_preview_seed_v1.json')

function toAbsolutePath(targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath)
}

function readJsonFile<T>(targetPath: string): T {
  return JSON.parse(fs.readFileSync(toAbsolutePath(targetPath), 'utf8')) as T
}

export function loadFaqKbManifest(): FaqKbManifest {
  return readJsonFile<FaqKbManifest>(MANIFEST_PATH)
}

export function loadFaqReviewQueue(): { queue_id: string; items: FaqReviewQueueItem[] } {
  return readJsonFile<{ queue_id: string; items: FaqReviewQueueItem[] }>(REVIEW_QUEUE_PATH)
}

export async function buildKbQcPreview(): Promise<{ generated_at: string; items: KbQcPreviewItem[] }> {
  const manifest = loadFaqKbManifest()
  const qcSeed = readJsonFile<{ generated_at: string; items: KbQcPreviewItem[] }>(QC_SEED_PATH)

  const manifestItems = await Promise.all(
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

  const syntheticItems = (qcSeed.items || []).filter((item) => !manifest.documents.some((doc) => doc.id === item.source_id))

  return {
    generated_at: new Date().toISOString(),
    items: [...manifestItems, ...syntheticItems],
  }
}
