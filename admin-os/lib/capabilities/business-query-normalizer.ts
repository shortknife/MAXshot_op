import type { BusinessScope as Scope } from '@/lib/capabilities/business-query-runtime'
import { parseTimestampForFilter, toApyPercent } from '@/lib/capabilities/business-query-filters'

export type QualityAlert = {
  level: 'info' | 'warning'
  title: string
  message: string
  examples?: string[]
}

function normalizeExecutionStatus(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return 'unknown'
  if (raw === '200' || raw === 'ok' || raw === 'success') return 'completed'
  if (raw === 'pending' || raw === 'queued') return 'pending'
  if (raw === 'running' || raw === 'in_progress' || raw === 'executing') return 'in_progress'
  if (raw === 'failed' || raw === 'error') return 'failed'
  const num = Number(raw)
  if (Number.isFinite(num)) {
    if (num >= 200 && num < 300) return 'completed'
    if (num >= 400) return 'failed'
  }
  return raw
}

export function formatVaultRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows]
    .sort((a, b) => Number(b.total_allocated || 0) - Number(a.total_allocated || 0))
    .map((r) => ({
      vault_name: r.vault_name || null,
      chain_name: r.chain_name || null,
      protocol_name: r.protocol_name || null,
      market: r.market || null,
      asset: r.asset || null,
      total_allocated: Number(r.total_allocated || 0),
      idle_liquidity: Number(r.idle_liquidity || 0),
      created_at: r.created_at || null,
    }))
}

export function formatExecutionRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows]
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
    .map((r) => ({
      execution_id: r.execution_id || r.id || null,
      status: normalizeExecutionStatus(r.status || r.state),
      vault_name: r.vault_name || null,
      updated_at: r.updated_at || r.created_at || null,
      duration_ms: r.duration_ms ?? null,
      total_gas_cost_usd: r.total_gas_cost_usd ?? null,
    }))
}

export function formatRebalanceRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows]
    .sort((a, b) => String(b.decision_timestamp || b.created_at || '').localeCompare(String(a.decision_timestamp || a.created_at || '')))
    .map((r) => ({
      execution_id: r.execution_id || null,
      vault_name: r.vault_name || null,
      rebalance_needed: Boolean(r.rebalance_needed),
      is_blocked: Boolean(r.is_blocked),
      rebalance_reason: r.rebalance_reason || null,
      decision_timestamp: r.decision_timestamp || r.created_at || null,
    }))
}

