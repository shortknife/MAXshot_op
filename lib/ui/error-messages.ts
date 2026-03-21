export function humanizeWriteBlockedReason(code: string | null): string {
  if (!code) return 'ready'
  if (code === 'WRITE_DISABLED') return 'Write disabled'
  if (code === 'MISSING_OPERATOR') return 'Missing operator_id'
  if (code === 'MISSING_CONFIRM_TOKEN') return 'Missing confirm_token'
  if (code === 'WRITE_NOT_APPROVED') return 'Write approval unchecked'
  return code
}

export function humanizeWriteError(raw: string): string {
  const text = String(raw || '')
  if (text.includes('write_blocked_invalid_token')) return '写入被拦截：confirm_token 无效'
  if (text.includes('write_blocked_missing_operator')) return '写入被拦截：缺少 operator_id'
  if (text.includes('write_blocked_missing_confirm_token')) return '写入被拦截：缺少 confirm_token'
  return text
}

export function humanizeOutcomeError(raw: string): string {
  const text = String(raw || '')
  if (text.includes('missing_execution_id')) return '缺少 execution_id'
  if (text.includes('execution_not_found')) return 'execution_id 不存在'
  if (text.includes('Failed to load outcome delta')) return 'Outcome Delta 加载失败'
  if (text.includes('Failed to load snapshot')) return 'Snapshot 加载失败'
  return humanizeWriteError(text)
}

export function humanizeMarketingError(raw: string): string {
  const text = String(raw || '')
  if (text.includes('missing_execution_id')) return '缺少 execution_id'
  if (text.includes('execution_not_found')) return 'execution_id 不存在'
  if (text.includes('execution_update_failed')) return '写入审计日志失败'
  if (text.includes('cycle_report_load_failed')) return '周期报告加载失败'
  return humanizeWriteError(text)
}

export function humanizeOpsError(raw: string): string {
  const text = String(raw || '')
  if (text.includes('Missing raw_query')) return '缺少 raw_query'
  if (text.includes('Gate did not pass')) return '请求未通过安全门禁'
  return humanizeWriteError(text)
}

