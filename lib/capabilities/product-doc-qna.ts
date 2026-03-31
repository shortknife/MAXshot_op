import fs from 'fs'
import path from 'path'
import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'
import { getPromptBySlug } from '@/lib/prompts/prompt-registry'

export async function productDocQnA(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    return {
      capability_id: 'product_doc_qna',
      capability_version: '1.0',
      status: 'failed',
      result: null,
      error: reason,
      evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
      audit: {
        capability_id: 'product_doc_qna',
        capability_version: '1.0',
        status: 'failed',
        used_skills: [],
      },
      used_skills: [],
      metadata: { rejected_reason: reason },
    }
  }

  const docPath = readStringParam(slots, 'doc_path') || ''
  const prompt = await getPromptBySlug('product_doc_qna')
  let result: unknown = null
  let evidenceSources: unknown[] = []
  let fallbackReason: string | undefined

  if (docPath) {
    try {
      const absPath = path.isAbsolute(docPath)
        ? docPath
        : path.join(process.cwd(), docPath)
      const content = fs.readFileSync(absPath, 'utf8')
      result = { snippet: content.slice(0, 300) }
      evidenceSources = [{ source: 'file', path: docPath }]
    } catch {
      result = { answer: 'Document not found. Returning safe fallback.' }
      evidenceSources = []
      fallbackReason = 'doc_not_found'
    }
  } else {
    result = { answer: 'No document specified. Returning safe fallback.' }
    evidenceSources = []
    fallbackReason = 'missing_doc_path'
  }

  const used_skills = ['document-retrieval', 'prompt-registry']

  if (prompt) {
    evidenceSources.push({
      source: 'prompt_library',
      prompt_slug: prompt.prompt.slug,
      prompt_version: prompt.prompt.version,
      prompt_source: prompt.source,
      prompt_hash: prompt.hash,
    })
  }

  return {
    capability_id: 'product_doc_qna',
    capability_version: '1.0',
    status: 'success',
    result,
    evidence: { sources: evidenceSources ?? [], doc_quotes: null, fallback_reason: fallbackReason },
    audit: {
      capability_id: 'product_doc_qna',
      capability_version: '1.0',
      status: 'success',
      used_skills,
    },
    used_skills,
    metadata: {
      ...(fallbackReason ? { fallback_reason: fallbackReason } : {}),
      ...(prompt
        ? {
            prompt_slug: prompt.prompt.slug,
            prompt_version: prompt.prompt.version,
            prompt_source: prompt.source,
            prompt_hash: prompt.hash,
          }
        : {}),
    },
  }
}
