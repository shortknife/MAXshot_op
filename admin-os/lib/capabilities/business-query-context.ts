export type BusinessFilters = {
  chain?: string
  protocol?: string
  includeTestnets?: boolean
  time_window_days?: number
  date_from?: string
  date_to?: string
}

type SlotLike = Record<string, unknown> | undefined

export type SemanticIntentDefaults = {
  aggregation?: string
  plan_id?: string | null
  fallback_provider?: string | null
  required_slots?: string[]
  optional_slots?: string[]
  clarification_order?: string[]
  semantics?: Record<string, unknown>
}

export type SourcePolicyDefaults = {
  priority: string[]
  semantics: Record<string, unknown>
  timezone?: string
}

export type FollowUpPolicyDefaults = {
  next_actions_are_examples?: boolean
  ui_mode?: string
  max_clarification_turns?: number
  timezone?: string
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword) return false
  if (/^[a-z0-9_]+$/i.test(keyword)) {
    const re = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(keyword)}([^a-z0-9_]|$)`, 'i')
    return re.test(text)
  }
  return text.includes(keyword)
}

function normalizeChainAlias(value: string): string {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  if (text === 'arb') return 'arbitrum'
  if (text === 'eth') return 'ethereum'
  if (text === 'op') return 'optimism'
  if (text === 'sol') return 'solana'
  return text
}

function readStringSlot(slots: SlotLike, key: string): string | undefined {
  const value = String(slots?.[key] || '').trim()
  return value || undefined
}

function readNumberSlot(slots: SlotLike, key: string): number | undefined {
  const value = Number(slots?.[key])
  if (!Number.isFinite(value) || value <= 0) return undefined
  return Math.floor(value)
}

function deriveDateRangeFromCalendarSlots(slots: SlotLike): { date_from?: string; date_to?: string } {
  const exactDay = readStringSlot(slots, 'exact_day')
  if (exactDay) {
    return { date_from: exactDay, date_to: exactDay }
  }

  const year = readNumberSlot(slots, 'calendar_year')
  const month = readNumberSlot(slots, 'calendar_month')
  if (!year || !month) return {}

  const weekOfMonth = readNumberSlot(slots, 'week_of_month')
  if (weekOfMonth) {
    const startDay = (weekOfMonth - 1) * 7 + 1
    const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate())
    return {
      date_from: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      date_to: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    }
  }

  const lastDay = new Date(year, month, 0).getDate()
  return {
    date_from: `${year}-${String(month).padStart(2, '0')}-01`,
    date_to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function parseBusinessFilters(rawQuery: string, slots?: SlotLike): BusinessFilters {
  const text = rawQuery.toLowerCase()
  const chains = [
    ['ethereum', 'ethereum'],
    ['以太坊', 'ethereum'],
    ['arbitrum', 'arbitrum'],
    ['optimism', 'optimism'],
    ['base', 'base'],
    ['plasma', 'plasma'],
    ['solana', 'solana'],
  ] as const
  const protocols = [
    ['aave', 'aave'],
    ['morpho', 'morpho'],
    ['euler', 'euler'],
    ['unitus', 'unitus'],
  ] as const
  const includeTestnets =
    text.includes('sepolia') ||
    text.includes('testnet') ||
    text.includes('devnet') ||
    text.includes('staging') ||
    text.includes('sandbox')

  const explicitDays = text.match(/(?:最近|过去|last)\s*(\d+)\s*(?:天|day|days)/)
  let timeWindowDays: number | undefined
  let dateFrom: string | undefined
  let dateTo: string | undefined
  let match = rawQuery.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*(?:到|至|-|~)\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) {
    dateFrom = `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
    dateTo = `${match[4]}-${String(match[5]).padStart(2, '0')}-${String(match[6]).padStart(2, '0')}`
  } else {
    match = rawQuery.match(/(\d{1,2})月(\d{1,2})日?\s*(?:到|至|-|~)\s*(\d{1,2})月(\d{1,2})日?/)
    if (match) {
      const year = new Date().getFullYear()
      dateFrom = `${year}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`
      dateTo = `${year}-${String(match[3]).padStart(2, '0')}-${String(match[4]).padStart(2, '0')}`
    } else {
      match = rawQuery.match(/(\d{1,2})[/-](\d{1,2})\s*(?:到|至|-|~)\s*(\d{1,2})[/-](\d{1,2})/)
      if (match) {
        const year = new Date().getFullYear()
        dateFrom = `${year}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`
        dateTo = `${year}-${String(match[3]).padStart(2, '0')}-${String(match[4]).padStart(2, '0')}`
      }
    }
  }
  if (explicitDays?.[1]) {
    const n = Number(explicitDays[1])
    if (Number.isFinite(n) && n > 0) timeWindowDays = Math.min(Math.floor(n), 90)
  } else if (/(最近一周|过去一周|last week|7天)/.test(text)) {
    timeWindowDays = 7
  } else if (/(最近30天|过去30天|last month|30天)/.test(text)) {
    timeWindowDays = 30
  } else if (/(今天|today)/.test(text)) {
    timeWindowDays = 1
  }

  const slotRange = deriveDateRangeFromCalendarSlots(slots)
  const slotDateFrom = readStringSlot(slots, 'date_from')
  const slotDateTo = readStringSlot(slots, 'date_to')
  const slotTimeWindowDays = readNumberSlot(slots, 'time_window_days')
  const slotChain = normalizeChainAlias(readStringSlot(slots, 'chain') || '')
  const slotProtocol = String(readStringSlot(slots, 'protocol') || '').toLowerCase()
  const chain = normalizeChainAlias(chains.find(([k]) => containsKeyword(text, k))?.[1] || '')
  const protocol = String(protocols.find(([k]) => containsKeyword(text, k))?.[1] || '').toLowerCase()
  return {
    chain: slotChain || chain || undefined,
    protocol: slotProtocol || protocol || undefined,
    includeTestnets,
    time_window_days: slotTimeWindowDays || timeWindowDays,
    date_from: slotDateFrom || dateFrom || slotRange.date_from,
    date_to: slotDateTo || dateTo || slotRange.date_to,
  }
}