export function formatYieldRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  if (!rows.length) return []
  if ('rank_type' in rows[0] && 'apy_pct' in rows[0]) {
    return rows.map((r) => ({
      rank_type: String(r.rank_type || ''),
      chain: r.chain || null,
      protocol: r.protocol || null,
      market_name: r.market_name || r.market || null,
      apy_pct: Number(Number(r.apy_pct || 0).toFixed(4)),
      tvl: Number(r.tvl ?? 0),
      date_from: r.date_from || null,
      date_to: r.date_to || null,
      created_at: r.created_at || null,
    }))
  }
  if ('avg_daily_tvl' in rows[0]) {
    return [...rows]
      .sort((a, b) => String(b.day_local || '').localeCompare(String(a.day_local || '')))
      .map((r) => ({
        day_local: r.day_local || null,
        avg_daily_tvl: Number(Number(r.avg_daily_tvl || 0).toFixed(4)),
        sample_count: Number(r.sample_count || 0),
      }))
  }
  if ('top_apy_pct' in rows[0]) {
    return rows.map((r) => ({
      chain: r.chain || null,
      protocol: r.protocol || null,
      market_name: r.market_name || null,
      top_apy_pct: Number(Number(r.top_apy_pct || 0).toFixed(4)),
      tvl_total: Number(r.tvl_total ?? 0),
      sample_count: Number(r.sample_count || 0),
      date_from: r.date_from || null,
      date_to: r.date_to || null,
      max_apy_at: r.max_apy_at || null,
    }))
  }
  if ('market_name' in rows[0] && 'avg_apy_pct' in rows[0]) {
    return [...rows]
      .sort((a, b) => Number(b.avg_apy_pct || 0) - Number(a.avg_apy_pct || 0))
      .map((r) => ({
        chain: r.chain || null,
        protocol: r.protocol || null,
        market_name: r.market_name || r.market || null,
        avg_apy_pct: Number(Number(r.avg_apy_pct || 0).toFixed(4)),
        max_apy_pct: Number(Number(r.max_apy_pct || 0).toFixed(4)),
        min_apy_pct: Number(Number(r.min_apy_pct || 0).toFixed(4)),
        tvl: Number(r.tvl ?? 0),
        sample_count: Number(r.sample_count || 0),
        created_at: r.created_at || null,
      }))
  }
  if ('dimension_value' in rows[0] && 'avg_apy_pct' in rows[0]) {
    return [...rows]
      .sort((a, b) => Number(b.avg_apy_pct || 0) - Number(a.avg_apy_pct || 0))
      .map((r) => ({
        dimension_value: String(r.dimension_value || 'unknown'),
        avg_apy_pct: Number(Number(r.avg_apy_pct || 0).toFixed(4)),
        max_apy_pct: Number(Number(r.max_apy_pct || 0).toFixed(4)),
        sample_count: Number(r.sample_count || 0),
      }))
  }
  if ('highest_day' in rows[0] && 'lowest_day' in rows[0]) {
    return rows.map((r) => ({
      highest_day: r.highest_day || null,
      highest_avg_apy_pct: Number(Number(r.highest_avg_apy_pct || 0).toFixed(4)),
      highest_max_apy_pct: Number(Number(r.highest_max_apy_pct || 0).toFixed(4)),
      highest_reason: r.highest_reason || null,
      lowest_day: r.lowest_day || null,
      lowest_avg_apy_pct: Number(Number(r.lowest_avg_apy_pct || 0).toFixed(4)),
      lowest_min_apy_pct: Number(Number(r.lowest_min_apy_pct || 0).toFixed(4)),
      lowest_reason: r.lowest_reason || null,
    }))
  }
  if ('day_local' in rows[0] && 'avg_apy_pct' in rows[0]) {
    return [...rows]
      .sort((a, b) => String(b.day_local || '').localeCompare(String(a.day_local || '')))
      .map((r) => ({
        day_local: r.day_local || null,
        avg_apy_pct: Number(Number(r.avg_apy_pct || 0).toFixed(4)),
        max_apy_pct: Number(Number(r.max_apy_pct || 0).toFixed(4)),
        min_apy_pct: Number(Number(r.min_apy_pct || 0).toFixed(4)),
        sample_count: Number(r.sample_count || 0),
      }))
  }
  return [...rows]
    .sort((a, b) => toApyPercent(b.net_apy ?? b.base_apy ?? 0) - toApyPercent(a.net_apy ?? a.base_apy ?? 0))
    .map((r) => ({
      chain: r.chain || null,
      protocol: r.protocol || null,
      market_name: r.market_name || r.market || null,
      net_apy: Number(toApyPercent(r.net_apy ?? r.base_apy ?? 0).toFixed(4)),
      base_apy: Number(toApyPercent(r.base_apy ?? 0).toFixed(4)),
      tvl: Number(r.tvl ?? 0),
      is_available: Boolean(r.is_available ?? true),
      created_at: r.created_at || null,
    }))
}

