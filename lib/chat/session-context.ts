type SessionBusinessContext = {
  scope: string
  query_mode: string
  chain?: string
  protocol?: string
  vault_name?: string
  time_window_days?: number
  aggregation?: string
  updated_at: number
}

const SESSION_TTL_MS = 30 * 60 * 1000
const store = new Map<string, SessionBusinessContext>()

function hasExpired(ts: number): boolean {
  return Date.now() - ts > SESSION_TTL_MS
}

function pruneExpired() {
  for (const [key, value] of store.entries()) {
    if (hasExpired(value.updated_at)) store.delete(key)
  }
}

function hasBusinessScope(text: string): boolean {
  return /(vault|金库|apy|收益|yield|execution|执行|调仓|rebalance|allocation|分配)/.test(text)
}

function hasYieldScope(text: string): boolean {
  return /(apy|收益|yield)/.test(text)
}

function hasTimeWindow(text: string): boolean {
  return /(最近|last|过去|上周|本周|今天|昨日|7天|30天|本月|近|week|day|month)/.test(text)
}

function hasAggregation(text: string): boolean {
  return /(平均|均值|avg|average|最高|\bmax\b|最低|\bmin\b|实时|当前|最新)/.test(text)
}

function looksLikeFollowUp(text: string): boolean {
  return /(那|然后|再|继续|按这个|同样|how about|what about|then|and for)/.test(text)
}

function looksLikeOptionReply(text: string): boolean {
  const value = String(text || '').trim()
  if (!value || value.length > 40) return false
  if (/[?？]/.test(value)) return false
  if (looksLikeFollowUp(value.toLowerCase())) return true
  return /^[\p{L}\p{N}\s._-]+$/u.test(value)
}

function inferBusinessScope(text: string): string | null {
  if (/(apy|收益|yield)/.test(text)) return 'yield'
  if (/(execution|执行|交易|订单)/.test(text)) return 'execution'
  if (/(rebalance|调仓|再平衡)/.test(text)) return 'rebalance'
  if (/(allocation|分配|仓位)/.test(text)) return 'allocation'
  if (/(vault|金库)/.test(text)) return 'vault'
  return null
}

export function getBusinessSessionContextSnapshot(sessionId: string | null): SessionBusinessContext | null {
  pruneExpired()
  if (!sessionId) return null
  const value = store.get(sessionId)
  if (!value) return null
  if (hasExpired(value.updated_at)) {
    store.delete(sessionId)
    return null
  }
  return { ...value }
}

function looksLikeStandaloneQuestion(text: string): boolean {
  if (!text) return false
  if (looksLikeOptionReply(text)) return false
  if (/[?？]/.test(text)) return true
  return /^(你能|请问|请你|告诉我|描述|介绍|说明|什么是|如何|为什么|为啥|能否|可否)/.test(text)
}

export function saveBusinessSessionContext(params: {
  sessionId: string | null
  scope: string
  queryMode: string
  filters?: { chain?: string; protocol?: string; vault_name?: string; time_window_days?: number }
  aggregation?: string
}) {
  if (!params.sessionId) return
  pruneExpired()
  store.set(params.sessionId, {
    scope: params.scope || 'unknown',
    query_mode: params.queryMode || 'metrics',
    chain: params.filters?.chain,
    protocol: params.filters?.protocol,
    vault_name: params.filters?.vault_name,
    time_window_days: params.filters?.time_window_days,
    aggregation: params.aggregation,
    updated_at: Date.now(),
  })
}

export function applySessionFollowUpContext(params: {
  sessionId: string | null
  rawQuery: string
}): { effectiveQuery: string; applied: boolean } {
  pruneExpired()
  const text = String(params.rawQuery || '').trim()
  if (!params.sessionId || !text) return { effectiveQuery: text, applied: false }

  const ctx = store.get(params.sessionId)
  if (!ctx) return { effectiveQuery: text, applied: false }
  if (hasExpired(ctx.updated_at)) {
    store.delete(params.sessionId)
    return { effectiveQuery: text, applied: false }
  }

  const lower = text.toLowerCase()
  const inferredScope = inferBusinessScope(lower)
  const followUpLike = looksLikeFollowUp(lower) || looksLikeOptionReply(text)
  const partialBusinessFollowUp =
    hasBusinessScope(lower) &&
    ctx.scope === 'yield' &&
    (!hasTimeWindow(lower) || !hasAggregation(lower))

  if (looksLikeStandaloneQuestion(text) && inferredScope && inferredScope !== ctx.scope) {
    return { effectiveQuery: text, applied: false }
  }
  if (looksLikeStandaloneQuestion(text) && /maxshot|产品|文档|定义|是什么|做什么用|如何工作/.test(lower)) {
    return { effectiveQuery: text, applied: false }
  }

  if (!followUpLike && !partialBusinessFollowUp) return { effectiveQuery: text, applied: false }

  const hints: string[] = []
  if (ctx.scope === 'yield') {
    if (!hasYieldScope(lower)) hints.push('APY 查询')
    if (!hasTimeWindow(lower) && ctx.time_window_days) hints.push(`最近${ctx.time_window_days}天`)
    if (!hasAggregation(lower) && ctx.aggregation === 'avg') hints.push('按平均 APY 口径')
    else if (!hasAggregation(lower) && ctx.aggregation === 'realtime') hints.push('按实时 APY 口径')
    else if (!hasAggregation(lower) && ctx.aggregation === 'max') hints.push('按最高 APY 口径')
    else if (!hasAggregation(lower) && ctx.aggregation === 'min') hints.push('按最低 APY 口径')
  }
  if (followUpLike && ctx.chain && !/arbitrum|ethereum|base|optimism|plasma|solana/i.test(lower)) hints.push(`沿用链 ${ctx.chain}`)
  if (followUpLike && ctx.protocol && !/morpho|aave|euler|unitus/i.test(lower)) hints.push(`沿用协议 ${ctx.protocol}`)
  if (followUpLike && ctx.vault_name && !/vault|金库/i.test(lower)) hints.push(`沿用 Vault ${ctx.vault_name}`)
  if (!hints.length) return { effectiveQuery: text, applied: false }

  return {
    effectiveQuery: `${text}（${hints.join('，')}）`,
    applied: true,
  }
}
