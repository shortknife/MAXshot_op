const INTENT_TEMPLATE_DEFAULTS = {
  ops_summary: { template_id: 'execution_status_breakdown', template_slots: { days: 7 } },
  audit_query: { template_id: 'latest_audit_events', template_slots: { limit: 20 } },
  memory_query: { template_id: 'memory_recent_insights', template_slots: { limit: 10 } },
  ops_query: { template_id: 'latest_executions', template_slots: { limit: 5 } },
}

function mergeSlots(base, incoming) {
  return { ...(base || {}), ...(incoming || {}) }
}

export function normalizeIntentForUserExecution(intentType, extractedSlots) {
  const defaults = INTENT_TEMPLATE_DEFAULTS[intentType]
  if (!defaults) return { slots: extractedSlots || {}, template: null }
  const mergedTemplateSlots = mergeSlots(defaults.template_slots, extractedSlots?.template_slots)
  const slots = {
    ...(extractedSlots || {}),
    template_id: extractedSlots?.template_id || defaults.template_id,
    template_slots: mergedTemplateSlots,
  }
  return { slots, template: slots.template_id }
}

export function mapErrorToUserMessage(reason) {
  const code = String(reason || '')
  if (code === 'missing_topic') return '缺少主题，请补充你要写的主题，例如：写一条关于新品发布的帖子。'
  if (code === 'out_of_business_scope') return '该问题暂不在当前业务查询范围内，请改问 Vault、执行日志或业务指标。'
  if (code === 'query_incomplete') return '当前查询信息还不完整，请补充缺失条件后再试。'
  if (code === 'no_data_in_selected_range') return '该时间区间内未检索到足够业务数据，暂时无法给出可靠结论。'
  if (code === 'insufficient_business_data') return '当前业务数据不足，无法给出可靠结论。请补充时间范围或查询对象。'
  if (code === 'source_not_connected') return '目标数据源暂时不可用，请稍后重试。'
  if (code === 'unsafe_write_attempt') return '该请求涉及未授权写入操作，已被拦截。'
  if (code.startsWith('missing_slot')) return '参数不完整，请补充必要条件后再试。'
  if (code.startsWith('invalid_')) return '输入格式有误，请检查后重试。'
  if (code.includes('write_blocked')) return '当前操作被安全策略拦截，请联系管理员确认权限。'
  if (code.includes('explain_cost_exceeded')) return '查询复杂度过高，已被系统保护机制拦截。'
  if (code.includes('sql_template')) return '查询模板执行失败，请稍后再试或更换查询方式。'
  return '请求暂时失败，请稍后重试。'
}

export function summarizeRows(rows, templateId) {
  const list = Array.isArray(rows) ? rows : []
  if (templateId === 'execution_status_breakdown') {
    if (!list.length) return '最近周期内暂无执行数据。'
    const top = list[0]
    return `最近执行状态共 ${list.length} 类，最多的是 ${top.status}（${top.count} 条）。`
  }
  if (templateId === 'latest_audit_events') {
    return list.length ? `已找到最近 ${list.length} 条审计事件。` : '最近没有匹配的审计事件。'
  }
  if (templateId === 'memory_recent_insights') {
    return list.length ? `已找到最近 ${list.length} 条 Insight 记忆。` : '当前没有可用的 Insight 记忆。'
  }
  return list.length ? `查询成功，共返回 ${list.length} 条结果。` : '查询成功，但当前没有命中数据。'
}

export function buildOpsHighlights(rows, templateId) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return []
  if (templateId === 'execution_status_breakdown') {
    const total = list.reduce((sum, item) => sum + Number(item.count || 0), 0)
    const top = list[0]
    return [
      { label: '状态类别', value: String(list.length) },
      { label: '总执行数', value: String(total) },
      { label: '最高状态', value: `${String(top.status || 'unknown')} (${Number(top.count || 0)})` },
    ]
  }
  if (templateId === 'latest_audit_events') {
    const newest = list[0]
    return [
      { label: '事件数', value: String(list.length) },
      { label: '最新事件', value: String(newest.event_type || '-') },
      { label: '最新时间', value: String(newest.timestamp || '-') },
    ]
  }
  return [{ label: '返回条数', value: String(list.length) }]
}

