import { describe, expect, it } from 'vitest'
import {
  extractExecutionId,
  parseCompareVaultKeywords,
  parseVaultKeyword,
  parseYieldRankingDimension,
  wantsYieldExtremes,
  wantsYieldTrend,
} from '@/lib/capabilities/business-query-planner'
import { PARENT_PROJECT_QUERY_CORPUS } from '@/lib/capabilities/__fixtures__/parent-project-query-corpus'

describe('parent project query corpus', () => {
  it('keeps a curated regression corpus from the mother project', () => {
    expect(PARENT_PROJECT_QUERY_CORPUS.length).toBeGreaterThanOrEqual(10)
  })

  it('maps representative ranking and trend prompts into current planner heuristics', () => {
    expect(parseYieldRankingDimension('最近7天按链 APY 排名')).toBe('chain')
    expect(parseYieldRankingDimension('最近7天按协议 APY 排名')).toBe('protocol')
    expect(wantsYieldTrend('最近7天 APY 走势如何？')).toBe(true)
    expect(wantsYieldExtremes('最近7天 APY 哪天最高，哪天最低？')).toBe(true)
  })

  it('preserves compare cleaning behavior for inherited corpus prompts', () => {
    expect(parseCompareVaultKeywords('比较 arbitrum 的 Maxshot USDC V2 和 morpho 的 dForce USDC 的 APY')).toEqual([
      'Maxshot USDC V2',
      'dForce USDC',
    ])
    expect(parseVaultKeyword('Show top 3 vaults by APY')).toBeNull()
  })

  it('still extracts explicit execution ids from operational follow-ups', () => {
    expect(extractExecutionId('请查看 execution d68d7c34-71ee-4553-98f6-b03d634d4136 详情')).toBe(
      'd68d7c34-71ee-4553-98f6-b03d634d4136'
    )
  })
})
