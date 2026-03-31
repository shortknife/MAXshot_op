import fs from 'fs/promises'
import path from 'path'
import type { ActiveContextSnapshot, PendingClarificationSnapshot, TurnRelation, TurnRelationType } from '@/lib/chat/context-manager/types'

type PromptSpec = {
  system_prompt: string
  user_prompt_template: string
}

type LlmOutput = {
  type?: string
  confidence?: number
  reason?: string
}

const ALLOWED_TYPES: TurnRelationType[] = [
  'new_session',
  'continuation',
  'clarification_reply',
  'correction',
  'new_topic_same_window',
  'history_callback',
]

function normalizeType(raw: string | undefined): TurnRelationType | null {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return null
  return ALLOWED_TYPES.includes(value as TurnRelationType) ? (value as TurnRelationType) : null
}

function safeJsonParse(text: string): LlmOutput | null {
  try {
    const parsed = JSON.parse(text) as LlmOutput
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function looksLikeCorrection(rawQuery: string): boolean {
  const value = rawQuery.toLowerCase()
  return /(不对|不是|纠正|改成|我说的是|你理解错了|不是这个)/.test(value)
}

function looksLikeHistoryCallback(rawQuery: string): boolean {
  const value = rawQuery.toLowerCase()
  return /(之前|刚才|回到|回看|那个|上一条|上次|earlier|previous)/.test(value)
}

function looksLikeNewTopic(rawQuery: string): boolean {
  const value = rawQuery.toLowerCase()
  return /(什么是|产品定义|产品文档|品牌故事|写一条|生成.*帖子|tweet|thread|介绍一下)/.test(value)
}

function looksLikeClarificationReply(rawQuery: string): boolean {
  const value = rawQuery.trim().toLowerCase()
  if (!value) return false
  if (/^(最近7天|最近30天|今天(?:（asia\/shanghai）)?|按天均值|每天中午12点快照|当前实时 apy)$/i.test(value)) return true
  if (/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:到|至|-|~)\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.test(value)) return true
  if (/(\d{1,2})月(\d{1,2})日?\s*(?:到|至|-|~)\s*(\d{1,2})月(\d{1,2})日?/.test(value)) return true
  if (/^(最近|今天|昨日|7天|30天|最高|最低|平均|实时|max|min|avg|latest)/.test(value)) return true
  return value.length <= 24 && !/[?？]/.test(value)
}

function buildFallbackRelation(params: {
  rawQuery: string
  threadAction: 'continue' | 'fork_new' | 'reset'
  pendingClarification: PendingClarificationSnapshot
}): TurnRelation {
  if (params.threadAction === 'reset') {
    return { type: 'new_session', confidence: 1, reason: 'explicit reset command' }
  }
  if (looksLikeCorrection(params.rawQuery)) {
    return { type: 'correction', confidence: 0.9, reason: 'explicit correction phrase detected' }
  }
  if (looksLikeHistoryCallback(params.rawQuery)) {
    return { type: 'history_callback', confidence: 0.82, reason: 'history callback phrase detected' }
  }
  if (params.pendingClarification.exists && looksLikeClarificationReply(params.rawQuery)) {
    return { type: 'clarification_reply', confidence: 0.88, reason: 'fills pending clarification with concise answer' }
  }
  if (looksLikeNewTopic(params.rawQuery)) {
    return { type: 'new_topic_same_window', confidence: 0.78, reason: 'topic-shift phrase detected' }
  }
  return { type: 'continuation', confidence: 0.7, reason: 'default continuation fallback' }
}

function shouldForceContinuation(params: {
  rawQuery: string
  activeContextSummary: ActiveContextSnapshot
}): boolean {
  const text = String(params.rawQuery || '').toLowerCase()
  if (!params.activeContextSummary.scope) return false
  if (!['yield', 'vault', 'execution', 'allocation', 'rebalance'].includes(String(params.activeContextSummary.scope))) {
    return false
  }
  if (/(看|只看|比较|对比|那|然后|继续|按|切到|换成|for|compare|only)/.test(text)) return true
  if (/(arbitrum|ethereum|base|optimism|plasma|solana|morpho|aave|euler|unitus|maxshot|dforce)/.test(text)) return true
  return false
}

function applyDeterministicGuards(params: {
  relation: TurnRelation
  rawQuery: string
  pendingClarification: PendingClarificationSnapshot
  activeContextSummary: ActiveContextSnapshot
}): TurnRelation {
  if (params.pendingClarification.exists && looksLikeClarificationReply(params.rawQuery)) {
    return {
      type: 'clarification_reply',
      confidence: Math.max(params.relation.confidence, 0.92),
      reason: 'guard: pending clarification answered directly',
    }
  }
  if (looksLikeCorrection(params.rawQuery)) {
    return {
      type: 'correction',
      confidence: Math.max(params.relation.confidence, 0.92),
      reason: 'guard: explicit correction phrase',
    }
  }
  if (shouldForceContinuation({ rawQuery: params.rawQuery, activeContextSummary: params.activeContextSummary })) {
    return {
      type: 'continuation',
      confidence: Math.max(params.relation.confidence, 0.86),
      reason: 'guard: follow-up constraints on active context',
    }
  }
  return params.relation
}

async function loadLocalPrompt(): Promise<PromptSpec | null> {
  try {
    const filePath = path.resolve(process.cwd(), 'app/configs/prompt-library-op/prompt_library_op_v1.json')
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as {
      prompts?: Array<{ slug?: string; system_prompt?: string; user_prompt_template?: string }>
    }
    const item = (parsed.prompts || []).find((p) => p.slug === 'turn_relation_classifier_op_v1')
    if (!item) return null
    return {
      system_prompt: String(item.system_prompt || ''),
      user_prompt_template: String(item.user_prompt_template || ''),
    }
  } catch {
    return null
  }
}

async function callClassifierModel(params: {
  rawQuery: string
  recentTurnsSummary: Array<{ role: string; content: string }>
  pendingClarification: PendingClarificationSnapshot
  activeContextSummary: ActiveContextSnapshot
}): Promise<TurnRelation | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const prompt = await loadLocalPrompt()
  if (!prompt) return null

  const endpoint = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions'
  const model = process.env.DEEPSEEK_INTENT_MODEL || 'deepseek-chat'
  const userPrompt = prompt.user_prompt_template
    .replace('{{raw_query}}', params.rawQuery)
    .replace('{{recent_turns_summary}}', JSON.stringify(params.recentTurnsSummary))
    .replace('{{pending_clarification}}', JSON.stringify(params.pendingClarification))
    .replace('{{active_context_summary}}', JSON.stringify(params.activeContextSummary))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system_prompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = json.choices?.[0]?.message?.content || ''
    const parsed = safeJsonParse(content)
    if (!parsed) return null
    const type = normalizeType(parsed.type)
    if (!type) return null
    const confidenceRaw = Number(parsed.confidence)
    const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0.65
    return {
      type,
      confidence,
      reason: String(parsed.reason || '').trim() || 'llm-classified',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function classifyTurnRelation(params: {
  rawQuery: string
  threadAction: 'continue' | 'fork_new' | 'reset'
  pendingClarification: PendingClarificationSnapshot
  activeContextSummary: ActiveContextSnapshot
  recentTurnsSummary?: Array<{ role: string; content: string }>
}): Promise<TurnRelation> {
  const llm = await callClassifierModel({
    rawQuery: params.rawQuery,
    recentTurnsSummary: params.recentTurnsSummary || [],
    pendingClarification: params.pendingClarification,
    activeContextSummary: params.activeContextSummary,
  })
  const baseRelation =
    llm ||
    buildFallbackRelation({
      rawQuery: params.rawQuery,
      threadAction: params.threadAction,
      pendingClarification: params.pendingClarification,
    })
  return applyDeterministicGuards({
    relation: baseRelation,
    rawQuery: params.rawQuery,
    pendingClarification: params.pendingClarification,
    activeContextSummary: params.activeContextSummary,
  })
}
