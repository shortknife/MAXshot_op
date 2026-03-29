import { describe, expect, it } from 'vitest'

import { toTelegramReply } from '@/app/api/tg/webhook/route'

describe('Step9 TG delivery reply', () => {
  it('prefers delivery envelope summary and next actions', () => {
    const text = toTelegramReply({
      success: true,
      delivery_envelope: {
        summary: '已返回 3 组 Vault APY 数据。',
        meta: { next_actions: ['继续问 TVL', '看最近7天'] },
      },
      data: {
        summary: '旧 summary',
        meta: { next_actions: ['旧动作'] },
      },
    })

    expect(text).toContain('已返回 3 组 Vault APY 数据。')
    expect(text).toContain('继续问 TVL')
    expect(text).not.toContain('旧 summary')
  })
})
