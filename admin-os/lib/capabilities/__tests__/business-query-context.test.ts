import { describe, expect, it } from 'vitest'
import { parseBusinessFilters } from '@/lib/capabilities/business-query-context'

describe('parseBusinessFilters', () => {
  it('captures 本周 as a concrete date range', () => {
    const filters = parseBusinessFilters('本周 APY 走势如何')
    expect(filters.date_from).toBeTruthy()
    expect(filters.date_to).toBeTruthy()
  })

  it('captures 上月 as a concrete month range', () => {
    const filters = parseBusinessFilters('上月 TVL 是多少')
    expect(filters.date_from).toBeTruthy()
    expect(filters.date_to).toBeTruthy()
  })

  it('captures 昨天 as an exact-day range', () => {
    const filters = parseBusinessFilters('昨天有调仓吗')
    expect(filters.date_from).toBeTruthy()
    expect(filters.date_to).toBe(filters.date_from)
  })
})