export function parseTrendDays(rawQuery: string): number {
  const text = rawQuery.toLowerCase()
  const explicit = text.match(/(\d+)\s*(天|day|days)/)
  if (explicit?.[1]) {
    const n = Number(explicit[1])
    if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), 90)
  }
  if (text.includes('最近一周') || text.includes('last week') || text.includes('7天')) return 7
  if (text.includes('最近30天') || text.includes('30天') || text.includes('last month')) return 30
  return 7
}

export function parseTopN(rawQuery: string, fallback = 20): number {
  const text = rawQuery.toLowerCase()
  const m = text.match(/(?:top|前)\s*(\d+)/)
  if (m?.[1]) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), 50)
  }
  return fallback
}

export function extractSemanticDefaults(memoryRefs: unknown): SemanticIntentDefaults {
  if (!Array.isArray(memoryRefs)) return {}
  for (const ref of memoryRefs) {
    if (!ref || typeof ref !== 'object') continue
    const ctx = (ref as { context?: Record<string, unknown> }).context
    if (!ctx || typeof ctx !== 'object') continue
    const intentId = String(ctx.intent_id || '')
    if (!intentId.startsWith('yield_')) continue
    const defaults = (ctx.defaults as Record<string, unknown> | undefined) || {}
    return {
      aggregation: typeof defaults.aggregation === 'string' ? defaults.aggregation : undefined,
      plan_id: typeof ctx.plan_id === 'string' ? ctx.plan_id : null,
      fallback_provider: typeof ctx.fallback_provider === 'string' ? ctx.fallback_provider : null,
      required_slots: Array.isArray(ctx.required_slots) ? ctx.required_slots.map((v) => String(v)) : [],
      optional_slots: Array.isArray(ctx.optional_slots) ? ctx.optional_slots.map((v) => String(v)) : [],
      clarification_order: Array.isArray(ctx.clarification_order) ? ctx.clarification_order.map((v) => String(v)) : [],
      semantics: typeof ctx.semantics === 'object' && ctx.semantics ? (ctx.semantics as Record<string, unknown>) : {},
    }
  }
  return {}
}

export function extractSourcePolicyDefaults(memoryRefs: unknown): SourcePolicyDefaults {
  if (!Array.isArray(memoryRefs)) return { priority: [], semantics: {} }
  for (const ref of memoryRefs) {
    if (!ref || typeof ref !== 'object') continue
    const ctx = (ref as { context?: Record<string, unknown> }).context
    if (!ctx || typeof ctx !== 'object') continue
    const sourcePriority = Array.isArray(ctx.source_priority) ? ctx.source_priority.map((v) => String(v)) : null
    if (!sourcePriority) continue
    return {
      priority: sourcePriority,
      semantics: typeof ctx.source_semantics === 'object' && ctx.source_semantics ? (ctx.source_semantics as Record<string, unknown>) : {},
      timezone: typeof ctx.timezone === 'string' ? ctx.timezone : undefined,
    }
  }
  return { priority: [], semantics: {} }
}

export function extractFollowUpPolicyDefaults(memoryRefs: unknown): FollowUpPolicyDefaults {
  if (!Array.isArray(memoryRefs)) return {}
  for (const ref of memoryRefs) {
    if (!ref || typeof ref !== 'object') continue
    const ctx = (ref as { context?: Record<string, unknown> }).context
    if (!ctx || typeof ctx !== 'object') continue
    const followUpPolicy = ctx.follow_up_policy
    if (!followUpPolicy || typeof followUpPolicy !== 'object') continue
    const policy = followUpPolicy as Record<string, unknown>
    return {
      next_actions_are_examples:
        typeof policy.next_actions_are_examples === 'boolean' ? policy.next_actions_are_examples : undefined,
      ui_mode: typeof policy.ui_mode === 'string' ? policy.ui_mode : undefined,
      max_clarification_turns:
        typeof policy.max_clarification_turns === 'number' ? policy.max_clarification_turns : undefined,
      timezone: typeof ctx.timezone === 'string' ? ctx.timezone : undefined,
    }
  }
  return {}
}
