import { describe, expect, it } from 'vitest'
import { getBusinessSessionContextSnapshot, saveBusinessSessionContext } from '@/lib/chat/session-context'

describe('business session context', () => {
  it('persists compare targets for follow-up reuse', () => {
    const sessionId = 'session-compare-targets'

    saveBusinessSessionContext({
      sessionId,
      scope: 'yield',
      queryMode: 'metrics',
      filters: {
        chain: 'arbitrum',
        protocol: 'morpho',
        compare_targets: ['Maxshot USDC V2', 'dForce USDC'],
      },
      aggregation: 'avg',
    })

    expect(getBusinessSessionContextSnapshot(sessionId)).toMatchObject({
      chain: 'arbitrum',
      protocol: 'morpho',
      compare_targets: ['Maxshot USDC V2', 'dForce USDC'],
    })
  })
})
