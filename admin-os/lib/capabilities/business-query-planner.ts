export function wantsYieldRealtime(rawQuery: string): boolean {
  const text = rawQuery.toLowerCase()
  if (/(平均|均值|avg|average|按天均值|日均|daily)/.test(text)) return false
  return /(实时|当前|最新|realtime|real-time)/.test(text)
}

export function wantsYieldTrend(rawQuery: string): boolean {
  const text = rawQuery.toLowerCase()
  return /(apy|收益|yield)/.test(text) && /(走势|趋势|trend|每天|每日|最高|最低|哪天|波动)/.test(text)
}

export function wantsYieldExtremes(rawQuery: string): boolean {
  const text = rawQuery.toLowerCase()
  return /(apy|收益|yield)/.test(text) && /(最高|最低|哪天|最大|最小|highest|lowest|peak)/.test(text)
}

export function parseYieldRankingDimension(rawQuery: string): 'chain' | 'protocol' | null {
  const text = rawQuery.toLowerCase()
  const asksRank = /(排名|排行|rank|top)/.test(text)
  if (!asksRank) return null
  if (/(协议|protocol)/.test(text)) return 'protocol'
  if (/(链|chain)/.test(text)) return 'chain'
  return 'chain'
}

function buildGenericQueryTerms() {
  return new Set([
    'apy',
    'yield',
    '收益',
    '回报率',
    'vault',
    '金库',
    'current',
    'latest',
    'recent',
    'arbitrum',
    'ethereum',
    'base',
    'optimism',
    'plasma',
    'solana',
    'morpho',
    'aave',
    'aave v3',
    'euler',
    'unitus',
    '看',
    '只看',
    '查看',
    '比较',
    '对比',
    '和',
    '与',
    'vs',
    'versus',
  ])
}

function isGenericVaultToken(token: string): boolean {
  const lower = token.toLowerCase()
  if (!lower) return true
  if (buildGenericQueryTerms().has(lower)) return true
  if (['的', '上', '链上', 'protocol', 'chain'].includes(lower)) return true
  if (/^(最近\d+天|近\d+天|today|current|latest|\d+d)$/i.test(lower)) return true
  if (/^\d+$/.test(lower)) return true
  if (/^(天|日|周|月|年)$/i.test(lower)) return true
  return false
}

function stripGenericContextTerms(candidate: string): string {
  const parts = String(candidate || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  while (parts.length > 0 && isGenericVaultToken(parts[0])) {
    parts.shift()
  }
  while (parts.length > 0 && isGenericVaultToken(parts[parts.length - 1])) {
    parts.pop()
  }
  return parts.join(' ').trim()
}

function normalizeVaultCandidate(value: string | undefined): string | null {
  const generic = buildGenericQueryTerms()
  const candidate = String(value || '')
    .trim()
    .replace(/^(看|只看|比较|对比|查看|show|see|check)\s+/i, '')
    .replace(/\s+/g, ' ')
  const strippedCandidate = stripGenericContextTerms(candidate)
  if (!strippedCandidate) return null
  if (!candidate) return null
  const lower = strippedCandidate.toLowerCase()
  if (generic.has(lower)) return null
  if (/^(apy|yield|收益|回报率)\b/i.test(strippedCandidate)) return null
  const normalizedTokens = lower
    .replace(/[()]/g, ' ')
    .split(/[\s/_-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (normalizedTokens.length > 0 && normalizedTokens.every((token) => isGenericVaultToken(token))) {
    return null
  }
  return strippedCandidate
}

export function parseCompareVaultKeywords(rawQuery: string): string[] {
  const text = String(rawQuery || '').trim()
  if (!/(?:比较|对比|compare|\bvs\b|versus)/i.test(text)) return []
  const compareMatch = text.match(/(?:比较|对比|compare)\s+(.+?)(?:\s+(?:的\s*)?(?:apy|yield|收益|回报率)|$)/i)
  const source = compareMatch?.[1] || text
  const parts = source
    .split(/\s+(?:和|与|vs|versus)\s+|、|,/i)
    .map((part) => normalizeVaultCandidate(part))
    .filter((part): part is string => Boolean(part))
  return Array.from(new Set(parts)).slice(0, 2)
}

export function parseVaultKeyword(rawQuery: string): string | null {
  const text = rawQuery.trim()
  const compareTargets = parseCompareVaultKeywords(text)
  if (compareTargets.length === 1) return compareTargets[0]
  if (compareTargets.length >= 2) return null
  const m1 = text.match(/(?:关于|for)\s+([A-Za-z0-9 _\-]+?)\s+(?:vault|金库|apy|yield)/i)
  if (m1?.[1]) return normalizeVaultCandidate(m1[1])
  const m0 = text.match(/^(?:只看|查看|比较|对比|看)\s+(.+?)(?:[（(]|$)/i)
  if (m0?.[1]) return normalizeVaultCandidate(m0[1])
  const m0b = text.match(/(?:只看|查看|看)\s+(.+?)(?:\s+(?:平均|最高|最低|apy|yield|收益|回报率)|$)/i)
  if (m0b?.[1]) return normalizeVaultCandidate(m0b[1])
  const m2 = text.match(/([A-Za-z0-9 _\-]+?)\s*的\s*(?:apy|收益|yield)/i)
  if (m2?.[1]) return normalizeVaultCandidate(m2[1])
  const m3 = text.match(/(?:vault|金库)\s*[:：]?\s*([A-Za-z0-9 _\-]+)/i)
  if (m3?.[1]) return normalizeVaultCandidate(m3[1])
  return null
}

export function extractExecutionId(raw: string): string | null {
  const m = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
  return m ? m[0] : null
}

export function wantsSingleExecution(rawQuery: string): boolean {
  const t = rawQuery.toLowerCase()
  return /(最近|latest|latest\s+one|最近一笔|一笔|one)/.test(t)
}
