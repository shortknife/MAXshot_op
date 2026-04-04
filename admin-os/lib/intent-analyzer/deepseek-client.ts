import { getPromptBySlug, PromptResolution } from '@/lib/prompts/prompt-registry'
import { hasTimeWindow } from '@/lib/chat/query-clarification'
import { extractRelativeTimeSlots } from '@/lib/time/range-slots'
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
    source: 'filesystem_md' | 'local_stub'
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
    normalized.includes('能做什么业务') ||
    normalized.includes('做什么业务') ||
    normalized.includes('什么是maxshot') ||
    normalized.includes('描述什么是maxshot') ||
    normalized.includes('介绍maxshot') ||
    normalized.includes('描述maxshot') ||
    (looksLikeMaxshotDomainQuestion(raw) && /(做什么用|是什么|什么意思|怎么定义|职责)/.test(raw))
  )
}

function looksLikeMaxshotDomainQuestion(raw: string) {
  const normalized = normalize(raw)
  return /(maxshot|vault|金库|apy|tvl|execution|执行|rebalance|调仓|再平衡|protocol|chain|yield|收益|策略|风险|业务)/.test(
    normalized
  )
}

function isCapabilityOverviewQuery(raw: string) {
  const normalized = normalize(raw)
  return (
    normalized.includes('能做什么业务') ||
    normalized.includes('做什么业务') ||
    normalized.includes('能做什么') ||
    normalized.includes('what can you do') ||
    normalized.includes('capability')
  )
}

function isOpsSummaryQuery(raw: string) {
  const normalized = normalize(raw)
  return (
    /\bops\s+summary\b/.test(normalized) ||
    normalized.includes('执行状态汇总') ||
    normalized.includes('最近执行状态汇总') ||
    (normalized.includes('状态汇总') && (normalized.includes('执行') || normalized.includes('ops')))
  )
}

function isCurrentApyClarificationQuery(raw: string) {
  const normalized = normalize(raw)
  return (
    /(当前|现在)/.test(normalized) &&
    /(apy|收益|yield)/.test(normalized) &&
    !/(实时|最新|real-time|realtime|latest)/.test(normalized)
  )
}

function isGenericProductTheoryQuery(raw: string) {
  const normalized = normalize(raw)
  return (
    /(这个产品|该产品|这款产品)/.test(normalized) &&
    /(原理|核心原理|底层原理|理论|机制)/.test(normalized) &&
    !/maxshot/.test(normalized) &&
    !looksLikeMaxshotDomainQuestion(raw)
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

function inferBusinessMetric(raw: string): string | null {
  const text = raw.toLowerCase()
  if (/(调仓|rebalance|action)/.test(text)) return 'rebalance_action'
  if (/(execution|执行|详情|detail)/.test(text)) return 'execution_detail'
  if (/(vault|金库)/.test(text) && /(哪些|哪几个|那几个|list|列表)/.test(text)) return 'vault_list'
  if (/(tvl)/.test(text)) return 'tvl'
  if (/(apy|收益|yield|回报率)/.test(text)) return 'apy'
  return null
}

function inferAggregation(raw: string): string | null {
  const text = String(raw || '').toLowerCase()
  if (/(最高|peak|\bmax\b)/.test(text)) return 'max'
  if (/(最低|lowest|\bmin\b)/.test(text)) return 'min'
  if (/(平均|均值|avg|average)/.test(text)) return 'avg'
  if (/(实时|最新|real-time|realtime)/.test(text)) return 'realtime'
  return null
}

type SessionContextSnapshot = {
  activeContext: Record<string, unknown>
  pendingClarification: Record<string, unknown>
  recentTurnsSummary: Array<Record<string, unknown>>
}

function parseSessionContextSnapshot(sessionContext?: string): SessionContextSnapshot {
  if (!sessionContext) {
    return {
      activeContext: {},
      pendingClarification: {},
      recentTurnsSummary: [],
    }
  }
  try {
    const parsed = JSON.parse(sessionContext) as Record<string, unknown>
    const conversationContext = (
      (parsed.conversation_context as Record<string, unknown> | undefined) || parsed
    ) as Record<string, unknown>
    return {
      activeContext: ((conversationContext.active_context as Record<string, unknown>) || {}),
      pendingClarification: ((conversationContext.pending_clarification as Record<string, unknown>) || {}),
      recentTurnsSummary: Array.isArray(conversationContext.recent_turns_summary)
        ? (conversationContext.recent_turns_summary as Array<Record<string, unknown>>)
        : [],
    }
  } catch {
    return {
      activeContext: {},
      pendingClarification: {},
      recentTurnsSummary: [],
    }
  }
}

function normalizeChainAlias(raw: string): string | null {
  const text = String(raw || '').trim().toLowerCase()
  if (!text) return null
  if (/(^|\b)arb($|\b)|arbitrum/.test(text)) return 'arbitrum'
  if (/(^|\b)eth($|\b)|ethereum/.test(text)) return 'ethereum'
  if (/(^|\b)op($|\b)|optimism/.test(text)) return 'optimism'
  if (/(^|\b)base($|\b)/.test(text)) return 'base'
  if (/(^|\b)sol($|\b)|solana/.test(text)) return 'solana'
  if (/plasma/.test(text)) return 'plasma'
  return null
}

function normalizeProtocolAlias(raw: string): string | null {
  const text = String(raw || '').trim().toLowerCase()
  if (!text) return null
  if (/morpho/.test(text)) return 'morpho'
  if (/aave/.test(text)) return 'aave'
  if (/euler/.test(text)) return 'euler'
  if (/unitus/.test(text)) return 'unitus'
  return null
}

function currentYear() {
  return Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
    }).format(new Date())
  )
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

