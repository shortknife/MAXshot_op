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

  it('includes marketing draft body in Telegram reply', () => {
    const text = toTelegramReply({
      success: true,
      delivery_envelope: {
        type: 'marketing',
        summary: '已生成草稿，你可以继续改写语气或缩短长度。',
        draft: '这里是草稿正文',
        meta: { next_actions: ['点击缩短'] },
      },
    })

    expect(text).toContain('已生成草稿')
    expect(text).toContain('这里是草稿正文')
    expect(text).toContain('点击缩短')
  })
})
