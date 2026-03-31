import { describe, expect, it } from 'vitest'
import { extractRelativeTimeSlots } from '@/lib/time/range-slots'

describe('extractRelativeTimeSlots', () => {
  const now = new Date('2026-03-31T12:00:00+08:00')

  it('parses 本周 into a concrete Asia/Shanghai range', () => {
    expect(extractRelativeTimeSlots('本周 APY', now)).toMatchObject({
      date_from: '2026-03-30',
      date_to: '2026-03-31',
      timezone: 'Asia/Shanghai',
    })
  })

  it('parses 上月 into a concrete calendar month range', () => {
    expect(extractRelativeTimeSlots('上月 TVL', now)).toMatchObject({
      calendar_year: 2026,
      calendar_month: 2,
      date_from: '2026-02-01',
      date_to: '2026-02-28',
      timezone: 'Asia/Shanghai',
    })
  })

  it('parses 昨天 into an exact day', () => {
    expect(extractRelativeTimeSlots('昨天有调仓吗', now)).toMatchObject({
      exact_day: '2026-03-30',
      date_from: '2026-03-30',
      date_to: '2026-03-30',
      timezone: 'Asia/Shanghai',
    })
  })
})
