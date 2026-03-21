import fs from 'fs/promises'
import path from 'path'
import { getPromptBySlug, PromptResolution } from '@/lib/prompts/prompt-registry'
import {
  describeActiveCapabilitiesForPrompt,
  getCapabilityRegistryMeta,
  inferLegacyIntentTypeFromCapabilityIds,
  MAX_MATCHED_CAPABILITIES,
  resolveCapabilityIds,
} from '@/lib/router/capability-catalog'

export type IntentAnalysisResult = {
  intent: {
    type: string
    extracted_slots: Record<string, unknown>
    confidence: number
  }
  raw_query: string
  tokens_used: number
  prompt_meta?: {
    slug: string
    version: string
    source: 'supabase' | 'fallback_csv' | 'local_stub'
    hash?: string
  }
}

type LlmIntentOutput = {
  matched?: boolean
  capability_id?: string
  intent_type?: string
  matched_capability_id?: string
  matched_capability_ids?: string[]
  in_scope?: boolean
  reason?: string
  out_of_scope_reply?: string
  need_clarification?: boolean
  clarification_question?: string
  clarification_options?: string[]
  slots?: Record<string, unknown>
  confidence?: number
}

function normalize(text: string) {
  return text.toLowerCase()
}

function isSmallTalkQuery(raw: string) {
  const normalized = normalize(raw).trim()
  return (
    normalized === 'hi' ||
    normalized === 'hello' ||
    normalized === '你好' ||
    normalized === 'hey' ||
    normalized.includes('吃饭') ||
    normalized.includes('nba')
  )
}

function isProductDocLikeQuery(raw: string) {
  const normalized = normalize(raw)
  return (
    normalized.includes('产品定义') ||
    normalized.includes('文档') ||
    normalized.includes('fsd') ||
    normalized.includes('contract') ||
    normalized.includes('router') ||
    normalized.includes('capability') ||
    /(做什么用|是什么|什么意思|怎么定义|职责)/.test(raw)
  )
}

function isExplicitMetricAsk(raw: string) {
  const normalized = normalize(raw)
  return (
    /(多少|最高|最低|均值|平均|走势|趋势|列表|详情|统计|排名|比较|对比|最近|top|\bmax\b|\bmin\b)/.test(raw) ||
    /(apy|收益|tvl|execution|执行|vault|金库|rebalance|调仓)/.test(normalized)
  )
}

function tryExtractTopic(raw: string): string | undefined {
  const text = raw.trim()
  const patterns = [/关于(.+?)(的|帖子|文案|简介|$)/, /写一条(.+?)(帖子|文案|$)/, /生成(.+?)(简介|文案|帖子|$)/]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

function inferBusinessScope(raw: string): string | null {
  const text = raw.toLowerCase()
  const hintedScope = text.match(/scope=(yield|vault|allocation|execution|rebalance)/)?.[1]
  if (hintedScope) return hintedScope
  if (
    text.includes('整体表现') ||
    text.includes('总体表现') ||
    text.includes('整体情况') ||
    text.includes('表现如何') ||
    text.includes('overall performance') ||
    text.includes('health')
  ) return 'yield'
  if (text.includes('apy') || text.includes('收益') || text.includes('回报率')) return 'yield'
  if (text.includes('vault') || text.includes('金库')) return 'vault'
  if (text.includes('allocation') || text.includes('分配') || text.includes('仓位')) return 'allocation'
  if (text.includes('rebalance') || text.includes('再平衡') || text.includes('调仓')) return 'rebalance'
  if (text.includes('execution') || text.includes('执行详情') || text.includes('交易') || text.includes('订单')) return 'execution'
  return null
}

function inferAggregation(raw: string): string | null {
  const text = String(raw || '').toLowerCase()
  if (/(最高|peak|\bmax\b)/.test(text)) return 'max'
  if (/(最低|lowest|\bmin\b)/.test(text)) return 'min'
  if (/(平均|均值|avg|average)/.test(text)) return 'avg'
  if (/(实时|当前|最新|real-time|realtime)/.test(text)) return 'realtime'
  return null
}

function currentYear() {
  return new Date().getFullYear()
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function extractAbsoluteDateRange(raw: string): { date_from: string; date_to: string; timezone: string } | null {
  const text = String(raw || '').trim()
  if (!text) return null

  let match = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:到|至|-|~)\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) {
    return {
      date_from: toIsoDate(Number(match[1]), Number(match[2]), Number(match[3])),
      date_to: toIsoDate(Number(match[4]), Number(match[5]), Number(match[6])),
      timezone: 'Asia/Shanghai',
    }
  }

  match = text.match(/(\d{1,2})月(\d{1,2})日?\s*(?:到|至|-|~)\s*(\d{1,2})月(\d{1,2})日?/)
  if (match) {
    const year = currentYear()
    return {
      date_from: toIsoDate(year, Number(match[1]), Number(match[2])),
      date_to: toIsoDate(year, Number(match[3]), Number(match[4])),
      timezone: 'Asia/Shanghai',
    }
  }

  match = text.match(/(\d{1,2})[/-](\d{1,2})\s*(?:到|至|-|~)\s*(\d{1,2})[/-](\d{1,2})/)
  if (match) {
    const year = currentYear()
    return {
      date_from: toIsoDate(year, Number(match[1]), Number(match[2])),
      date_to: toIsoDate(year, Number(match[3]), Number(match[4])),
      timezone: 'Asia/Shanghai',
    }
  }

  return null
}

