import { describe, expect, it } from 'vitest'
import { renderSqlTemplate } from '@/lib/sql-templates'

describe('business yield SQL templates', () => {
  it('supports ranking filters for chain/protocol/vault keyword', () => {
    const rendered = renderSqlTemplate('business_yield_dimension_ranking', {
      days: 7,
      date_from: '2026-03-01',
      date_to: '2026-03-31',
      dimension: 'protocol',
      limit: 3,
      chain: 'arbitrum',
      protocol: 'Morpho',
      vault_keyword: 'Maxshot USDC V2',
    })

    expect(rendered.sql).toContain('$2::date')
    expect(rendered.sql).toContain('$3::date')
    expect(rendered.sql).toContain('chain ILIKE')
    expect(rendered.sql).toContain('protocol ILIKE')
    expect(rendered.sql).toContain('market_name ILIKE')
    expect(rendered.params).toEqual(['protocol', '2026-03-01', '2026-03-31', 7, 'arbitrum', 'Morpho', 'Maxshot USDC V2', 3])
  })

  it('supports trend filters for chain/protocol/vault keyword', () => {
    const rendered = renderSqlTemplate('business_yield_daily_trend', {
      days: 7,
      date_from: '2026-03-01',
      date_to: '2026-03-31',
      timezone: 'Asia/Shanghai',
      chain: 'base',
      protocol: 'Morpho',
      vault_keyword: 'Maxshot',
    })

    expect(rendered.sql).toContain('$2::date')
    expect(rendered.sql).toContain('$3::date')
    expect(rendered.sql).toContain('m.chain ILIKE')
    expect(rendered.sql).toContain('m.protocol ILIKE')
    expect(rendered.sql).toContain('a.market ILIKE')
    expect(rendered.params).toEqual(['Asia/Shanghai', '2026-03-01', '2026-03-31', 7, 'base', 'Morpho', 'Maxshot'])
  })
})
