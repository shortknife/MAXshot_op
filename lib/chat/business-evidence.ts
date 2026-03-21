import { supabase } from '@/lib/supabase'

export async function fetchNarrativeEvidence(params: {
  mode: 'metrics' | 'investigate' | 'lookup'
  scope: string
  rows: Array<Record<string, unknown>>
}) {
  if (params.mode !== 'investigate') return []
  const first = params.rows?.[0] || {}
  const executionId = String(first.execution_id || '').trim()
  if (!executionId) return []
  try {
    const { data, error } = await supabase
      .from('execution_logs_rag')
      .select('content, metadata, created_at')
      .contains('metadata', { execution_id: executionId })
      .order('created_at', { ascending: false })
      .limit(2)
    if (error || !Array.isArray(data)) return []
    return data.map((item) => ({
      source: 'execution_logs_rag',
      execution_id: executionId,
      created_at: item.created_at || null,
      snippet: String(item.content || '').slice(0, 180),
    }))
  } catch {
    return []
  }
}

export function buildInvestigateExplanation(scope: string, rows: Array<Record<string, unknown>>, narrativeCount: number): string | null {
  if (!rows.length) return null
  if (scope === 'rebalance') {
    const blocked = rows.filter((r) => Boolean(r.is_blocked)).length
    const needed = rows.filter((r) => Boolean(r.rebalance_needed)).length
    const latestReason = String(rows[0]?.rebalance_reason || '无')
    return `原因分析：最近样本中需要调仓 ${needed} 条、被拦截 ${blocked} 条；最新决策原因为「${latestReason}」${narrativeCount > 0 ? `，并已补充 ${narrativeCount} 条叙事证据` : ''}。`
  }
  if (scope === 'yield') {
    const apys = rows.map((r) => Number(r.net_apy ?? r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    if (!apys.length) return null
    const max = Math.max(...apys)
    const min = Math.min(...apys)
    return `原因分析：样本 APY 区间为 ${min.toFixed(2)}% ~ ${max.toFixed(2)}%${narrativeCount > 0 ? `，并补充了 ${narrativeCount} 条执行叙事线索` : ''}。`
  }
  if (scope === 'execution') {
    const latest = rows[0]
    return `原因分析：最新执行状态为 ${String(latest?.status || 'unknown')}，可继续按 execution_id 追问具体触发条件。`
  }
  return null
}

export function deriveReasonTags(scope: string, rows: Array<Record<string, unknown>>, narrativeCount: number): string[] {
  const tags = new Set<string>()
  if (!rows.length) return []
  if (scope === 'rebalance') {
    const blocked = rows.filter((r) => Boolean(r.is_blocked)).length
    const needed = rows.filter((r) => Boolean(r.rebalance_needed)).length
    if (blocked > 0) tags.add('rebalance_blocked')
    if (needed > 0) tags.add('rebalance_needed')
    const reasons = rows
      .map((r) => String(r.rebalance_reason || '').toLowerCase())
      .filter(Boolean)
      .join(' ')
    if (/cooldown|冷却|waiting period/.test(reasons)) tags.add('cooldown_window')
    if (/threshold|阈值|条件/.test(reasons)) tags.add('threshold_condition')
  }
  if (scope === 'yield') {
    const apys = rows.map((r) => Number(r.net_apy ?? r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    if (apys.length) {
      const spread = Math.max(...apys) - Math.min(...apys)
      if (spread >= 1) tags.add('apy_spread_wide')
      if (spread >= 3) tags.add('apy_volatility_high')
    }
  }
  if (scope === 'execution') {
    const status = String(rows[0]?.status || '').toLowerCase()
    if (status === 'failed') tags.add('execution_failed')
    if (status === 'completed') tags.add('execution_completed')
    if (status === 'pending') tags.add('execution_pending')
  }
  if (narrativeCount > 0) tags.add('rag_context_attached')
  return Array.from(tags)
}

export function buildReasonBreakdown(reasonTags: string[], narrativeCount: number): {
  main_reason: string
  secondary_reasons: string[]
  evidence_count: number
} {
  const priority = [
    'rebalance_blocked',
    'rebalance_needed',
    'cooldown_window',
    'threshold_condition',
    'execution_failed',
    'apy_volatility_high',
    'apy_spread_wide',
    'execution_pending',
    'execution_completed',
    'rag_context_attached',
  ]
  const main = priority.find((p) => reasonTags.includes(p)) || (reasonTags[0] || 'insufficient_signal')
  const secondary = reasonTags.filter((x) => x !== main)
  return {
    main_reason: main,
    secondary_reasons: secondary,
    evidence_count: narrativeCount,
  }
}

export function mapReasonTagToZh(tag: string): string {
  const dict: Record<string, string> = {
    rebalance_blocked: '调仓被拦截',
    rebalance_needed: '满足调仓条件',
    cooldown_window: '处于冷却窗口',
    threshold_condition: '触发阈值条件',
    execution_failed: '执行失败',
    execution_pending: '执行待处理',
    execution_completed: '执行完成',
    apy_volatility_high: 'APY 波动较高',
    apy_spread_wide: 'APY 区间较宽',
    rag_context_attached: '已附加叙事证据',
    insufficient_signal: '信号不足',
  }
  return dict[tag] || tag
}