type LocalPromptConfig = {
  version?: string
  prompts?: Array<{
    slug: string
    status?: string
    system_prompt?: string
    user_prompt_template?: string
  }>
}

async function getLocalPromptBySlug(slug: string): Promise<PromptResolution | null> {
  try {
    const filePath = path.resolve(process.cwd(), 'app/configs/prompt-library-op/prompt_library_op_v1.json')
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as LocalPromptConfig
    const prompt = (parsed.prompts || []).find((item) => item.slug === slug)
    if (!prompt) return null
    return {
      prompt: {
        slug: prompt.slug,
        version: String(parsed.version || '1'),
        system_prompt: String(prompt.system_prompt || ''),
        user_prompt_template: String(prompt.user_prompt_template || ''),
      },
      source: 'fallback_csv',
      hash: `local-op:${prompt.slug}:${parsed.version || '1.0.0'}`,
    }
  } catch {
    return null
  }
}

function inferMatchedCapabilitiesFromLegacyIntent(params: {
  rawQuery: string
  intentType: string
  inScope: boolean
  slots: Record<string, unknown>
}): string[] {
  const { rawQuery, intentType, inScope, slots } = params
  if (!inScope) return []
  if (isSmallTalkQuery(rawQuery)) return []

  if (intentType === 'content_brief' || intentType === 'marketing_gen') {
    return ['capability.context_assembler', 'capability.content_generator']
  }

  if (intentType === 'general_qna' || intentType === 'product_qna' || intentType === 'documentation') {
    return isProductDocLikeQuery(rawQuery) ? ['capability.product_doc_qna'] : []
  }

  if (['business_query', 'ops_summary', 'audit_query', 'memory_query', 'metric_query'].includes(intentType)) {
    return ['capability.data_fact_query']
  }

  const scope = String(slots.scope || '').trim().toLowerCase()
  if (scope) {
    return ['capability.data_fact_query']
  }

  return []
}

function injectCapabilityContext(template: string, capabilityList: string, registryMeta: ReturnType<typeof getCapabilityRegistryMeta>) {
  return String(template || '')
    .replaceAll('{{capability_list}}', capabilityList)
    .replaceAll('{{capability_registry_version}}', String(registryMeta.version || '1.0.0'))
    .replaceAll('{{capability_registry_active_count}}', String(registryMeta.active_count || 0))
}

function buildPromptMeta(promptResolved: Awaited<ReturnType<typeof getPromptBySlug>>) {
  return promptResolved
    ? {
        slug: promptResolved.prompt.slug,
        version: promptResolved.prompt.version,
        source: promptResolved.source,
        hash: promptResolved.hash,
      }
    : {
        slug: 'intent_analyzer',
        version: '0',
        source: 'local_stub' as const,
      }
}

