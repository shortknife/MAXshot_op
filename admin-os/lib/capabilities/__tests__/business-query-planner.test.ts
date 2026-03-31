import { describe, expect, it } from 'vitest'
import { parseCompareVaultKeywords, parseVaultKeyword } from '@/lib/capabilities/business-query-planner'

describe('parseVaultKeyword', () => {
  it('does not mistake chain/protocol/time phrases for vault names', () => {
    expect(parseVaultKeyword('最近7天 arbitrum morpho 的 APY')).toBeNull()
  })

  it('keeps explicit vault names even when chain context is present', () => {
    expect(parseVaultKeyword('最近7天 arbitrum Maxshot USDC V2 的 APY')).toBe('Maxshot USDC V2')
  })

  it('cleans chain and protocol context from compare targets', () => {
    expect(parseCompareVaultKeywords('比较 arbitrum 的 Maxshot USDC V2 和 morpho 的 dForce USDC 的 APY')).toEqual([
      'Maxshot USDC V2',
      'dForce USDC',
    ])
  })
})