function extractCalendarPeriod(raw: string): Record<string, unknown> {
  const text = String(raw || '').trim()
  const range = extractAbsoluteDateRange(text)
  if (range) return range
  const relative = extractRelativeTimeSlots(text)
  if (relative) return relative
  const year = currentYear()
  let match = text.match(/(\d{1,2})月第([一二三四五12345])周/)
  if (match) {
    const month = Number(match[1])
    const weekMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 }
    const week = weekMap[match[2]] || Number(match[2])
    const startDay = (week - 1) * 7 + 1
    const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate())
    return {
      calendar_year: year,
      calendar_month: month,
      week_of_month: week,
      date_from: toIsoDate(year, month, startDay),
      date_to: toIsoDate(year, month, endDay),
      timezone: 'Asia/Shanghai',
    }
  }
  match = text.match(/(\d{1,2})月份?/)
  if (match) {
    const month = Number(match[1])
    const lastDay = new Date(year, month, 0).getDate()
    return {
      calendar_year: year,
      calendar_month: month,
      date_from: toIsoDate(year, month, 1),
      date_to: toIsoDate(year, month, lastDay),
      timezone: 'Asia/Shanghai',
    }
  }
  match = text.match(/(\d{1,2})月(\d{1,2})日(?:当天)?/)
  if (match) {
    const month = Number(match[1])
    const day = Number(match[2])
    const exactDay = toIsoDate(year, month, day)
    return {
      calendar_year: year,
      calendar_month: month,
      exact_day: exactDay,
      date_from: exactDay,
      date_to: exactDay,
      timezone: 'Asia/Shanghai',
    }
  }
  return {}
}

type IntentCriticOutput = {
  pass?: boolean
  reason?: string
  issues?: string[]
  repaired_output?: LlmIntentOutput | null
}