export function summarizeVaultRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '当前未找到可用 Vault 数据。'
  const names = new Set<string>()
  const protocols = new Map<string, number>()
  let totalAllocated = 0
  let totalIdle = 0
  let hasTotals = false
  for (const row of rows) {
    const name =
      String(row.vault_name || row.vault || row.market || row.symbol || row.protocol || '').trim()
    if (name) names.add(name)
    const protocol = String(row.protocol_name || row.protocol || '').trim()
    if (protocol) {
      protocols.set(protocol, (protocols.get(protocol) || 0) + 1)
    }
    const alloc = Number(row.total_allocated || 0)
    const idle = Number(row.idle_liquidity || 0)
    if (Number.isFinite(alloc) && alloc !== 0) hasTotals = true
    if (Number.isFinite(idle) && idle !== 0) hasTotals = true
    totalAllocated += alloc
    totalIdle += idle
  }
  if (!names.size) return `已检索到 ${rows.length} 条 Vault 相关记录。`
  const top = Array.from(names).slice(0, 5)
  const topProtocol = [...protocols.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  if (!hasTotals) {
    return `当前可见 ${names.size} 个 Vault，示例：${top.join('、')}；主协议 ${topProtocol}。`
  }
  return `当前可见 ${names.size} 个 Vault，示例：${top.join('、')}；总分配 ${totalAllocated.toFixed(2)}，空闲流动性 ${totalIdle.toFixed(2)}，主协议 ${topProtocol}。`
}

export function summarizeExecutionRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '当前未找到匹配的执行记录。'
  const first = rows[0]
  const id = String(first.execution_id || first.id || '').trim()
  const status = normalizeExecutionStatus(first.status || first.state)
  const updatedAt = String(first.updated_at || first.created_at || '').trim()
  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const s = normalizeExecutionStatus(r.status || r.state)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const topStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]
  if (id && updatedAt && topStatus) {
    return `已找到执行记录 ${id}，当前状态 ${status}，更新时间 ${updatedAt}；最近样本中最多状态为 ${topStatus[0]}（${topStatus[1]} 条）。`
  }
  if (id && updatedAt) return `已找到执行记录 ${id}，当前状态 ${status}，更新时间 ${updatedAt}。`
  if (id) return `已找到执行记录 ${id}，当前状态 ${status}。`
  return `已找到 ${rows.length} 条执行记录。`
}

