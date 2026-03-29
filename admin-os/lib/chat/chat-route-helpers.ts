import { randomUUID } from 'crypto'
import { buildMemoryRuntime, resolveInputMemoryRefs, toMemoryRefIds } from '@/lib/capabilities/memory-refs'
import type { CapabilityInputEnvelope } from '@/lib/router/types/capability'

export function buildChatEnvelope(intentType: string, slots: Record<string, unknown>, options?: { memory_refs?: unknown[]; context?: Record<string, unknown> }) {
  const envelope: CapabilityInputEnvelope = {
    capability_id: 'user_chat',
    execution_id: randomUUID(),
    intent: {
      type: intentType,
      extracted_slots: slots,
    },
    slots,
    memory_refs: options?.memory_refs || [],
    context: { channel: 'user_chat', ...(options?.context || {}) },
  }
  const normalizedMemoryRefs = resolveInputMemoryRefs(envelope)
  const memoryRuntime = buildMemoryRuntime(normalizedMemoryRefs)
  envelope.memory_refs = normalizedMemoryRefs
  envelope.memory_refs_ref = toMemoryRefIds(normalizedMemoryRefs)
  envelope.context = { ...(envelope.context || {}), memory_refs: normalizedMemoryRefs, memory_runtime: memoryRuntime }
  return envelope
}

export function previewRows(rows: unknown[], max = 5) {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, max)
}

export function detectQueryLanguage(rawQuery: string): 'zh' | 'en' {
  const text = String(rawQuery || '')
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const asciiWordCount = (text.match(/[A-Za-z]{2,}/g) || []).length
  if (zhCount > 0 && zhCount >= asciiWordCount) return 'zh'
  return 'en'
}

export function looksLikeContentBrief(rawQuery: string): boolean {
  const text = String(rawQuery || '').toLowerCase()
  const hasXToken = /(^|[^a-z0-9])x([^a-z0-9]|$)/.test(text)
  const asksWrite = /(写|文案|帖子|内容|post|copy|caption|draft|write|compose|generate)/.test(text)
  const hasContext = /(about|关于|linkedin|twitter|xiaohongshu|小红书|weibo|微博|新品|launch|product)/.test(text) || hasXToken
  return asksWrite && hasContext
}
