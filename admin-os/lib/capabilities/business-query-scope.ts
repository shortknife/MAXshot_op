import type { BusinessScope as Scope } from '@/lib/capabilities/business-query-runtime'

export function toBusinessScope(value: unknown): Scope {
  const s = String(value || '').toLowerCase()
  if (s === 'vault') return 'vault'
  if (s === 'execution') return 'execution'
  if (s === 'yield') return 'yield'
  if (s === 'allocation') return 'allocation'
  if (s === 'rebalance') return 'rebalance'
  return 'unknown'
}
