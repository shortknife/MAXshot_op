import fs from 'fs'
import path from 'path'
import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'

type QcFlag = {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
}

function buildFailure(reason: string): CapabilityOutput {
  return {
    capability_id: 'kb_upload_qc',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'kb_upload_qc',
      capability_version: '1.0',
      status: 'failed',
      used_skills: ['kb-qc'],
    },
    used_skills: ['kb-qc'],
    metadata: { rejected_reason: reason },
  }
}

function addFlag(flags: QcFlag[], code: string, severity: QcFlag['severity'], message: string) {
  flags.push({ code, severity, message })
}

function toAbsolutePath(sourceRef: string): string {
  return path.isAbsolute(sourceRef) ? sourceRef : path.join(process.cwd(), sourceRef)
}

function splitMarkdownChunks(content: string): string[] {
  return String(content || '')
    .split(/\n(?=##?\s)|\n\n+/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function inferIngestStatus(flags: QcFlag[]): 'accepted' | 'needs_review' | 'rejected' {
  if (flags.some((flag) => flag.severity === 'error')) return 'rejected'
  if (flags.some((flag) => flag.severity === 'warning')) return 'needs_review'
  return 'accepted'
}

export async function kbUploadQc(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (error) {
    return buildFailure(error instanceof Error ? error.message : 'invalid_slots')
  }

  const sourceType = (readStringParam(slots, 'source_type', { required: true }) || '').toLowerCase()
  const sourceRef = readStringParam(slots, 'source_ref', { required: true }) || ''
  const kbScope = readStringParam(slots, 'kb_scope') || null
  const customerContext = readStringParam(slots, 'customer_context') || null
  const uploadedBy = readStringParam(slots, 'uploaded_by') || null
  const flags: QcFlag[] = []
  const evidenceSources: Array<Record<string, unknown>> = []
  let documentCount = 0
  let chunkCount = 0
  let content = ''

  if (!['markdown', 'text', 'url', 'pdf'].includes(sourceType)) {
    return buildFailure('unsupported_source_type')
  }

  if (sourceType === 'url') {
    if (!/^https?:\/\//i.test(sourceRef)) {
      addFlag(flags, 'invalid_url', 'error', 'source_ref must be a valid http/https URL')
    } else {
      documentCount = 1
      addFlag(flags, 'url_fetch_not_implemented', 'warning', 'URL sources are recognized but remote fetching is not enabled in this slice')
      evidenceSources.push({ source_type: 'url', source_ref: sourceRef })
    }
  } else if (sourceType === 'text') {
    content = sourceRef
    documentCount = 1
    evidenceSources.push({ source_type: 'inline_text' })
  } else if (sourceType === 'markdown' || sourceType === 'pdf') {
    const absPath = toAbsolutePath(sourceRef)
    if (!fs.existsSync(absPath)) {
      addFlag(flags, 'file_not_found', 'error', 'Referenced source file does not exist')
    } else {
      documentCount = 1
      evidenceSources.push({ source_type: 'file', source_ref: sourceRef, absolute_path: absPath })
      if (sourceType === 'pdf') {
        addFlag(flags, 'pdf_preview_not_implemented', 'warning', 'PDF parsing is not implemented in this slice')
      } else {
        content = fs.readFileSync(absPath, 'utf8')
      }
    }
  }

  if (sourceType !== 'url' && sourceType !== 'pdf') {
    const trimmed = content.replace(/\s+/g, ' ').trim()
    if (!trimmed) addFlag(flags, 'empty_content', 'error', 'Source content is empty')
    if (trimmed && trimmed.length < 80) addFlag(flags, 'content_too_short', 'warning', 'Source content is too short for reliable FAQ ingestion')

    const chunks = splitMarkdownChunks(content)
    chunkCount = chunks.length
    if (chunkCount === 0 && trimmed) chunkCount = 1
    if (sourceType === 'markdown') {
      if (!/^#\s+/m.test(content)) addFlag(flags, 'missing_title_heading', 'warning', 'Markdown source has no top-level title heading')
      if (!/^##\s+/m.test(content)) addFlag(flags, 'missing_section_heading', 'warning', 'Markdown source has no FAQ section headings')
    }
  }

  const ingestStatus = inferIngestStatus(flags)
  const usedSkills = ['kb-qc']

  return {
    capability_id: 'kb_upload_qc',
    capability_version: '1.0',
    status: 'success',
    result: {
      ingest_status: ingestStatus,
      document_count: documentCount,
      chunk_count: chunkCount,
      qc_flags: flags,
    },
    evidence: {
      sources: evidenceSources,
      doc_quotes: null,
      ...(ingestStatus !== 'accepted' ? { fallback_reason: ingestStatus } : {}),
    },
    audit: {
      capability_id: 'kb_upload_qc',
      capability_version: '1.0',
      status: 'success',
      used_skills: usedSkills,
    },
    used_skills: usedSkills,
    metadata: {
      kb_scope: kbScope,
      customer_context: customerContext,
      uploaded_by: uploadedBy,
      preview_only: true,
    },
  }
}