export function summarizeMetricRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '当前未找到业务指标数据。'
  if ('rank_type' in rows[0] && 'apy_pct' in rows[0]) {
    const highest = rows.find((row) => String(row.rank_type) === 'highest') || rows[0]
    const lowest = rows.find((row) => String(row.rank_type) === 'lowest') || rows[rows.length - 1]
    return `已返回当天 APY 最高/最低的市场；最高为 ${String(highest.market_name || 'Unknown Market')}（${Number(highest.apy_pct || 0).toFixed(2)}%），TVL ${Number(highest.tvl || 0).toFixed(2)}；最低为 ${String(lowest.market_name || 'Unknown Market')}（${Number(lowest.apy_pct || 0).toFixed(2)}%），TVL ${Number(lowest.tvl || 0).toFixed(2)}。`
  }
  if ('avg_daily_tvl' in rows[0]) {
    const tvls = rows.map((r) => Number(r.avg_daily_tvl)).filter((n) => Number.isFinite(n))
    const avgTvl = tvls.length ? tvls.reduce((a, b) => a + b, 0) / tvls.length : null
    const high = [...rows].sort((a, b) => Number(b.avg_daily_tvl || 0) - Number(a.avg_daily_tvl || 0))[0]
    const low = [...rows].sort((a, b) => Number(a.avg_daily_tvl || 0) - Number(b.avg_daily_tvl || 0))[0]
    if (avgTvl !== null && high && low) {
      return `已返回 ${rows.length} 天 TVL 数据；平均日 TVL ${avgTvl.toFixed(2)}，最高日 ${String(high.day_local || '-')}（${Number(high.avg_daily_tvl || 0).toFixed(2)}），最低日 ${String(low.day_local || '-')}（${Number(low.avg_daily_tvl || 0).toFixed(2)}）。`
    }
    return `已返回 ${rows.length} 天 TVL 数据。`
  }
  if ('top_apy_pct' in rows[0]) {
    const top = rows[0]
    return `已找到区间内最高 APY 市场；${String(top.market_name || 'Unknown Market')} 最高 APY ${Number(top.top_apy_pct || 0).toFixed(2)}%，对应 TVL ${Number(top.tvl_total || 0).toFixed(2)}。`
  }
  if ('market_name' in rows[0] && 'avg_apy_pct' in rows[0]) {
    const avgSeries = rows.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    const maxSeries = rows.map((r) => Number(r.max_apy_pct)).filter((n) => Number.isFinite(n))
    const latestSnapshotTvls = rows.map((r) => Number(r.tvl ?? NaN)).filter((n) => Number.isFinite(n))
    const overall = avgSeries.length ? avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length : null
    const peak = maxSeries.length ? Math.max(...maxSeries) : null
    const totalTvl = latestSnapshotTvls.length ? latestSnapshotTvls.reduce((a, b) => a + b, 0) : null
    if (rows.length === 2 && overall !== null && peak !== null && totalTvl !== null) {
      const left = rows[0]
      const right = rows[1]
      return `已返回 2 组 Vault APY 对比；${String(left.market_name || 'Vault A')} 均值 ${Number(left.avg_apy_pct || 0).toFixed(2)}%，${String(right.market_name || 'Vault B')} 均值 ${Number(right.avg_apy_pct || 0).toFixed(2)}%，最新快照 TVL 合计 ${totalTvl.toFixed(2)}。`
    }
    if (overall !== null && peak !== null && totalTvl !== null) {
      return `已返回 ${rows.length} 组最近窗口平均 APY；平均 APY ${overall.toFixed(2)}%，最高 APY ${peak.toFixed(2)}%，最新快照 TVL 合计 ${totalTvl.toFixed(2)}。`
    }
    return `已返回 ${rows.length} 组最近窗口平均 APY。`
  }
  if ('dimension_value' in rows[0] && 'avg_apy_pct' in rows[0]) {
    const top = rows[0]
    return `已返回 ${rows.length} 组 APY 排名；当前最高为 ${String(top.dimension_value)}（均值 ${Number(top.avg_apy_pct || 0).toFixed(2)}%）。`
  }
  if ('highest_day' in rows[0] && 'lowest_day' in rows[0]) {
    const r = rows[0]
    return `已分析 APY 极值：最高日 ${String(r.highest_day)}（${Number(r.highest_avg_apy_pct || 0).toFixed(2)}%），最低日 ${String(r.lowest_day)}（${Number(r.lowest_avg_apy_pct || 0).toFixed(2)}%）。`
  }
  if ('avg_apy_pct' in rows[0]) {
    const sorted = [...rows].sort((a, b) => String(b.day_local || '').localeCompare(String(a.day_local || '')))
    const avgSeries = sorted.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    const peak = [...sorted]
      .filter((r) => Number.isFinite(Number(r.max_apy_pct)))
      .sort((a, b) => Number(b.max_apy_pct) - Number(a.max_apy_pct))[0]
    const low = [...sorted]
      .filter((r) => Number.isFinite(Number(r.min_apy_pct)))
      .sort((a, b) => Number(a.min_apy_pct) - Number(b.min_apy_pct))[0]
    const overall = avgSeries.length ? avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length : null
    if (overall !== null && peak && low) {
      return `已返回 ${rows.length} 天 APY 走势；区间均值 ${overall.toFixed(2)}%，最高日 ${String(peak.day_local)}（${Number(peak.max_apy_pct).toFixed(2)}%），最低日 ${String(low.day_local)}（${Number(low.min_apy_pct).toFixed(2)}%）。`
    }
    return `已返回 ${rows.length} 天 APY 走势数据。`
  }
  const apys = rows
    .map((r) => toApyPercent(r.net_apy ?? r.apy ?? r.current_apy ?? r.avg_apy ?? r.yield ?? NaN))
    .filter((n) => Number.isFinite(n))
  const latestSnapshotRows = (() => {
    const stamped = rows
      .map((row) => ({
        row,
        ts: parseTimestampForFilter(row.created_at ?? row.updated_at ?? row.day_local),
      }))
      .filter((item) => item.ts !== null) as Array<{ row: Record<string, unknown>; ts: number }>
    if (!stamped.length) return []
    const latestTs = Math.max(...stamped.map((item) => item.ts))
    return stamped.filter((item) => item.ts === latestTs).map((item) => item.row)
  })()
  const latestSnapshotTvls = latestSnapshotRows
    .map((r) => Number(r.tvl ?? NaN))
    .filter((n) => Number.isFinite(n))
  if (apys.length) {
    const maxApy = Math.max(...apys)
    const avgApy = apys.reduce((a, b) => a + b, 0) / apys.length
    const totalTvl = latestSnapshotTvls.length ? latestSnapshotTvls.reduce((a, b) => a + b, 0) : null
    if (totalTvl !== null) {
      return `已返回 ${rows.length} 条业务指标记录；平均 APY ${avgApy.toFixed(2)}%，最高 APY ${maxApy.toFixed(2)}%，最新快照 TVL 合计 ${totalTvl.toFixed(2)}。`
    }
    return `已返回 ${rows.length} 条业务指标记录；平均 APY ${avgApy.toFixed(2)}%，最高 APY ${maxApy.toFixed(2)}%。`
  }
  return `已返回 ${rows.length} 条业务指标记录。`
}

