import { getCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { extractMatchedCapabilityIds } from '@/lib/chat/chat-intent-lane'
import { inferLegacyIntentTypeFromCapabilityIds } from '@/lib/router/capability-catalog'

const OFFICIAL_STEP3_INTENT_TYPES = new Set([
  'business_query',
  'general_qna',
  'out_of_scope',
  'content_brief',
  'marketing_gen',
])

function inferBusinessScopeFromQuery(rawQuery: string, currentScope: string): string {
  if (/(execution|执行|交易|订单)/i.test(rawQuery)) return 'execution'
  if (/(rebalance|调仓|再平衡)/i.test(rawQuery)) return 'rebalance'
  if (/(allocation|分配|仓位)/i.test(rawQuery)) return 'allocation'
  if (/(apy|收益|回报率|performance|表现)/i.test(rawQuery)) return 'yield'
  if (/(tvl)/i.test(rawQuery)) return 'vault'
  const existing = String(currentScope || '').trim().toLowerCase()
  if (existing) return existing
  if (/(vault|金库)/i.test(rawQuery)) return 'vault'
  return 'yield'
}

function normalizeChainAliasFromQuery(rawQuery: string): string | null {
  const text = String(rawQuery || '').trim().toLowerCase()
  if (/^arb(?:itrum)?\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'arbitrum'
  if (/^eth(?:ereum)?\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'ethereum'
  if (/^op(?:timism)?\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'optimism'
  if (/^base\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'base'
  if (/^sol(?:ana)?\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'solana'
  if (/^plasma\s*(链)?\s*(呢)?\s*[？?]?$/i.test(text)) return 'plasma'
  return null
}

function isProductDefinitionQuestion(rawQuery: string): boolean {
  return /(什么是|做什么用|描述|介绍|说明|如何工作|怎么工作|什么意思|产品定义)/i.test(rawQuery)
}

function isGenericProductTheoryQuestion(rawQuery: string): boolean {
  const text = String(rawQuery || '').trim().toLowerCase()
  return /(这个产品|该产品|这款产品)/.test(text) && /(原理|核心原理|底层原理|理论|机制)/.test(text) && !/maxshot/.test(text)
}

function looksLikeFaqSupportQuestion(rawQuery: string): boolean {
  return /(faq|support|help|password|reset|invoice|billing|pricing|plan include|knowledge base|upload document|客户|帮助中心|发票|订阅|套餐|密码|知识库|人工审核)/i.test(
    rawQuery
  )
}

function isExplicitMetricAsk(rawQuery: string): boolean {
  return /(多少|最高|最低|均值|平均|走势|趋势|列表|详情|统计|排名|比较|对比|最近|top|\bmax\b|\bmin\b|apy|收益|tvl|execution|执行)/i.test(
    rawQuery
  )
}

type ParsedIntentLike = {
  intent: {
    type: string
    extracted_slots?: Record<string, unknown>
  }
}

type NormalizeChatIntentParams = {
  parsed: ParsedIntentLike
  intentQuery: string
  previousTurns: number
  looksLikeContentBrief: (rawQuery: string) => boolean
}

export function normalizeChatIntent(params: NormalizeChatIntentParams): {
  intentType: string
  extractedSlots: Record<string, unknown>
} {
  const { parsed, intentQuery, previousTurns, looksLikeContentBrief } = params
  let intentType = parsed.intent.type
  let extractedSlots = { ...(parsed.intent.extracted_slots || {}) }
  let canonical = getCanonicalIntentType(intentType)
  const matchedCapabilityIds = extractMatchedCapabilityIds(extractedSlots)
  const hasOfficialStep3Type = OFFICIAL_STEP3_INTENT_TYPES.has(intentType)
  const hasCapabilityAuthority = matchedCapabilityIds.length > 0
  const hasClarificationDecision =
    typeof extractedSlots.need_clarification === 'boolean' ||
    typeof extractedSlots.clarification_question === 'string'

  const setSlots = (patch: Record<string, unknown>) => {
    extractedSlots = { ...extractedSlots, ...patch }
  }
  const updateIntent = (nextIntentType: string, patch?: Record<string, unknown>) => {
    intentType = nextIntentType
    canonical = getCanonicalIntentType(intentType)
    if (patch) setSlots(patch)
  }

  const trimmedQuery = intentQuery.trim()
  const hasFollowUpHint =
    previousTurns > 0 &&
    /^(最近\d+天|最近7天|最近30天|今天|只看|比较|对比|看\s+|base\s*呢(?:\s*[？?])?|sol\s*呢(?:\s*[？?])?|arb\s*呢(?:\s*[？?])?|ethereum\s*呢(?:\s*[？?])?|arbitrum\s*呢(?:\s*[？?])?)/i.test(trimmedQuery)
  const isVaultListFollowUp =
    previousTurns > 0 &&
    /^(base|sol|arb|eth|op|ethereum|arbitrum|optimism|solana|plasma)\s*(链)?\s*(呢)?\s*[？?]?$/i.test(trimmedQuery)
  const followUpChain = normalizeChainAliasFromQuery(trimmedQuery)
  const looksOverallPerformance = /(整体表现|总体表现|整体情况|performance|overall)/i.test(intentQuery)
  const looksBusinessish = /(maxshot|业务|vault|金库|apy|收益|yield|execution|执行|rebalance|调仓|tvl)/i.test(intentQuery)
  const looksFaqSupport = looksLikeFaqSupportQuestion(intentQuery) && !isExplicitMetricAsk(intentQuery)

  if (
    looksFaqSupport &&
    !matchedCapabilityIds.includes('capability.data_fact_query')
  ) {
    updateIntent('general_qna', {
      in_scope: true,
      matched_capability_ids: ['capability.faq_answering'],
      matched_capability_id: 'capability.faq_answering',
      question: String(extractedSlots.question || intentQuery || '').trim(),
    })
    return {
      intentType,
      extractedSlots,
    }
  }

  if (hasFollowUpHint && !hasCapabilityAuthority) {
    updateIntent('business_query', {
      scope: isVaultListFollowUp ? 'vault' : inferBusinessScopeFromQuery(intentQuery, String(extractedSlots.scope || 'yield')),
      in_scope: true,
      ...(isVaultListFollowUp ? { metric: 'vault_list', entity: 'chain', ...(followUpChain ? { chain: followUpChain } : {}) } : {}),
      matched_capability_ids: ['capability.data_fact_query'],
      matched_capability_id: 'capability.data_fact_query',
    })
  }

  if (looksOverallPerformance && looksBusinessish) {
    updateIntent('business_query', {
      scope: 'yield',
      in_scope: true,
      need_clarification: false,
      matched_capability_ids:
        matchedCapabilityIds.length > 0 ? matchedCapabilityIds : ['capability.data_fact_query'],
      matched_capability_id: matchedCapabilityIds[0] || 'capability.data_fact_query',
    })
  }

  if (
    hasOfficialStep3Type &&
    (hasCapabilityAuthority || intentType === 'out_of_scope' || hasClarificationDecision) &&
    !hasFollowUpHint &&
    !(looksOverallPerformance && looksBusinessish)
  ) {
    return {
      intentType,
      extractedSlots,
    }
  }
  if (hasFollowUpHint && !String(extractedSlots.scope || '').trim()) {
    updateIntent('business_query', {
      scope: isVaultListFollowUp ? 'vault' : 'yield',
      in_scope: true,
      ...(isVaultListFollowUp ? { metric: 'vault_list', entity: 'chain', ...(followUpChain ? { chain: followUpChain } : {}) } : {}),
      matched_capability_ids: ['capability.data_fact_query'],
      matched_capability_id: 'capability.data_fact_query',
    })
  }

  const apyLikeQuery = /(apy|收益|回报率)/i.test(intentQuery)
  if (apyLikeQuery && intentType !== 'business_query') {
    updateIntent('business_query', {
      scope: 'yield',
      in_scope: true,
      need_clarification: false,
      matched_capability_ids: ['capability.data_fact_query'],
      matched_capability_id: 'capability.data_fact_query',
    })
  }

  const isQuestion = /(\?|？|什么|为何|为什么|怎么|如何|多少|哪|吗)/.test(intentQuery)

  if (matchedCapabilityIds.length > 0) {
    const capabilityIntentType = inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds)
    const primaryCapabilityId = matchedCapabilityIds[0]

    if (
      matchedCapabilityIds.includes('capability.product_doc_qna') &&
      isProductDefinitionQuestion(intentQuery) &&
      !isGenericProductTheoryQuestion(intentQuery) &&
      !isExplicitMetricAsk(intentQuery)
    ) {
      updateIntent('documentation', {
        in_scope: true,
        matched_capability_ids: ['capability.product_doc_qna'],
        matched_capability_id: 'capability.product_doc_qna',
      })
      return {
        intentType,
        extractedSlots,
      }
    }

    if (matchedCapabilityIds.includes('capability.data_fact_query')) {
      updateIntent(capabilityIntentType === 'out_of_scope' ? 'business_query' : capabilityIntentType, {
        in_scope: true,
        scope: isVaultListFollowUp ? 'vault' : inferBusinessScopeFromQuery(intentQuery, String(extractedSlots.scope || '')),
        ...(isVaultListFollowUp ? { metric: 'vault_list', entity: 'chain', ...(followUpChain ? { chain: followUpChain } : {}) } : {}),
        matched_capability_ids: matchedCapabilityIds,
        matched_capability_id: primaryCapabilityId,
      })
      return {
        intentType,
        extractedSlots,
      }
    }

    if (
      matchedCapabilityIds.includes('capability.content_generator') ||
      matchedCapabilityIds.includes('capability.context_assembler')
    ) {
      if (!looksLikeContentBrief(intentQuery) && isQuestion) {
        updateIntent('out_of_scope', {
          in_scope: false,
          reason: 'non_business_query',
          matched_capability_ids: [],
          matched_capability_id: null,
        })
        return {
          intentType,
          extractedSlots,
        }
      }
      updateIntent('content_brief', {
        in_scope: true,
        matched_capability_ids: matchedCapabilityIds,
        matched_capability_id: primaryCapabilityId,
      })
      return {
        intentType,
        extractedSlots,
      }
    }

    if (matchedCapabilityIds.includes('capability.product_doc_qna')) {
      if (looksFaqSupport) {
        updateIntent('general_qna', {
          in_scope: true,
          matched_capability_ids: ['capability.faq_answering'],
          matched_capability_id: 'capability.faq_answering',
          question: String(extractedSlots.question || intentQuery || '').trim(),
        })
        return {
          intentType,
          extractedSlots,
        }
      }
      const looksLikeProductDoc = /(maxshot|vault|apy|execution|金库|收益|业务|protocol|chain|tvl|rebalance|调仓|风险|策略|能力|能做什么|做什么业务|capability)/i.test(
        intentQuery
      )
      if ((!looksLikeProductDoc && !looksLikeContentBrief(intentQuery)) || isGenericProductTheoryQuestion(intentQuery)) {
        updateIntent('out_of_scope', {
          in_scope: false,
          reason: 'non_business_query',
          matched_capability_ids: [],
          matched_capability_id: null,
        })
        return {
          intentType,
          extractedSlots,
        }
      }
      const isCapabilityOverview = String(extractedSlots.question_shape || '').trim() === 'capability_overview'
      updateIntent(isCapabilityOverview ? 'general_qna' : 'documentation', {
        in_scope: true,
        matched_capability_ids: matchedCapabilityIds,
        matched_capability_id: primaryCapabilityId,
      })
      return {
        intentType,
        extractedSlots,
      }
    }

    if (matchedCapabilityIds.includes('capability.faq_answering')) {
      updateIntent(capabilityIntentType === 'out_of_scope' ? 'general_qna' : capabilityIntentType, {
        in_scope: true,
        matched_capability_ids: matchedCapabilityIds,
        matched_capability_id: primaryCapabilityId,
        question: String(extractedSlots.question || intentQuery || '').trim(),
      })
      return {
        intentType,
        extractedSlots,
      }
    }
  }

  if (canonical === 'marketing_gen' && intentType !== 'content_brief') {
    updateIntent('content_brief')
  }

  if (intentType === 'metric_query') {
    const metric = String(extractedSlots.metric || '').toLowerCase()
    let scope = String(extractedSlots.scope || '').toLowerCase()
    if (!scope) {
      if (metric.includes('vault')) scope = 'vault'
      if (metric.includes('execution')) scope = 'execution'
      if (metric.includes('apy') || metric.includes('yield') || metric.includes('performance')) scope = 'yield'
      if (!scope) scope = 'yield'
    }
    updateIntent('business_query', {
      scope,
      in_scope: true,
    })
  }

  if (intentType === 'ops_summary') {
    const looksBusiness = /(vault|金库|收益|apy|回报|execution|执行|调仓|tvl|链|protocol|morpho|aave|arbitrum|optimism|base|ethereum)/i.test(
      intentQuery
    )
    const looksOverallPerformance = /(整体表现|整体|表现|performance|overall)/i.test(intentQuery)
    if (looksBusiness) {
      let scope = String(extractedSlots.scope || '').toLowerCase()
      if (!scope) {
        if (/(execution|执行)/i.test(intentQuery)) scope = 'execution'
        else if (/(vault|金库)/i.test(intentQuery)) scope = 'vault'
        else scope = 'yield'
      }
      updateIntent('business_query', {
        scope,
        in_scope: true,
      })
    }
    if (looksOverallPerformance) {
      updateIntent('business_query', {
        scope: 'yield',
        metric: 'apy',
        aggregation: 'avg',
        metric_agg: 'avg',
        time_window_days: 7,
        question_shape: 'window_summary',
        in_scope: true,
        need_clarification: false,
      })
    }
  }

  if (intentType === 'general_qna' && looksLikeContentBrief(intentQuery)) {
    updateIntent('content_brief')
  }

  if (
    looksLikeContentBrief(intentQuery) &&
    ['general_qna', 'out_of_scope', 'documentation'].includes(intentType)
  ) {
    updateIntent('content_brief', {
      in_scope: true,
      matched_capability_ids:
        matchedCapabilityIds.length > 0
          ? matchedCapabilityIds
          : ['capability.context_assembler', 'capability.content_generator'],
      matched_capability_id:
        matchedCapabilityIds[0] || 'capability.context_assembler',
    })
  }

  if (intentType === 'content_brief' && !looksLikeContentBrief(intentQuery) && isQuestion) {
    updateIntent('out_of_scope', { in_scope: false })
  }

  if (canonical === 'small_talk') {
    updateIntent('out_of_scope', { in_scope: false, reason: 'non_business_query' })
  }

  if (canonical === 'documentation' && !looksLikeContentBrief(intentQuery)) {
    const looksLikeProductDoc = /(maxshot|vault|apy|execution|金库|收益|业务|protocol|chain|tvl|rebalance|调仓|风险|策略)/i.test(
      intentQuery
    )
    if (looksLikeProductDoc) {
      updateIntent('documentation', { in_scope: true })
    } else {
      updateIntent('out_of_scope', { in_scope: false, reason: 'non_business_query' })
    }
  }

  return {
    intentType,
    extractedSlots,
  }
}