function buildFallbackResult(rawQuery: string, promptMeta: IntentAnalysisResult['prompt_meta']): IntentAnalysisResult {
  const normalized = normalize(rawQuery)
  const hasSummary = normalized.includes('汇总') || normalized.includes('summary') || normalized.includes('状态')
  const hasAudit = normalized.includes('审计') || normalized.includes('audit')
  const hasMemory = normalized.includes('memory') || normalized.includes('记忆') || normalized.includes('insight')
  const hasRecent = normalized.includes('最近') || normalized.includes('latest') || normalized.includes('recent')
  const isSmallTalk = isSmallTalkQuery(rawQuery)
  const businessScope = inferBusinessScope(rawQuery)
  const hasBusinessIntent =
    normalized.includes('业务') ||
    normalized.includes('vault') ||
    normalized.includes('金库') ||
    normalized.includes('apy') ||
    normalized.includes('收益') ||
    normalized.includes('execution') ||
    normalized.includes('执行') ||
    normalized.includes('调仓') ||
    normalized.includes('再平衡') ||
    normalized.includes('rebalance') ||
    normalized.includes('scope=') ||
    normalized.includes('arbitrum') ||
    normalized.includes('ethereum') ||
    normalized.includes('optimism') ||
    normalized.includes('base') ||
    normalized.includes('solana') ||
    normalized.includes('plasma') ||
    normalized.includes('morpho') ||
    normalized.includes('aave') ||
    normalized.includes('euler') ||
    normalized.includes('unitus')
  const hasProductDocIntent = isProductDocLikeQuery(rawQuery)
  const hasContentIntent =
    normalized.includes('简介') ||
    normalized.includes('brief') ||
    normalized.includes('文案') ||
    normalized.includes('发帖') ||
    normalized.includes('帖子') ||
    normalized.includes('cta')

  const matchedCapabilityIds = (() => {
    if (isSmallTalk) return []
    if (hasProductDocIntent && !isExplicitMetricAsk(rawQuery)) return ['capability.product_doc_qna']
    if (hasBusinessIntent && !hasAudit && !hasMemory) return ['capability.data_fact_query']
    if (hasContentIntent) return ['capability.context_assembler', 'capability.content_generator']
    if (hasProductDocIntent) return ['capability.product_doc_qna']
    if ((hasSummary && normalized.includes('执行')) || normalized.includes('ops')) return ['capability.data_fact_query']
    if (hasAudit && hasRecent) return ['capability.data_fact_query']
    if (hasMemory && hasRecent) return ['capability.context_assembler']
    return []
  })()
  const legacyIntentType = inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds)

  if (isSmallTalk) {
    return {
      intent: {
        type: 'out_of_scope',
        extracted_slots: {
          in_scope: false,
          reason: 'non_business_query',
          matched_capability_ids: [],
        },
        confidence: 0.8,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasBusinessIntent && !hasAudit && !hasMemory) {
    const absoluteDateRange = extractAbsoluteDateRange(rawQuery)
    const aggregation = inferAggregation(rawQuery)
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          scope: businessScope || 'unknown',
          ...(aggregation ? { aggregation, metric_agg: aggregation } : {}),
          ...(/vault|金库/i.test(rawQuery) ? { entity: 'vault' } : {}),
          ...(absoluteDateRange && aggregation === 'max'
            ? { question_shape: 'top_1_in_period', return_fields: ['vault_name', 'apy_value', 'tvl_total'] }
            : {}),
          ...(absoluteDateRange || {}),
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
        },
        confidence: 0.78,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if ((hasSummary && normalized.includes('执行')) || normalized.includes('ops')) {
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          days: normalized.includes('7') ? 7 : 30,
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
          scope: businessScope || 'execution',
        },
        confidence: 0.72,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasAudit && hasRecent) {
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          limit: normalized.includes('20') ? 20 : 10,
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
          scope: 'execution',
        },
        confidence: 0.72,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasMemory && hasRecent) {
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          limit: normalized.includes('10') ? 10 : 5,
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
        },
        confidence: 0.72,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasContentIntent) {
    const topic = tryExtractTopic(rawQuery)
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          ...(topic ? { topic } : {}),
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
        },
        confidence: 0.6,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasProductDocIntent || normalized.includes('原理') || normalized.includes('产品') || normalized.includes('qna')) {
    return {
      intent: {
        type: legacyIntentType === 'out_of_scope' ? 'out_of_scope' : legacyIntentType,
        extracted_slots: {
          in_scope: legacyIntentType !== 'out_of_scope',
          reason: legacyIntentType === 'out_of_scope' ? 'non_business_query' : undefined,
          matched_capability_ids: matchedCapabilityIds,
          matched_capability_id: matchedCapabilityIds[0],
        },
        confidence: 0.6,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  return {
      intent: {
        type: 'out_of_scope',
        extracted_slots: {
          in_scope: false,
          reason: 'unknown_query',
          matched_capability_ids: [],
        },
        confidence: 0.5,
    },
    raw_query: rawQuery,
    tokens_used: 0,
    prompt_meta: promptMeta,
  }
}

function safeJsonParse(text: string): LlmIntentOutput | null {
  try {
    const parsed = JSON.parse(text) as LlmIntentOutput
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function normalizeLlmIntentType(type: string): string {
  const t = String(type || '').trim().toLowerCase()
  if (!t) return 'out_of_scope'
  if (t === 'ops' || t === 'ops_query' || t === 'ops_summary') return 'ops_summary'
  if (t === 'audit' || t === 'audit_query') return 'audit_query'
  if (t === 'memory' || t === 'memory_query') return 'memory_query'
  if (t === 'business' || t === 'business_query') return 'business_query'
  if (t === 'marketing' || t === 'marketing_gen') return 'marketing_gen'
  if (t === 'content' || t === 'content_brief' || t === 'content_generation') return 'content_brief'
  if (t === 'metric' || t === 'metric_query') return 'metric_query'
  if (t === 'task_management') return 'task_management'
  if (t === 'general_qna' || t === 'product_qna' || t === 'documentation') return 'general_qna'
  if (t === 'out_of_scope' || t === 'unsupported') return 'out_of_scope'
  return 'out_of_scope'
}

async function callDeepSeekApi(params: {
  rawQuery: string
  sessionContext?: string
  systemPrompt: string
  userPromptTemplate: string
}): Promise<{ output: LlmIntentOutput; tokensUsed: number } | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null

  const endpoint = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions'
  const userPrompt = params.userPromptTemplate
    .replace('{{clean_query}}', params.rawQuery)
    .replace('{{session_context}}', JSON.stringify(params.sessionContext || null))
    .replace('{{context_payload}}', JSON.stringify(params.sessionContext || null))
    .replace('{{memory_layer_context}}', JSON.stringify(null))

  const schemaHint = `You must respond with valid JSON only. Prefer capability matching over abstract intent classes. Schema:
{"matched":true|false,"capability_id":"capability.id","matched_capability_ids":["capability.id"],"matched_capability_id":"capability.id","intent_type":"business_query|ops_summary|audit_query|memory_query|content_brief|marketing_gen|metric_query|task_management|general_qna|out_of_scope","in_scope":true|false,"reason":"small_talk|out_of_scope|unknown","out_of_scope_reply":"string","need_clarification":true|false,"clarification_question":"string","clarification_options":["string"],"slots":{"scope":"yield|vault|allocation|execution|rebalance","entity":"vault|chain|protocol|market|execution","aggregation":"max|min|avg|latest|top_n|compare","date_from":"YYYY-MM-DD","date_to":"YYYY-MM-DD","timezone":"Asia/Shanghai","question_shape":"top_1_in_period|compare_entities|trend_window|current_snapshot|summary","return_fields":["string"]},"confidence":0.0-1.0}
Rules:
- matched_capability_ids must contain at least 0 and at most ${MAX_MATCHED_CAPABILITIES} active capability ids
- if more than ${MAX_MATCHED_CAPABILITIES} capabilities seem relevant, return need_clarification=true instead of listing more
- if the query already contains a complete absolute date range plus metric and aggregation, do not ask for time clarification`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_INTENT_MODEL || 'deepseek-chat',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${params.systemPrompt}\n\n${schemaHint}`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { total_tokens?: number }
    }
    const text = json.choices?.[0]?.message?.content || ''
    const parsed = safeJsonParse(text)
    if (!parsed) return null
    return {
      output: parsed,
      tokensUsed: Number(json.usage?.total_tokens || 0),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function callDeepSeek(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  const promptResolved =
    (await getLocalPromptBySlug('intent_analyzer_op_v1')) ??
    (await getPromptBySlug('intent_analyzer')) ??
    (await getPromptBySlug('llm_question_classifier'))
  const promptMeta = buildPromptMeta(promptResolved)
  const capabilityList = describeActiveCapabilitiesForPrompt()
  const registryMeta = getCapabilityRegistryMeta()
  const systemPrompt = injectCapabilityContext(
    promptResolved?.prompt.system_prompt || 'You are a capability matcher.',
    capabilityList,
    registryMeta
  )
  const userPromptTemplate = injectCapabilityContext(
    promptResolved?.prompt.user_prompt_template ||
      '{"user_query":"{{clean_query}}","session_context":{{context_payload}},"capabilities":"{{capability_list}}"}',
    capabilityList,
    registryMeta
  )

  const llm = await callDeepSeekApi({
    rawQuery,
    sessionContext,
    systemPrompt,
    userPromptTemplate,
  })

  if (!llm) {
    return buildFallbackResult(rawQuery, promptMeta)
  }

  let matchedCapabilityIds = resolveCapabilityIds(
    [
      llm.output.capability_id,
      ...(Array.isArray(llm.output.matched_capability_ids) ? llm.output.matched_capability_ids : []),
      llm.output.matched_capability_id,
    ],
    MAX_MATCHED_CAPABILITIES
  )
  let intentType = normalizeLlmIntentType(String(llm.output.intent_type || inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds) || 'out_of_scope'))
  let inScope = Boolean(llm.output.in_scope ?? llm.output.matched ?? matchedCapabilityIds.length > 0)
  let needClarification = Boolean(llm.output.need_clarification)
  let slots = {
    ...(llm.output.slots || {}),
  }
  const absoluteDateRange = extractAbsoluteDateRange(rawQuery)
  if (absoluteDateRange) {
    slots = {
      ...absoluteDateRange,
      ...slots,
    }
  }
  const inferredScope = inferBusinessScope(rawQuery)
  const inferredAggregation = inferAggregation(rawQuery)
  slots = {
    ...(inferredScope && !slots.scope ? { scope: inferredScope } : {}),
    ...(inferredAggregation && !slots.aggregation && !slots.metric_agg ? { aggregation: inferredAggregation, metric_agg: inferredAggregation } : {}),
    ...slots,
  }

  if (isSmallTalkQuery(rawQuery)) {
    intentType = 'out_of_scope'
    inScope = false
  }

  if (llm.output.matched === false) {
    matchedCapabilityIds = []
    inScope = false
    intentType = 'out_of_scope'
  }

  if (matchedCapabilityIds.length === 0) {
    matchedCapabilityIds = resolveCapabilityIds(
      inferMatchedCapabilitiesFromLegacyIntent({
        rawQuery,
        intentType,
        inScope,
        slots,
      }),
      MAX_MATCHED_CAPABILITIES
    )
  }

  if (matchedCapabilityIds.length > 0 && intentType === 'out_of_scope') {
    intentType = inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds)
    inScope = true
  }

  if (intentType === 'metric_query' && /(整体表现|总体表现|整体情况|表现如何|overall performance|health)/i.test(rawQuery)) {
    intentType = 'business_query'
    inScope = true
    needClarification = false
    slots = {
      ...slots,
      scope: 'yield',
    }
  }

  if (intentType === 'general_qna' && isSmallTalkQuery(rawQuery)) {
    intentType = 'out_of_scope'
    inScope = false
    matchedCapabilityIds = []
  }

  slots = {
    ...slots,
    matched_capability_ids: matchedCapabilityIds,
    matched_capability_id: matchedCapabilityIds[0] || null,
    in_scope: inScope,
    need_clarification: needClarification,
    clarification_question: needClarification ? llm.output.clarification_question || '' : '',
    clarification_options: needClarification && Array.isArray(llm.output.clarification_options)
      ? llm.output.clarification_options.slice(0, 3)
      : [],
  }
  const confidence = Number(llm.output.confidence ?? 0.7)

  return {
    intent: {
      type: inScope ? intentType : 'out_of_scope',
      extracted_slots: slots,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.7,
    },
    raw_query: rawQuery,
    tokens_used: llm.tokensUsed,
    prompt_meta: promptMeta,
  }
}
