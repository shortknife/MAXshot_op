type CapabilityOutput = {
  capability_id?: string
  status?: string
  error?: string
  evidence?: { fallback_reason?: string }
  metadata?: { rejected_reason?: string; fallback_reason?: string }
}

type ExecutionLite = {
  execution_id: string
  status?: string
  intent_name?: string | null
  result?: { capability_outputs?: CapabilityOutput[] } | null
  created_at?: string
}

export type HypothesisItem = {
  hypothesis_id: string
  title: string
  statement: string
  trigger_signal: string
  confidence: 'low' | 'medium' | 'high'
  suggested_action: string
  expected_outcome: string
}

function randomId() {
  return `hyp_${Math.random().toString(36).slice(2, 10)}`
}

export function buildExecutionHypotheses(execution: ExecutionLite): HypothesisItem[] {
  const outputs = execution.result?.capability_outputs || []
  const failed = outputs.filter((o) => o.status && o.status !== 'success')
  const fallbacks = outputs
    .map((o) => o.evidence?.fallback_reason || o.metadata?.fallback_reason || o.metadata?.rejected_reason)
    .filter(Boolean) as string[]

  const list: HypothesisItem[] = []

  if (failed.length > 0) {
    list.push({
      hypothesis_id: randomId(),
      title: '能力失败主因',
      statement: `本次执行存在 ${failed.length} 个失败 capability，优先处理最早失败点可提升整体成功率。`,
      trigger_signal: 'capability_failed',
      confidence: failed.length >= 2 ? 'high' : 'medium',
      suggested_action: '检查失败 capability 的输入槽位与前置依赖，先修第一个失败点。',
      expected_outcome: '执行成功率提升，失败链路缩短。',
    })
  }

  if (fallbacks.length > 0) {
    list.push({
      hypothesis_id: randomId(),
      title: 'Fallback 触发频繁',
      statement: `检测到 fallback 原因：${Array.from(new Set(fallbacks)).join(', ')}。`,
      trigger_signal: 'fallback_detected',
      confidence: 'medium',
      suggested_action: '优先补齐缺失槽位或上游上下文，减少 fallback 触发。',
      expected_outcome: '答案可读性与稳定性提升。',
    })
  }

  if (!list.length) {
    list.push({
      hypothesis_id: randomId(),
      title: '当前链路稳定',
      statement: '本次执行未出现失败与 fallback，可进入轻量优化阶段。',
      trigger_signal: 'nominal',
      confidence: 'high',
      suggested_action: '保持模板与参数策略，扩大样本观察。',
      expected_outcome: '维持稳定并逐步提升效率。',
    })
  }

  return list
}

export function summarizeHypothesisPortfolio(items: HypothesisItem[]) {
  const high = items.filter((i) => i.confidence === 'high').length
  const medium = items.filter((i) => i.confidence === 'medium').length
  const low = items.filter((i) => i.confidence === 'low').length
  return {
    total: items.length,
    confidence_breakdown: { high, medium, low },
    top_title: items[0]?.title || null,
  }
}