export function buildBusinessHighlights(rows, scope) {
  const list = Array.isArray(rows) ? rows : []
  const s = String(scope || '')
  if (!list.length) return []
  const buildLatestSnapshotTvl = (items) => {
    const stamped = items
      .map((row) => {
        const raw = String(row.created_at || row.updated_at || row.day_local || '').trim()
        if (!raw) return null
        const ts = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? Date.parse(`${raw}T00:00:00+08:00`) : Date.parse(raw)
        if (!Number.isFinite(ts)) return null
        return { row, ts }
      })
      .filter(Boolean)
    if (!stamped.length) return null
    const latestTs = Math.max(...stamped.map((item) => item.ts))
    const tvls = stamped
      .filter((item) => item.ts === latestTs)
      .map((item) => Number(item.row.tvl))
      .filter((n) => Number.isFinite(n))
    if (!tvls.length) return null
    return tvls.reduce((a, b) => a + b, 0).toFixed(2)
  }
  if (s === 'yield') {
    if (typeof list[0]?.market_name !== 'undefined' && typeof list[0]?.avg_apy_pct !== 'undefined') {
      const avgSeries = list.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
      const maxSeries = list.map((r) => Number(r.max_apy_pct)).filter((n) => Number.isFinite(n))
      const totalTvl = list
        .map((r) => Number(r.tvl))
        .filter((n) => Number.isFinite(n))
        .reduce((sum, value) => sum + value, 0)
      const avgOfAvg = avgSeries.length ? (avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length).toFixed(2) : '-'
      const peak = maxSeries.length ? Math.max(...maxSeries).toFixed(2) : '-'
      const highlights = [
        { label: '市场组数', value: String(list.length) },
        { label: '窗口平均 APY', value: `${avgOfAvg}%` },
        { label: '窗口最高 APY', value: `${peak}%` },
      ]
      if (Number.isFinite(totalTvl) && totalTvl > 0) highlights.push({ label: '最新快照TVL合计', value: totalTvl.toFixed(2) })
      return highlights
    }
    if (typeof list[0]?.dimension_value !== 'undefined' && typeof list[0]?.avg_apy_pct !== 'undefined') {
      const top = list[0] || {}
      const avg = list.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
      const maxApy = list.map((r) => Number(r.max_apy_pct)).filter((n) => Number.isFinite(n))
      const avgOfAvg = avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(2) : '-'
      const peak = maxApy.length ? Math.max(...maxApy).toFixed(2) : '-'
      return [
        { label: '分组数', value: String(list.length) },
        { label: 'Top 1', value: String(top.dimension_value || '-') },
        { label: 'Top 1 均值 APY', value: `${Number(top.avg_apy_pct || 0).toFixed(2)}%` },
        { label: '分组均值 APY', value: `${avgOfAvg}%` },
        { label: '分组最高 APY', value: `${peak}%` },
      ]
    }
    if (typeof list[0]?.highest_day !== 'undefined' && typeof list[0]?.lowest_day !== 'undefined') {
      const row = list[0] || {}
      return [
        { label: '最高日', value: `${String(row.highest_day || '-')}` },
        { label: '最高日均值 APY', value: `${Number(row.highest_avg_apy_pct || 0).toFixed(2)}%` },
        { label: '最低日', value: `${String(row.lowest_day || '-')}` },
        { label: '最低日均值 APY', value: `${Number(row.lowest_avg_apy_pct || 0).toFixed(2)}%` },
      ]
    }
    if (typeof list[0]?.avg_apy_pct !== 'undefined') {
      const avgSeries = list.map((r) => Number(r.avg_apy_pct)).filter((n) => Number.isFinite(n))
      const maxSeries = list.map((r) => Number(r.max_apy_pct)).filter((n) => Number.isFinite(n))
      const minSeries = list.map((r) => Number(r.min_apy_pct)).filter((n) => Number.isFinite(n))
      const overallAvg = avgSeries.length ? (avgSeries.reduce((a, b) => a + b, 0) / avgSeries.length).toFixed(2) : '-'
      const peak = maxSeries.length ? Math.max(...maxSeries).toFixed(2) : '-'
      const low = minSeries.length ? Math.min(...minSeries).toFixed(2) : '-'
      return [
        { label: '天数', value: String(list.length) },
        { label: '区间均值 APY', value: `${overallAvg}%` },
        { label: '区间最高 APY', value: `${peak}%` },
        { label: '区间最低 APY', value: `${low}%` },
      ]
    }
    const apys = list.map((r) => Number(r.net_apy)).filter((n) => Number.isFinite(n))
    const maxApy = apys.length ? Math.max(...apys).toFixed(2) : '-'
    const avgApy = apys.length ? (apys.reduce((a, b) => a + b, 0) / apys.length).toFixed(2) : '-'
    const totalTvl = buildLatestSnapshotTvl(list)
    const highlights = [
      { label: '样本条数', value: String(list.length) },
      { label: '平均 APY', value: `${avgApy}%` },
      { label: '最高 APY', value: `${maxApy}%` },
    ]
    if (totalTvl !== null) highlights.push({ label: '最新快照TVL合计', value: totalTvl })
    return highlights
  }
  if (s === 'vault') {
    const names = new Set(list.map((r) => String(r.vault_name || '').trim()).filter(Boolean))
    const totalAllocated = list.reduce((sum, r) => sum + Number(r.total_allocated || 0), 0)
    return [
      { label: 'Vault 数量', value: String(names.size || 0) },
      { label: '记录条数', value: String(list.length) },
      { label: '总分配', value: totalAllocated.toFixed(2) },
    ]
  }
  if (s === 'execution') {
    const top = list[0] || {}
    return [
      { label: '记录条数', value: String(list.length) },
      { label: '最新状态', value: String(top.status || '-') },
      { label: '最新执行', value: String(top.execution_id || '-') },
    ]
  }
  if (s === 'rebalance') {
    const blocked = list.filter((r) => Boolean(r.is_blocked)).length
    const needed = list.filter((r) => Boolean(r.rebalance_needed)).length
    const latest = list[0] || {}
    return [
      { label: '记录条数', value: String(list.length) },
      { label: '需要调仓', value: String(needed) },
      { label: '被拦截', value: String(blocked) },
      { label: '最新原因', value: String(latest.rebalance_reason || '-') },
    ]
  }
  return [{ label: '返回条数', value: String(list.length) }]
}

