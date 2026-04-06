import { describe, expect, it } from 'vitest'

import { applyClarificationPosture, loadCustomerClarificationPosture } from '@/lib/customers/clarification'

describe('customer clarification posture', () => {
  it('loads filesystem clarification posture and applies guided defaults', async () => {
    const posture = await loadCustomerClarificationPosture('nexa-demo')
    expect(posture).toMatchObject({
      customer_id: 'nexa-demo',
      clarification_style: 'guided',
      option_style: 'guided',
    })
    const adjusted = applyClarificationPosture({
      question: 'Which time range do you want?',
      options: ['最近7天'],
      posture,
    })
    expect(adjusted.question).toContain('补一个关键上下文')
    expect(adjusted.options).toEqual([
      '补一个更具体的上下文',
      '继续追问这个工作流',
      '切换到当前 customer workspace',
    ])
  })
})
