import type { BusinessFilters } from '@/lib/capabilities/business-query-context'

export function toApyPercent(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return NaN
  // Some sources store APY as ratio (0.042), others as percent (4.2)
  return Math.abs(num) <= 1 ? num * 100 : num
}

function isNonProdChain(value: string): boolean {
  const chain = value.toLowerCase()
  return chain.includes('sepolia') || chain.includes('devnet') || chain.includes('testnet') || chain.includes('staging') || chain.includes('sandbox')
}

function isNonProdVaultName(value: string): boolean {
  const name = value.toLowerCase()
  return name.includes('testnet') || name.includes('devnet') || name.includes('staging') || name.includes('sandbox') || name.includes('test')
}

export function parseTimestampForFilter(value: unknown): number | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  // day_local from SQL template is date-only; interpret in Asia/Shanghai to match product semantics.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const ts = Date.parse(`${raw}T00:00:00+08:00`)
    return Number.isFinite(ts) ? ts : null
  }
  const ts = Date.parse(raw)
  return Number.isFinite(ts) ? ts : null
}

export function applyBusinessFilters(
  rows: Record<string, unknown>[],
  filters: BusinessFilters
): { rows: Record<string, unknown>[]; nonProdExcluded: number } {
  let nonProdExcluded = 0
  const filtered = rows.filter((r) => {
    const chain = String(r.chain_name || r.chain || '').toLowerCase()
    if (!filters.includeTestnets) {
      if (chain && isNonProdChain(chain)) {
        nonProdExcluded += 1
        return false
      }
      const vaultName = String(r.vault_name || r.vault || '').toLowerCase()
      if (vaultName && isNonProdVaultName(vaultName)) {
        nonProdExcluded += 1
        return false
      }
    }
    if (filters.chain) {
      if (!chain.includes(filters.chain)) return false
    }
    if (filters.protocol) {
      const protocol = String(r.protocol_name || r.protocol || '').toLowerCase()
      if (!protocol.includes(filters.protocol)) return false
    }
    if (filters.time_window_days && filters.time_window_days > 0) {
      const tsRaw = r.created_at || r.updated_at || r.decision_timestamp || r.day_local || null
      if (!tsRaw) return false
      const ts = parseTimestampForFilter(tsRaw)
      if (ts === null) return false
      const diffMs = Date.now() - ts
      const maxMs = filters.time_window_days * 24 * 60 * 60 * 1000
      if (diffMs > maxMs) return false
    }
    if (filters.date_from || filters.date_to) {
      const tsRaw = r.created_at || r.updated_at || r.decision_timestamp || r.day_local || null
      if (!tsRaw) return false
      const ts = parseTimestampForFilter(tsRaw)
      if (ts === null) return false
      if (filters.date_from) {
        const fromTs = parseTimestampForFilter(filters.date_from)
        if (fromTs !== null && ts < fromTs) return false
      }
      if (filters.date_to) {
        const toTs = parseTimestampForFilter(filters.date_to)
        if (toTs !== null && ts > toTs + 24 * 60 * 60 * 1000 - 1) return false
      }
    }
    return true
  })
  return { rows: filtered, nonProdExcluded }
}

export function summarizeFilterSuffix(filters: BusinessFilters, nonProdExcluded: number, invalidMetricExcluded: number): string {
  const parts: string[] = []
  if (filters.chain) parts.push(`chain=${filters.chain}`)
  if (filters.protocol) parts.push(`protocol=${filters.protocol}`)
  if (filters.time_window_days) parts.push(`time_window=${filters.time_window_days}d`)
  if (filters.date_from || filters.date_to) parts.push(`date_range=${filters.date_from || '?'}~${filters.date_to || '?'}`)
  if (!filters.includeTestnets) parts.push('默认排除 testnet/devnet')
  if (nonProdExcluded > 0) parts.push(`已过滤非生产链 ${nonProdExcluded} 条`)
  if (invalidMetricExcluded > 0) parts.push(`已过滤 is_available=false 或 TVL<=0 的指标 ${invalidMetricExcluded} 条`)
  return parts.length ? `（过滤条件：${parts.join(', ')}）` : ''
}

export function applyYieldQualityFilter(rows: Record<string, unknown>[]): { rows: Record<string, unknown>[]; excluded: number } {
  if (!rows.length) return { rows: [], excluded: 0 }
  const sample = rows[0]
  const hasTvlField = Object.prototype.hasOwnProperty.call(sample, 'tvl')
  const hasAvailabilityField = Object.prototype.hasOwnProperty.call(sample, 'is_available')
  if (!hasTvlField && !hasAvailabilityField) {
    return { rows, excluded: 0 }
  }
  let excluded = 0
  const filtered = rows.filter((r) => {
    const isAvailable = r.is_available === undefined ? true : Boolean(r.is_available)
    const tvl = Number(r.tvl ?? 0)
    const keep = isAvailable && Number.isFinite(tvl) && tvl > 0
    if (!keep) excluded += 1
    return keep
  })
  return { rows: filtered, excluded }
}
