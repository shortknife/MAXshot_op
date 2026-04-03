type PromptRef = {
  slug: string | null
  version: string | null
  source: string | null
  hash: string | null
  role: 'intent' | 'execution'
}

export type PromptRuntimeSnapshot = {
  assembly_mode: 'none' | 'intent_only' | 'execution_only' | 'intent_plus_execution'
  prompt_count: number
  primary_prompt_slug: string | null
  prompt_sources: string[]
  intent_prompt: PromptRef | null
  execution_prompt: PromptRef | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizePromptRef(value: unknown, role: PromptRef['role']): PromptRef | null {
  const record = asRecord(value)
  const slug = asString(record.slug) || asString(record.prompt_slug)
  const version = asString(record.version) || asString(record.prompt_version)
  const source = asString(record.source) || asString(record.prompt_source)
  const hash = asString(record.hash) || asString(record.prompt_hash)
  if (!slug && !version && !source && !hash) return null
  return {
    slug,
    version,
    source,
    hash,
    role,
  }
}

export function buildPromptRuntime(payload: Record<string, unknown>): PromptRuntimeSnapshot {
  const data = asRecord(payload.data)
  const meta = asRecord(data.meta)
  const intentPrompt = normalizePromptRef(meta.intent_prompt, 'intent')
  const executionPrompt =
    normalizePromptRef(meta.qna_prompt, 'execution') ||
    normalizePromptRef(meta.content_prompt, 'execution') ||
    null

  const promptCount = [intentPrompt, executionPrompt].filter(Boolean).length
  const assemblyMode: PromptRuntimeSnapshot['assembly_mode'] =
    intentPrompt && executionPrompt
      ? 'intent_plus_execution'
      : intentPrompt
        ? 'intent_only'
        : executionPrompt
          ? 'execution_only'
          : 'none'

  const primaryPromptSlug = executionPrompt?.slug || intentPrompt?.slug || null
  const promptSources = [...new Set([intentPrompt?.source, executionPrompt?.source].filter((value): value is string => Boolean(value)))]

  return {
    assembly_mode: assemblyMode,
    prompt_count: promptCount,
    primary_prompt_slug: primaryPromptSlug,
    prompt_sources: promptSources,
    intent_prompt: intentPrompt,
    execution_prompt: executionPrompt,
  }
}

export function attachPromptRuntime(params: {
  payload: Record<string, unknown>
  promptRuntime: PromptRuntimeSnapshot
}): Record<string, unknown> {
  const data = asRecord(params.payload.data)
  const meta = asRecord(data.meta)
  return {
    ...params.payload,
    data: {
      ...data,
      meta: {
        ...meta,
        prompt_runtime: params.promptRuntime,
      },
    },
  }
}