export function summarizeRebalanceRows(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '当前未找到再平衡决策记录。'
  const blocked = rows.filter((r) => Boolean(r.is_blocked)).length
  const needed = rows.filter((r) => Boolean(r.rebalance_needed)).length
  const latest = rows[0]
  const latestReason = String(latest.rebalance_reason || '无')
  return `已找到 ${rows.length} 条再平衡记录；需要调仓 ${needed} 条，被拦截 ${blocked} 条；最新原因：${latestReason}。`
}

export function deriveMetricSemantics(scope: Scope, sourceId: string): string {
  if (sourceId === 'business_tvl_window_average') return 'vault_tvl'
  if (scope !== 'yield') return 'business_metric'
  if (
    sourceId === 'market_metrics' ||
    sourceId === 'get_metrics_summary_v1' ||
    sourceId === 'business_yield_window_average' ||
    sourceId === 'business_yield_top1_range' ||
    sourceId === 'business_yield_top_bottom_day' ||
    sourceId === 'business_yield_daily_trend' ||
    sourceId === 'business_yield_extremes_with_reason'
  ) {
    return 'market_tvl'
  }
  if (sourceId === 'business_yield_dimension_ranking') return 'apy_ranking'
  if (sourceId === 'allocation_snapshots') return 'vault_tvl'
  return 'yield_metric'
}

export function buildYieldQualityAlert(rows: Record<string, unknown>[]): QualityAlert | null {
  if (!rows.length) return null
  if (!('avg_apy_pct' in rows[0]) && !('net_apy' in rows[0])) return null

  const suspicious = rows
    .map((row) => {
      const avg = Number(row.avg_apy_pct ?? row.net_apy ?? NaN)
      const max = Number(row.max_apy_pct ?? row.net_apy ?? NaN)
      const min = Number(row.min_apy_pct ?? row.net_apy ?? NaN)
      const spread = Number.isFinite(max) && Number.isFinite(min) ? max - min : 0
      const label = [row.chain, row.protocol, row.market_name || row.market].filter(Boolean).join(' / ')
      return { label, avg, max, min, spread }
    })
    .filter((item) => Number.isFinite(item.avg) && (item.max >= 20 || item.avg >= 15 || item.spread >= 20))
    .sort((a, b) => b.max - a.max)

  if (!suspicious.length) return null
  return {
    level: 'warning',
    title: 'APY 异常波动提示',
    message: '结果中存在异常高或波动很大的 APY 样本。默认均值已返回，但建议继续按 chain、protocol 或单个市场下钻验证。',
    examples: suspicious.slice(0, 3).map((item) => `${item.label}（均值 ${item.avg.toFixed(2)}%，最高 ${item.max.toFixed(2)}%）`),
  }
}
