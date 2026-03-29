import type { QueryContractV2 } from '@/lib/capabilities/business-query-contract-v2'

function toFixedPercent(value: unknown): string {
  const num = Number(value || 0)
  return `${num.toFixed(2)}%`
}

export function buildContractTimeLabel(queryContract: QueryContractV2 | null | undefined): string {
  if (!queryContract) return '最近7天'
  if (queryContract.time.exact_day) return '指定日期'
  if (queryContract.time.date_from || queryContract.time.date_to || queryContract.time.time_window_days) return '指定时间范围'
  return '最近7天'
}

export function buildYieldInterpretationFromContract(queryContract: QueryContractV2 | null | undefined): string | null {
  if (!queryContract || queryContract.scope !== 'yield') return null
  const agg = String(queryContract.aggregation || '').trim().toLowerCase()
  const aggLabel = agg === 'max' ? '最高' : agg === 'min' ? '最低' : agg === 'realtime' ? '实时' : '平均'
  const timeLabel = buildContractTimeLabel(queryContract)
  return `我的理解是：查询 ${timeLabel} 的 ${aggLabel} APY。`
}

export function summarizeMetricRowsWithContract(
  rows: Record<string, unknown>[],
  queryContract: QueryContractV2 | null | undefined
): string | null {
  if (!queryContract || !rows.length) return null
  const shape = queryContract.question_shape

  if (shape === 'top_bottom_in_day' && 'rank_type' in rows[0] && 'apy_pct' in rows[0]) {
    const highest = rows.find((r) => String(r.rank_type) === 'highest') || rows[0]
    const lowest = rows.find((r) => String(r.rank_type) === 'lowest') || rows[rows.length - 1]
    return `已返回指定日期 APY 最高/最低的市场；最高为 ${String(highest.market_name || 'Unknown Market')}（${toFixedPercent(highest.apy_pct)}），TVL ${Number(highest.tvl || 0).toFixed(2)}；最低为 ${String(lowest.market_name || 'Unknown Market')}（${toFixedPercent(lowest.apy_pct)}），TVL ${Number(lowest.tvl || 0).toFixed(2)}。`
  }

  if (shape === 'top_1_in_period' && 'top_apy_pct' in rows[0]) {
    const top = rows[0]
    return `已找到指定时间范围内最高 APY 市场；${String(top.market_name || 'Unknown Market')} 最高 APY ${toFixedPercent(top.top_apy_pct)}，对应 TVL ${Number(top.tvl_total || 0).toFixed(2)}。`
  }

  if (shape === 'ranking_by_dimension' && 'dimension_value' in rows[0] && 'avg_apy_pct' in rows[0]) {
    const top = rows[0]
    const dimLabel = queryContract.ranking_dimension === 'protocol' ? '协议' : '链'
    return `已返回 ${rows.length} 组按${dimLabel}的 APY 排名；当前最高为 ${String(top.dimension_value || '-')}（均值 ${toFixedPercent(top.avg_apy_pct)}）。`
  }

  if (shape === 'trend_window' && 'day_local' in rows[0] && 'avg_apy_pct' in rows[0]) {
    const sorted = [...rows]
    const peak = sorted
      .filter((r) => Number.isFinite(Number(r.max_apy_pct)))
      .sort((a, b) => Number(b.max_apy_pct) - Number(a.max_apy_pct))[0]
    const low = sorted
      .filter((r) => Number.isFinite(Number(r.min_apy_pct)))
      .sort((a, b) => Number(a.min_apy_pct) - Number(b.min_apy_pct))[0]
    const avgSeries = sorted.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    const overall = avgSeries.length ? avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length : null
    if (overall !== null && peak && low) {
      return `已返回 ${rows.length} 天 APY 走势；区间均值 ${overall.toFixed(2)}%，最高日 ${String(peak.day_local)}（${toFixedPercent(peak.max_apy_pct)}），最低日 ${String(low.day_local)}（${toFixedPercent(low.min_apy_pct)}）。`
    }
  }

  if (queryContract.metric === 'tvl' && 'avg_daily_tvl' in rows[0]) {
    const tvls = rows.map((r) => Number(r.avg_daily_tvl)).filter((n) => Number.isFinite(n))
    const avgTvl = tvls.length ? tvls.reduce((a, b) => a + b, 0) / tvls.length : null
    if (avgTvl !== null) {
      return `已返回 ${rows.length} 天 TVL 数据；平均日 TVL ${avgTvl.toFixed(2)}。`
    }
  }

  if (
    queryContract.scope === 'yield' &&
    queryContract.aggregation === 'avg' &&
    'market_name' in rows[0] &&
    'avg_apy_pct' in rows[0]
  ) {
    const avgSeries = rows.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
    const maxSeries = rows.map((r) => Number(r.max_apy_pct)).filter((n) => Number.isFinite(n))
    const totalTvl = rows
      .map((r) => Number(r.tvl))
      .filter((n) => Number.isFinite(n))
      .reduce((sum, value) => sum + value, 0)
    const overall = avgSeries.length ? avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length : null
    const peak = maxSeries.length ? Math.max(...maxSeries) : null
    if (rows.length === 2 && overall !== null && peak !== null && totalTvl > 0) {
      return `已返回 2 组 Vault APY 对比；${String(rows[0].market_name || 'Vault A')} 均值 ${toFixedPercent(rows[0].avg_apy_pct)}，${String(rows[1].market_name || 'Vault B')} 均值 ${toFixedPercent(rows[1].avg_apy_pct)}，最新快照 TVL 合计 ${totalTvl.toFixed(2)}。`
    }
    if (overall !== null && peak !== null && totalTvl > 0) {
      return `已返回 ${rows.length} 组指定时间范围平均 APY；平均 APY ${overall.toFixed(2)}%，最高 APY ${peak.toFixed(2)}%，最新快照 TVL 合计 ${totalTvl.toFixed(2)}。`
    }
  }

  return null
}
