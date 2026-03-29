import { describe, expect, it } from 'vitest'
import { buildBusinessHighlights } from '@/lib/user-chat-core.js'

describe('business highlights query contract awareness', () => {
  it('uses ranking contract to label top chain highlights', () => {
    const highlights = buildBusinessHighlights(
      [
        { dimension_value: 'arbitrum', avg_apy_pct: 4.12 },
        { dimension_value: 'base', avg_apy_pct: 3.91 },
      ],
      'yield',
      {
        question_shape: 'ranking_by_dimension',
        ranking_dimension: 'chain',
      }
    )

    expect(highlights[1]).toEqual({ label: 'Top 链', value: 'arbitrum' })
  })

  it('uses tvl contract to simplify daily tvl highlights', () => {
    const highlights = buildBusinessHighlights(
      [
        { day_local: '2026-03-20', avg_daily_tvl: 100 },
        { day_local: '2026-03-21', avg_daily_tvl: 200 },
      ],
      'yield',
      {
        metric: 'tvl',
      }
    )

    expect(highlights).toEqual([
      { label: '天数', value: '2' },
      { label: '平均日TVL', value: '150.00' },
    ])
  })
})
