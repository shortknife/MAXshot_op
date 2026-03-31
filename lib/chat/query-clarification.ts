type ClarificationState = {
  baseQuery: string
  turns: number
  updatedAt: number
}

export type ClarificationStateSnapshot = {
  exists: boolean
  turns: number
  original_query: string | null
  scope: string | null
  missing_slots: string[]
}

type ClarificationPrompt = {
  reason: 'missing_required_clarification'
  question: string
  options: string[]
}

const stateStore = new Map<string, ClarificationState>()
const DEFAULT_MAX_TURNS = 3
const STATE_TTL_MS = 30 * 60 * 1000

function pruneClarificationState() {
  const now = Date.now()
  for (const [key, value] of stateStore.entries()) {
    if (now - value.updatedAt > STATE_TTL_MS) stateStore.delete(key)
  }
}

function hasYieldTrendSignal(text: string): boolean {
  return (
    /apy|收益|yield|回报/.test(text) &&
    /走势|趋势|trend|每天|每日|daily|最高|最低|哪天|最近|7天|波动/.test(text)
  )
}

export function hasYieldGranularity(text: string): boolean {
  return /日均|每天|每日|每小时|小时|中午|12点|实时|当前|最新|平均|avg|daily|hourly/.test(text)
}

export function hasTimeWindow(text: string): boolean {
  return (
    /(最近|last|过去|上周|本周|今天|昨日|7天|30天|本月|近|week|day|month)/.test(text) ||
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:到|至|-|~)\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.test(text) ||
    /(\d{1,2})月(\d{1,2})日?\s*(?:到|至|-|~)\s*(\d{1,2})月(\d{1,2})日?/.test(text) ||
    /(\d{1,2})[/-](\d{1,2})\s*(?:到|至|-|~)\s*(\d{1,2})[/-](\d{1,2})/.test(text)
  )
}

function buildYieldClarificationPrompt(): ClarificationPrompt {
  return {
    reason: 'missing_required_clarification',
    question: '你希望看哪种 APY 口径？请先选一个。',
    options: ['按天均值（最近7天）', '每天中午12点快照（最近7天）', '当前实时 APY（最新快照）'],
  }
}

function buildYieldTimeWindowPrompt(): ClarificationPrompt {
  return {
    reason: 'missing_required_clarification',
    question: '你希望看哪个时间范围？',
    options: ['最近7天', '最近30天', '今天（Asia/Shanghai）'],
  }
}

function looksLikeClarificationAnswer(text: string): boolean {
  const value = String(text || '').trim().toLowerCase()
  if (!value) return false
  if (hasTimeWindow(value) || hasYieldGranularity(value)) return true
  if (/(最高|最低|平均|均值|实时|当前|最新|max|min|avg|average|realtime|real-time)/.test(value)) return true
  if (/^(最近7天|最近30天|今天(?:（asia\/shanghai）)?|按天均值|每天中午12点快照|当前实时 apy)/i.test(value)) return true
  return value.length <= 24 && !/[?？]/.test(value)
}

function looksLikeStandaloneNewQuestion(text: string): boolean {
  const value = String(text || '').trim()
  if (!value) return false
  if (looksLikeClarificationAnswer(value)) return false
  if (/[?？]/.test(value)) return true
  return /^(你能|请问|请你|告诉我|描述|介绍|说明|什么是|如何|为什么|为啥|能否|可否|给我|请给我|查一下|看看|列出|show|list|query)/i.test(value)
}

function inferQueryScope(text: string): string | null {
  const value = String(text || '').toLowerCase()
  if (/(apy|收益|yield|回报率)/.test(value)) return 'yield'
  if (/(execution|执行|交易|订单)/.test(value)) return 'execution'
  if (/(rebalance|调仓|再平衡)/.test(value)) return 'rebalance'
  if (/(allocation|分配|仓位)/.test(value)) return 'allocation'
  if (/(vault|金库)/.test(value)) return 'vault'
  if (/(maxshot|产品|文档|定义|是什么|做什么用|如何工作)/.test(value)) return 'documentation'
  return null
}

function inferMissingSlotsFromBaseQuery(baseQuery: string): string[] {
  const text = String(baseQuery || '')
  const scope = inferQueryScope(text)
  if (scope !== 'yield') return []
  const needsTimeWindow = hasYieldTrendSignal(text) && !hasTimeWindow(text)
  const needsGranularity = hasYieldTrendSignal(text) && !hasYieldGranularity(text)
  return [needsTimeWindow ? 'time_window' : null, needsGranularity ? 'metric_agg' : null].filter(
    (v): v is string => Boolean(v)
  )
}

