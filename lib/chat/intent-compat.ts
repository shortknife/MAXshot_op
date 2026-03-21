import { getCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { extractMatchedCapabilityIds } from '@/lib/chat/chat-intent-lane'
import { inferLegacyIntentTypeFromCapabilityIds } from '@/lib/router/capability-catalog'

function inferBusinessScopeFromQuery(rawQuery: string, currentScope: string): string {
  if (/(execution|执行|交易|订单)/i.test(rawQuery)) return 'execution'
  if (/(rebalance|调仓|再平衡)/i.test(rawQuery)) return 'rebalance'
  if (/(allocation|分配|仓位)/i.test(rawQuery)) return 'allocation'
  if (/(apy|收益|回报率|performance|表现)/i.test(rawQuery)) return 'yield'
  const existing = String(currentScope || '').trim().toLowerCase()
  if (existing && existing !== 'vault') return existing
  if (/(vault|金库)/i.test(rawQuery)) return 'vault'
  return 'yield'
}

function isProductDefinitionQuestion(rawQuery: string): boolean {
  return /(什么是|做什么用|描述|介绍|说明|如何工作|怎么工作|什么意思|产品定义)/i.test(rawQuery)
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

  const setSlots = (patch: Record<string, unknown>) => {
    extractedSlots = { ...extractedSlots, ...patch }
  }
  const updateIntent = (nextIntentType: string, patch?: Record<string, unknown>) => {
    intentType = nextIntentType
    canonical = getCanonicalIntentType(intentType)
    if (patch) setSlots(patch)
  }

  const hasFollowUpHint =
    previousTurns > 0 && /^(最近\\d+天|最近7天|最近30天|今天|只看|比较|对比|看\\s+)/.test(intentQuery.trim())
  if (hasFollowUpHint && !String(extractedSlots.scope || '').trim()) {
    updateIntent('business_query', {
      scope: 'yield',
      in_scope: true,
    })
  }

  const apyLikeQuery = /(apy|收益|回报率)/i.test(intentQuery)
  if (apyLikeQuery && intentType !== 'business_query') {
    updateIntent('business_query', {
      scope: 'yield',
      in_scope: true,
      need_clarification: false,
    })
  }

  const isQuestion = /(\?|？|什么|为何|为什么|怎么|如何|多少|哪|吗)/.test(intentQuery)

  if (matchedCapabilityIds.length > 0) {
    const capabilityIntentType = inferLegacyIntentTypeFromCapabilityIds(matchedCapabilityIds)
    const primaryCapabilityId = matchedCapabilityIds[0]

    if (
      matchedCapabilityIds.includes('capability.product_doc_qna') &&
      isProductDefinitionQuestion(intentQuery) &&
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
        scope: inferBusinessScopeFromQuery(intentQuery, String(extractedSlots.scope || '')),
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
      const looksLikeProductDoc = /(maxshot|vault|apy|execution|金库|收益|业务|protocol|chain|tvl|rebalance|调仓|风险|策略)/i.test(
        intentQuery
      )
      if (!looksLikeProductDoc && !looksLikeContentBrief(intentQuery)) {
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
      updateIntent('documentation', {
        in_scope: true,
        matched_capability_ids: matchedCapabilityIds,
        matched_capability_id: primaryCapabilityId,
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
