import { describe, it, expect } from 'vitest'
import { contentGenerator } from '../content-generator'

describe('content_generator', () => {
  it('builds template output from slots', async () => {
    const output = await contentGenerator({
      slots: { topic: 'L2 scaling', platform: 'twitter', tone: 'professional', goal: 'awareness' },
      memory_refs: [],
    } as any)

    expect(output.status).toBe('success')
    const result = output.result as any
    expect(result.headline).toContain('TWITTER')
    expect(result.copy).toContain('L2 scaling')
    expect(output.evidence.sources[0]).toMatchObject({ source: 'slots' })
  })

  it('appends memory style constraints', async () => {
    const output = await contentGenerator({
      slots: { topic: 'DeFi', style_constraints: ['Short sentences'] },
      memory_refs: [{ id: 'mem-1', summary: 'Keep tone crisp', style_constraints: ['No hashtags'] }],
    } as any)

    expect(output.status).toBe('success')
    const result = output.result as any
    expect(result.bullets.join(' ')).toContain('No hashtags')
    expect(output.evidence.sources.length).toBe(2)
  })

  it('fails when topic missing', async () => {
    const output = await contentGenerator({ slots: {}, memory_refs: [] } as any)
    expect(output.status).toBe('failed')
    expect(output.evidence.fallback_reason).toBe('missing_topic')
  })
})