export function getClarificationSessionId(input: unknown): string | null {
  const id = String(input || '').trim()
  if (!id) return null
  return id.slice(0, 100)
}

export function consumeClarificationContext(sessionId: string | null, rawQuery: string): { effectiveQuery: string; previousTurns: number } {
  pruneClarificationState()
  if (!sessionId) return { effectiveQuery: rawQuery, previousTurns: 0 }
  const pending = stateStore.get(sessionId)
  if (!pending) return { effectiveQuery: rawQuery, previousTurns: 0 }
  const pendingScope = inferQueryScope(pending.baseQuery)
  const newScope = inferQueryScope(rawQuery)
  if (looksLikeStandaloneNewQuestion(rawQuery) || (pendingScope && newScope && pendingScope !== newScope)) {
    stateStore.delete(sessionId)
    return { effectiveQuery: rawQuery, previousTurns: 0 }
  }
  const effectiveQuery = `${pending.baseQuery}；补充条件：${rawQuery}`
  return { effectiveQuery, previousTurns: pending.turns }
}

export function clearClarificationState(sessionId: string | null) {
  if (!sessionId) return
  stateStore.delete(sessionId)
}

export function getClarificationStateSnapshot(sessionId: string | null): ClarificationStateSnapshot {
  pruneClarificationState()
  if (!sessionId) {
    return {
      exists: false,
      turns: 0,
      original_query: null,
      scope: null,
      missing_slots: [],
    }
  }
  const pending = stateStore.get(sessionId)
  if (!pending) {
    return {
      exists: false,
      turns: 0,
      original_query: null,
      scope: null,
      missing_slots: [],
    }
  }
  return {
    exists: true,
    turns: pending.turns,
    original_query: pending.baseQuery,
    scope: inferQueryScope(pending.baseQuery),
    missing_slots: inferMissingSlotsFromBaseQuery(pending.baseQuery),
  }
}

export function registerClarificationTurn(params: { sessionId: string | null; rawQuery: string; previousTurns: number }) {
  pruneClarificationState()
  if (!params.sessionId) return
  const turns = params.previousTurns + 1
  stateStore.set(params.sessionId, {
    baseQuery: params.rawQuery,
    turns,
    updatedAt: Date.now(),
  })
}

export function checkClarificationNeeded(params: {
  sessionId: string | null
  rawQuery: string
  scope: string
  previousTurns: number
  extractedSlots?: Record<string, unknown>
  maxTurns?: number
}): { needed: false } | { needed: true; prompt: ClarificationPrompt; exhausted: boolean } {
  pruneClarificationState()
  const text = params.rawQuery.toLowerCase()
  if (params.scope !== 'yield') return { needed: false }
  const dateFrom = String(params.extractedSlots?.date_from || '').trim()
  const dateTo = String(params.extractedSlots?.date_to || '').trim()
  const aggregation = String(params.extractedSlots?.aggregation || params.extractedSlots?.metric_agg || '').trim().toLowerCase()
  const hasResolvedTime = hasTimeWindow(text) || Boolean(dateFrom) || Boolean(dateTo)
  const hasResolvedAggregation =
    hasYieldGranularity(text) ||
    /(最高|peak|\bmax\b|最低|lowest|\bmin\b|平均|均值|avg|average|实时|当前|最新|real-time|realtime)/.test(text) ||
    ['avg', 'max', 'min', 'realtime', 'latest'].includes(aggregation)
  const needsGranularity = hasYieldTrendSignal(text) && !hasResolvedAggregation
  const needsTimeWindow = hasYieldTrendSignal(text) && !hasResolvedTime
  const required = needsGranularity || needsTimeWindow
  if (!required) return { needed: false }

  const turns = params.previousTurns + 1
  const maxTurns = Number.isFinite(params.maxTurns) && Number(params.maxTurns) > 0 ? Math.floor(Number(params.maxTurns)) : DEFAULT_MAX_TURNS
  if (params.sessionId) {
    stateStore.set(params.sessionId, {
      baseQuery: params.rawQuery,
      turns,
      updatedAt: Date.now(),
    })
  }
  return {
    needed: true,
    prompt: needsTimeWindow ? buildYieldTimeWindowPrompt() : buildYieldClarificationPrompt(),
    exhausted: turns >= maxTurns,
  }
}
