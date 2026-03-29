import { describe, expect, it } from 'vitest'

import { buildConversationContext } from '../index'
import { registerClarificationTurn, clearClarificationState } from '../../query-clarification'
import { saveBusinessSessionContext } from '../../session-context'

describe('Step 2 session harness', () => {
  it('keeps clarification replies as raw user input and marks fallback source when llm is unavailable', async () => {
    const sessionId = 'step2-test-clarification'
    clearClarificationState(sessionId)
    registerClarificationTurn({
      sessionId,
      rawQuery: '当前 vault APY 怎么样？',
      previousTurns: 0,
    })

    const result = await buildConversationContext({
      rawQuery: '最近7天',
      sessionId,
    })

    expect(result.intentQuery).toBe('最近7天')
    expect(result.turnRelation.type).toBe('clarification_reply')
    expect(result.turnRelation.source).toBe('fallback')
    expect(result.contextEnvelope.conversation_context.pending_clarification.exists).toBe(true)
    expect(result.contextEnvelope.conversation_context.recent_turns_summary).toEqual([
      { role: 'user', content: '当前 vault APY 怎么样？' },
    ])
  })

  it('does not let a new topic get swallowed by stale clarification state', async () => {
    const sessionId = 'step2-test-new-topic'
    clearClarificationState(sessionId)
    registerClarificationTurn({
      sessionId,
      rawQuery: '当前 vault APY 怎么样？',
      previousTurns: 0,
    })

    const result = await buildConversationContext({
      rawQuery: '你能描述什么是MAXshot么？',
      sessionId,
    })

    expect(result.turnRelation.type).toBe('new_topic_same_window')
    expect(result.turnRelation.source).toBe('fallback')
    expect(result.followUpContextApplied).toBe(false)
    expect(result.intentQuery).toBe('你能描述什么是MAXshot么？')
  })

  it('does not treat arbitrary short labels as clarification replies', async () => {
    const sessionId = 'step2-test-short-label'
    clearClarificationState(sessionId)
    registerClarificationTurn({
      sessionId,
      rawQuery: '当前 vault APY 怎么样？',
      previousTurns: 0,
    })

    const result = await buildConversationContext({
      rawQuery: 'Morpho',
      sessionId,
    })

    expect(result.turnRelation.type).not.toBe('clarification_reply')
  })

  it('keeps continuation semantics without fabricating a patched intent query', async () => {
    const sessionId = 'step2-test-continuation'
    saveBusinessSessionContext({
      sessionId,
      scope: 'yield',
      queryMode: 'metrics',
      filters: { time_window_days: 7, chain: 'ethereum' },
      aggregation: 'avg',
    })

    const result = await buildConversationContext({
      rawQuery: '那 arbitrum 呢？',
      sessionId,
    })

    expect(result.turnRelation.type).toBe('continuation')
    expect(result.followUpContextApplied).toBe(true)
    expect(result.intentQuery).toBe('那 arbitrum 呢？')
    expect(result.contextEnvelope.policy_decision.inherit_context).toBe(true)
  })
})