export function extractTopicFromQuery(rawQuery) {
  const text = String(rawQuery || '').trim()
  if (!text) return null
  const patterns = [
    /关于(.+?)(的|帖子|文案|$)/,
    /写(.+?)(帖子|文案|$)/,
    /生成(.+?)(简介|文案|帖子|$)/,
    /(?:write|create|generate)\s+(?:a|an)?\s*(?:post|copy|draft|content)?\s*(?:about|on)\s+(.+?)(?:\s+for\s+\w+|$)/i,
    /about\s+(.+?)(?:\s+for\s+\w+|$)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

export function isMeaningfulTopic(topic) {
  const text = String(topic || '').trim()
  if (!text) return false
  const generic = new Set(['内容', '一个内容', '简介', '文案', '帖子', '东西'])
  if (generic.has(text)) return false
  return text.length >= 2
}

export function rewriteDraft(draft, action) {
  const text = String(draft || '').trim()
  if (!text) return ''
  const isZh = /[\u4e00-\u9fa5]/.test(text)
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean)
  const channel = text.includes('小红书') ? 'xiaohongshu' : text.includes('微博') ? 'weibo' : text.includes('LinkedIn') ? 'linkedin' : text.includes('X') ? 'x' : 'general'
  if (action === 'shorter') {
    if (text.length <= 90) return text
    if (isZh) {
      const core = lines.filter((x) => !x.startsWith('#')).slice(0, 5).join('\n')
      return core.length <= 120 ? core : `${core.slice(0, 120)}...`
    }
    return `${text.slice(0, 140)}...`
  }
  if (action === 'stronger_cta') {
    if (channel === 'xiaohongshu') return `${text}\n\n想要我把这套流程做成可直接套用模板，评论区留「要模板」。`
    if (channel === 'linkedin') return `${text}\n\nIf useful, comment "template" and I’ll share an execution checklist.`
    return `${text}\n\n现在就开始，回复「我想试试」获取下一步清单。`
  }
  if (action === 'casual') {
    if (isZh) return `轻松版：\n${text.replace(/建议|推荐|核心|关键/g, '可以先').replace(/。/g, '～')}`
    return `Casual version:\n${text}`
  }
  return text
}

export function buildUserOutcome({ type, summary, rows, draft, error, meta }) {
  return {
    type,
    summary,
    rows: rows || [],
    draft: draft || null,
    error: error || null,
    meta: meta || {},
  }
}