type IntentNormalizerOutput = {
  intent_type?: string
  matched_capability_ids?: string[]
  matched_capability_id?: string | null
  in_scope?: boolean
  need_clarification?: boolean
  clarification_question?: string
  clarification_options?: string[]
  slots?: Record<string, unknown>
  confidence?: number
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

function isOverallPerformanceBusinessQuery(rawQuery: string) {
  return /(整体表现|总体表现|整体情况|performance|overall)/i.test(rawQuery) && looksLikeMaxshotDomainQuestion(rawQuery)
}

function isBrandStoryQuery(rawQuery: string) {
  return /(品牌故事|brand story)/i.test(rawQuery) && /maxshot/i.test(rawQuery)
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

function buildFallbackResult(rawQuery: string, promptMeta: IntentAnalysisResult['prompt_meta'], sessionContext?: string): IntentAnalysisResult {
  const normalized = normalize(rawQuery)
  const isGenericProductTheory = isGenericProductTheoryQuery(rawQuery)
  const sessionSnapshot = parseSessionContextSnapshot(sessionContext)
  const activeContext = sessionSnapshot.activeContext
  const normalizedChainAlias = normalizeChainAlias(rawQuery)
  const normalizedProtocolAlias = normalizeProtocolAlias(rawQuery)
  const recentTurnsText = sessionSnapshot.recentTurnsSummary
    .map((turn) => String(turn.content || ''))
    .join(' ')
    .toLowerCase()
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
    normalized.includes('tvl') ||
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
    normalized.includes('unitus') ||
    Boolean(
      normalizedChainAlias &&
        (String(activeContext.metric || '').trim().toLowerCase() === 'vault_list' ||
          String(activeContext.scope || '').trim().toLowerCase() === 'vault' ||
          recentTurnsText.includes('vault_list'))
    )
  const isVaultChainFollowUp =
    Boolean(normalizedChainAlias) &&
    /^(base|sol|arb|eth|op|arbitrum|ethereum|optimism|solana|plasma)\s*(链)?\s*(呢)?[？?]?$/i.test(String(rawQuery || '').trim()) &&
    (String(activeContext.metric || '').trim().toLowerCase() === 'vault_list' ||
      String(activeContext.scope || '').trim().toLowerCase() === 'vault' ||
      recentTurnsText.includes('vault_list'))
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

  if (isGenericProductTheory) {
    return {
      intent: {
        type: 'out_of_scope',
        extracted_slots: {
          in_scope: false,
          reason: 'non_business_query',
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          matched_capability_ids: [],
          matched_capability_id: null,
        },
        confidence: 0.8,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (isCapabilityOverviewQuery(rawQuery)) {
    return {
      intent: {
        type: 'general_qna',
        extracted_slots: {
          in_scope: true,
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          question_shape: 'capability_overview',
          return_fields: ['capability_overview'],
          matched_capability_ids: ['capability.product_doc_qna'],
          matched_capability_id: 'capability.product_doc_qna',
        },
        confidence: 0.72,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (isOverallPerformanceBusinessQuery(rawQuery)) {
    return {
      intent: {
        type: 'business_query',
        extracted_slots: {
          in_scope: true,
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          scope: 'yield',
          metric: 'apy',
          aggregation: 'avg',
          metric_agg: 'avg',
          time_window_days: 7,
          question_shape: 'window_summary',
          matched_capability_ids: ['capability.data_fact_query'],
          matched_capability_id: 'capability.data_fact_query',
        },
        confidence: 0.8,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (isCurrentApyClarificationQuery(rawQuery)) {
    return {
      intent: {
        type: 'business_query',
        extracted_slots: {
          in_scope: true,
          need_clarification: true,
          clarification_question: '你希望看哪个时间范围？',
          clarification_options: ['最近7天', '最近30天', '今天（Asia/Shanghai）'],
          required_slots: ['time_window', 'metric_agg'],
          scope: 'yield',
          metric: 'apy',
          entity: /vault|金库/i.test(rawQuery) ? 'vault' : null,
          matched_capability_ids: ['capability.data_fact_query'],
          matched_capability_id: 'capability.data_fact_query',
        },
        confidence: 0.78,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (isOpsSummaryQuery(rawQuery)) {
    return {
      intent: {
        type: 'business_query',
        extracted_slots: {
          in_scope: true,
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          scope: 'execution',
          question_shape: 'summary',
          matched_capability_ids: ['capability.data_fact_query'],
          matched_capability_id: 'capability.data_fact_query',
        },
        confidence: 0.78,
      },
      raw_query: rawQuery,
      tokens_used: 0,
      prompt_meta: promptMeta,
    }
  }

  if (hasBusinessIntent && !hasAudit && !hasMemory) {
    const absoluteDateRange = extractAbsoluteDateRange(rawQuery)
    const calendarPeriod = extractCalendarPeriod(rawQuery)
    const aggregation = inferAggregation(rawQuery) || String(activeContext.aggregation || '').trim().toLowerCase() || null
    const inheritedMetric = String(activeContext.metric || '').trim().toLowerCase()
    const metric = inferBusinessMetric(rawQuery) || (
      /(base|sol|arb|eth|op).*(呢)?$/i.test(rawQuery)
        ? inheritedMetric || (String(activeContext.scope || '').trim().toLowerCase() === 'vault' ? 'vault_list' : '')
        : null
    )
    const normalizedChain = normalizedChainAlias || String(activeContext.chain || '').trim().toLowerCase() || undefined
    const normalizedProtocol = normalizedProtocolAlias || String(activeContext.protocol || '').trim().toLowerCase() || undefined
    const inheritedDay =
      /(当天|那天)/.test(rawQuery)
        ? String(activeContext.exact_day || activeContext.date_from || '').trim() || undefined
        : undefined
    const scope = (() => {
      if (metric === 'tvl' && !/protocol|market/.test(normalized)) return 'vault'
      if (metric === 'vault_list') return 'vault'
      if (metric === 'rebalance_action') return 'rebalance'
      if (isVaultChainFollowUp) return 'vault'
      if (/(base|sol|arb|eth|op).*(呢)?$/i.test(rawQuery) && inheritedMetric === 'vault_list') return 'vault'
      return businessScope || String(activeContext.scope || '').trim().toLowerCase() || 'unknown'
    })()
    const resolvedMetric = isVaultChainFollowUp ? 'vault_list' : metric
    const questionShape =
      resolvedMetric === 'vault_list'
        ? 'summary'
        : /最高.+最低|lowest.+highest|highest.+lowest/.test(rawQuery)
          ? 'top_bottom_in_day'
          : absoluteDateRange && aggregation === 'max'
            ? 'top_1_in_period'
            : undefined
    return {
      intent: {
        type: legacyIntentType,
        extracted_slots: {
          scope,
          ...(resolvedMetric ? { metric: resolvedMetric } : {}),
          ...(aggregation ? { aggregation, metric_agg: aggregation } : {}),
          ...(/vault|金库/i.test(rawQuery) ? { entity: metric === 'vault_list' ? 'chain' : 'vault' } : {}),
          ...((resolvedMetric === 'vault_list' || inheritedMetric === 'vault_list') ? { entity: 'chain' } : {}),
          ...(questionShape ? { question_shape: questionShape } : {}),
          ...(normalizedChain ? { chain: normalizedChain } : {}),
          ...(normalizedProtocol ? { protocol: normalizedProtocol } : {}),
          ...(inheritedDay ? { exact_day: inheritedDay, date_from: inheritedDay, date_to: inheritedDay } : {}),
          ...(absoluteDateRange && aggregation === 'max'
            ? { question_shape: 'top_1_in_period', return_fields: ['vault_name', 'apy_value', 'tvl_total'] }
            : {}),
          ...((absoluteDateRange || calendarPeriod) as Record<string, unknown>),
          ...(resolvedMetric === 'tvl' ? { return_fields: ['avg_daily_tvl'] } : {}),
          ...(resolvedMetric === 'rebalance_action' ? { return_fields: ['rebalance_action'] } : {}),
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
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
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
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
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
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
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
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
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
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

  if (hasProductDocIntent || ((normalized.includes('原理') || normalized.includes('产品') || normalized.includes('qna')) && looksLikeMaxshotDomainQuestion(rawQuery))) {
    return {
      intent: {
        type: legacyIntentType === 'out_of_scope' ? 'out_of_scope' : legacyIntentType,
        extracted_slots: {
          in_scope: legacyIntentType !== 'out_of_scope',
          reason: legacyIntentType === 'out_of_scope' ? 'non_business_query' : undefined,
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          ...(rawQuery.includes('做什么业务') || rawQuery.includes('capability')
            ? { question_shape: 'capability_overview', return_fields: ['capability_overview'] }
            : {}),
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
          need_clarification: false,
          clarification_question: '',
          clarification_options: [],
          matched_capability_ids: [],
        },
        confidence: 0.5,
    },
    raw_query: rawQuery,
    tokens_used: 0,
    prompt_meta: promptMeta,
  }
}

function shouldUseHeuristicFastPath(rawQuery: string): boolean {
  const inferredScope = inferBusinessScope(rawQuery)
  const inferredMetric = inferBusinessMetric(rawQuery)

  if (isSmallTalkQuery(rawQuery)) return true
  if (isGenericProductTheoryQuery(rawQuery)) return true
  if (isOpsSummaryQuery(rawQuery)) return true
  if (isCurrentApyClarificationQuery(rawQuery)) return true
  if (isOverallPerformanceBusinessQuery(rawQuery)) return true
  if (isBrandStoryQuery(rawQuery)) return true
  if (isProductDocLikeQuery(rawQuery) && !isExplicitMetricAsk(rawQuery)) return true
  if (inferredScope === 'execution' && inferredMetric === 'execution_detail') return true
  if (inferredScope === 'rebalance') return true
  if (inferredScope === 'vault' && inferredMetric === 'vault_list') return true
  return false
}


function currentDateTimeForPrompt() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replace(' ', 'T') + ' Asia/Shanghai'
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
  const currentDateTime = currentDateTimeForPrompt()
  const userPrompt = params.userPromptTemplate
    .replace('{{clean_query}}', params.rawQuery)
    .replace('{{session_context}}', JSON.stringify(params.sessionContext || null))
    .replace('{{context_payload}}', JSON.stringify(params.sessionContext || null))
    .replace('{{memory_layer_context}}', JSON.stringify(null))
    .replace('{{current_datetime}}', currentDateTime)

  const schemaHint = `You must respond with valid JSON only. Prefer capability matching over abstract intent classes. Current datetime: ${currentDateTime}.
Schema:
{"matched":true|false,"capability_id":"capability.id","matched_capability_ids":["capability.id"],"matched_capability_id":"capability.id","intent_type":"business_query|ops_summary|audit_query|memory_query|content_brief|marketing_gen|metric_query|task_management|general_qna|out_of_scope","in_scope":true|false,"reason":"small_talk|out_of_scope|unknown","out_of_scope_reply":"string","need_clarification":true|false,"clarification_question":"string","clarification_options":["string"],"slots":{"scope":"yield|vault|allocation|execution|rebalance","metric":"apy|tvl|vault_list|rebalance_action|execution_detail","entity":"vault|chain|protocol|market|execution|rebalance_action","aggregation":"max|min|avg|latest|top_n|bottom_n|compare","date_from":"YYYY-MM-DD","date_to":"YYYY-MM-DD","timezone":"Asia/Shanghai","calendar_year":"number","calendar_month":"1..12","week_of_month":"1..5","exact_day":"YYYY-MM-DD","compare_targets":["string"],"question_shape":"summary|trend_window|current_snapshot|compare_entities|top_1_in_period|top_bottom_in_day|capability_overview","return_fields":["string"]},"confidence":0.0-1.0}
Rules:
- matched_capability_ids must contain at least 0 and at most ${MAX_MATCHED_CAPABILITIES} active capability ids
- if more than ${MAX_MATCHED_CAPABILITIES} capabilities seem relevant, return need_clarification=true instead of listing more
- if year is omitted in the query, infer it from current_datetime
- scope must never be tvl or apy; those belong in metric
- if the query already contains month, week-of-month, exact day, date range, or relative window, do not ask for time clarification
- preserve explicit metric identity: TVL must stay TVL; APY must stay APY; vault list must stay vault list`

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

async function callIntentCritic(params: {
  rawQuery: string
  sessionContext?: string
  draftOutput: LlmIntentOutput
}): Promise<IntentCriticOutput | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const promptResolved = await getPromptBySlug('intent_critic')
  if (!promptResolved) return null

  const endpoint = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions'
  const currentDateTime = currentDateTimeForPrompt()
  const userPrompt = promptResolved.prompt.user_prompt_template
    .replace('{{clean_query}}', params.rawQuery)
    .replace('{{current_datetime}}', currentDateTime)
    .replace('{{session_context}}', JSON.stringify(params.sessionContext || null))
    .replace('{{draft_output}}', JSON.stringify(params.draftOutput))

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
          { role: 'system', content: promptResolved.prompt.system_prompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return safeJsonParse(json.choices?.[0]?.message?.content || '') as IntentCriticOutput | null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}


async function callIntentNormalizer(params: {
  rawQuery: string
  sessionContext?: string
  draftOutput: LlmIntentOutput
}): Promise<IntentNormalizerOutput | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return null
  const promptResolved = await getPromptBySlug('intent_normalizer')
  if (!promptResolved) return null

  const endpoint = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions'
  const currentDateTime = currentDateTimeForPrompt()
  const userPrompt = promptResolved.prompt.user_prompt_template
    .replace('{{clean_query}}', params.rawQuery)
    .replace('{{current_datetime}}', currentDateTime)
    .replace('{{session_context}}', JSON.stringify(params.sessionContext || null))
    .replace('{{draft_output}}', JSON.stringify(params.draftOutput))

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
          { role: 'system', content: promptResolved.prompt.system_prompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return safeJsonParse(json.choices?.[0]?.message?.content || '') as IntentNormalizerOutput | null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function callDeepSeek(rawQuery: string, sessionContext?: string): Promise<IntentAnalysisResult> {
  if (shouldUseHeuristicFastPath(rawQuery)) {
    const promptResolved = await getPromptBySlug('intent_analyzer')
    return buildFallbackResult(rawQuery, buildPromptMeta(promptResolved), sessionContext)
  }

  const promptResolved =
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

  // Step3 hot paths should go through prompt -> critic -> normalizer whenever LLM is available.
  // Fallback remains the degraded path only when API/prompt resolution is unavailable.

  const llm = await callDeepSeekApi({
    rawQuery,
    sessionContext,
    systemPrompt,
    userPromptTemplate,
  })

  if (!llm) {
    return buildFallbackResult(rawQuery, promptMeta, sessionContext)
  }
  const critic = await callIntentCritic({
    rawQuery,
    sessionContext,
    draftOutput: llm.output,
  })
  const criticAdjustedOutput =
    critic?.pass === false && critic.repaired_output && typeof critic.repaired_output === 'object'
      ? critic.repaired_output
      : llm.output
  const normalized = await callIntentNormalizer({
    rawQuery,
    sessionContext,
    draftOutput: criticAdjustedOutput,
  })
  const llmOutput: LlmIntentOutput = normalized
    ? {
        intent_type: normalized.intent_type,
        matched_capability_ids: normalized.matched_capability_ids,
        matched_capability_id: normalized.matched_capability_id || undefined,
        in_scope: normalized.in_scope,
        need_clarification: normalized.need_clarification,
        clarification_question: normalized.clarification_question,
        clarification_options: normalized.clarification_options,
        slots: normalized.slots,
        confidence: normalized.confidence,
      }
    : criticAdjustedOutput

  let matchedCapabilityIds = resolveCapabilityIds(
    [
      llmOutput.capability_id,
      ...(Array.isArray(llmOutput.matched_capability_ids) ? llmOutput.matched_capability_ids : []),
      llmOutput.matched_capability_id,
    ],
    MAX_MATCHED_CAPABILITIES
  )
  let intentType = normalizeLlmIntentType(String(llmOutput.intent_type || inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds) || 'out_of_scope'))
  let inScope = Boolean(llmOutput.in_scope ?? llmOutput.matched ?? matchedCapabilityIds.length > 0)
  let needClarification = Boolean(llmOutput.need_clarification)
  let slots = {
    ...(llmOutput.slots || {}),
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

  if (isGenericProductTheoryQuery(rawQuery)) {
    matchedCapabilityIds = []
    intentType = 'out_of_scope'
    inScope = false
    needClarification = false
  }

  if (isOpsSummaryQuery(rawQuery)) {
    matchedCapabilityIds = ['capability.data_fact_query']
    intentType = 'business_query'
    inScope = true
    needClarification = false
    slots = {
      scope: 'execution',
      question_shape: 'summary',
      ...slots,
    }
  }

  if (isCurrentApyClarificationQuery(rawQuery)) {
    matchedCapabilityIds = ['capability.data_fact_query']
    intentType = 'business_query'
    inScope = true
    needClarification = true
    slots = {
      scope: 'yield',
      metric: 'apy',
      entity: /vault|金库/i.test(rawQuery) ? 'vault' : slots.entity,
      required_slots: ['time_window', 'metric_agg'],
      clarification_question: '你希望看哪个时间范围？',
      clarification_options: ['最近7天', '最近30天', '今天（Asia/Shanghai）'],
      ...slots,
    }
    delete (slots as Record<string, unknown>).aggregation
    delete (slots as Record<string, unknown>).metric_agg
    delete (slots as Record<string, unknown>).question_shape
    delete (slots as Record<string, unknown>).return_fields
  }

  if (llmOutput.matched === false) {
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

  if (isOverallPerformanceBusinessQuery(rawQuery)) {
    intentType = 'business_query'
    inScope = true
    needClarification = false
    matchedCapabilityIds = ['capability.data_fact_query']
    slots = {
      ...slots,
      scope: 'yield',
      metric: 'apy',
      aggregation: 'avg',
      metric_agg: 'avg',
      time_window_days: 7,
      question_shape: 'window_summary',
    }
    delete (slots as Record<string, unknown>).return_fields
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
    clarification_question: needClarification ? llmOutput.clarification_question || '' : '',
    clarification_options: needClarification && Array.isArray(llmOutput.clarification_options)
      ? llmOutput.clarification_options.slice(0, 3)
      : [],
  }
  const confidence = Number(llmOutput.confidence ?? 0.7)

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
