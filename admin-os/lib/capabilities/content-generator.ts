import { CapabilityInputEnvelope, CapabilityOutput } from '../router/types/capability'
import { ensureObjectParam, readStringParam } from '../utils/params'
import { getPromptBySlug } from '@/lib/prompts/prompt-registry'
import { resolveInputMemoryRefs } from '@/lib/capabilities/memory-refs'

type MemoryRef = {
  id?: string
  summary?: string
  style_constraints?: string[]
}

function buildFailure(reason: string): CapabilityOutput {
  return {
    capability_id: 'content_generator',
    capability_version: '1.0',
    status: 'failed',
    result: null,
    error: reason,
    evidence: { sources: [], doc_quotes: null, fallback_reason: reason },
    audit: {
      capability_id: 'content_generator',
      capability_version: '1.0',
      status: 'failed',
      used_skills: [],
    },
    used_skills: [],
    metadata: { rejected_reason: reason },
  }
}

function normalizeStyleConstraints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

function extractMemoryConstraints(memoryRefs: unknown): { constraints: string[]; sources: MemoryRef[] } {
  if (!Array.isArray(memoryRefs)) return { constraints: [], sources: [] }
  const sources: MemoryRef[] = []
  const constraints: string[] = []
  for (const ref of memoryRefs) {
    if (ref && typeof ref === 'object') {
      const r = ref as MemoryRef
      sources.push({ id: r.id, summary: r.summary, style_constraints: r.style_constraints })
      if (Array.isArray(r.style_constraints)) {
        constraints.push(...r.style_constraints.filter((c) => typeof c === 'string'))
      }
    }
  }
  return { constraints, sources }
}

function extractContextConstraints(context: unknown): string[] {
  if (!context || typeof context !== 'object') return []
  const constraints: string[] = []
  const ctx = context as Record<string, unknown>
  const brand = ctx.brand_guidelines
  if (brand && typeof brand === 'object') {
    const b = brand as Record<string, unknown>
    if (typeof b.tone === 'string') constraints.push(`品牌语气: ${b.tone}`)
    if (Array.isArray(b.dos)) constraints.push(...b.dos.filter((v) => typeof v === 'string').map((v) => `do: ${v}`))
    if (Array.isArray(b.donts)) constraints.push(...b.donts.filter((v) => typeof v === 'string').map((v) => `dont: ${v}`))
  }
  return constraints.slice(0, 8)
}

function toPlatformLabel(platform: string): string {
  const p = platform.toLowerCase()
  if (p === 'xiaohongshu') return '小红书'
  if (p === 'weibo') return '微博'
  if (p === 'linkedin') return 'LinkedIn'
  if (p === 'twitter' || p === 'x') return 'X'
  return '通用渠道'
}

function toToneLabel(tone: string): string {
  const t = tone.toLowerCase()
  if (t === 'professional') return '专业'
  if (t === 'casual') return '轻松'
  if (t === 'humorous') return '幽默'
  return '中性'
}

function toPlatformLabelEn(platform: string): string {
  const p = platform.toLowerCase()
  if (p === 'xiaohongshu') return 'Xiaohongshu'
  if (p === 'weibo') return 'Weibo'
  if (p === 'linkedin') return 'LinkedIn'
  if (p === 'twitter' || p === 'x') return 'X'
  return 'General'
}

function toToneLabelEn(tone: string): string {
  const t = tone.toLowerCase()
  if (t === 'professional') return 'Professional'
  if (t === 'casual') return 'Casual'
  if (t === 'humorous') return 'Humorous'
  return 'Neutral'
}

function buildOpeningByChannel(channel: string, topic: string) {
  const c = channel.toLowerCase()
  if (c === 'xiaohongshu') return `最近被问最多的问题，就是「${topic}」到底怎么做更稳。`
  if (c === 'weibo') return `一句话说清楚：${topic} 不该再靠拍脑袋决策。`
  if (c === 'linkedin') return `对增长团队来说，${topic} 最怕停留在概念层。`
  if (c === 'twitter' || c === 'x') return `我的观点很直接：${topic} 要可执行，不要只停留在讨论。`
  return `如果你也在关注「${topic}」，这条信息值得你看完。`
}

function buildCtaByGoal(goal: string) {
  const g = goal.toLowerCase()
  if (g.includes('conversion') || g.includes('signup')) return '回复「我要方案」，我发你一版可直接落地的执行模板。'
  if (g.includes('engagement')) return '如果这条对你有帮助，留言告诉我你最想先优化哪一步。'
  return '回复「开始」，我给你一版可直接执行的清单。'
}

function buildChannelHashtags(platform: string, topic: string): string {
  const base = [`#${topic.replace(/\s+/g, '')}`]
  const p = platform.toLowerCase()
  if (p === 'xiaohongshu') base.push('#运营增长', '#实操复盘')
  else if (p === 'weibo') base.push('#增长策略', '#内容运营')
  else if (p === 'linkedin') base.push('#Growth', '#ProductMarketing')
  else if (p === 'twitter' || p === 'x') base.push('#growth', '#buildinpublic')
  else base.push('#内容策略')
  return base.join(' ')
}

function buildPlatformBody(platform: string, toneLabel: string, topic: string) {
  const p = platform.toLowerCase()
  if (p === 'xiaohongshu') {
    return [
      `先说结论：${topic} 不需要大改流程，也能先拿到可验证结果。`,
      '我建议先做 3 步：明确目标指标、选一个低成本实验、48 小时复盘一次。',
      toneLabel === '专业' ? '核心是“先小后大”，用数据决定下一步投入。' : '先跑通一轮，再加码，真的会轻松很多。',
    ]
  }
  if (p === 'weibo') {
    return [
      `观点很简单：${topic} 的关键不是“做更多”，而是“做可验证”。`,
      '先把目标压缩到一个核心指标，再做一次短周期实验，效率会明显提高。',
      '别追求一步到位，追求每轮都有可复用结论。',
    ]
  }
  if (p === 'linkedin') {
    return [
      `在团队协作中，${topic} 最常见的问题是“信息很多，但动作不清晰”。`,
      '推荐方案：以目标指标为中心，定义单次实验边界，并在周内复盘决策。',
      '这能降低沟通成本，同时提升策略迭代速度。',
    ]
  }
  if (p === 'twitter' || p === 'x') {
    return [
      `${topic} works best when execution is measurable.`,
      'Pick 1 metric, run a small experiment, and review in 48 hours.',
      'Small loops beat big plans.',
    ]
  }
  return [
    `围绕 ${topic}，建议先用一个小范围实验拿到第一批可验证结果。`,
    '把复杂问题拆成可执行步骤，再逐步扩展有效动作。',
    '这样能降低试错成本，也更容易形成可复用方法。',
  ]
}

function buildTemplate({ topic, platform, tone, goal, styleConstraints, language }: {
  topic: string
  platform: string
  tone: string
  goal: string
  styleConstraints: string[]
  language?: string
}) {
  const isEnglish = String(language || '').toLowerCase() === 'en'
  if (isEnglish) {
    const platformLabel = toPlatformLabelEn(platform)
    const toneLabel = toToneLabelEn(tone)
    const structureHint =
      platform.toLowerCase() === 'linkedin'
        ? 'Structure: problem context -> method -> actionable step'
        : 'Structure: clear conclusion -> key actions -> CTA'
    const hashtags = buildChannelHashtags(platform, topic)
    const constraintsLine = styleConstraints.length ? `\nStyle constraints: ${styleConstraints.join('; ')}` : ''
    const body =
      platform.toLowerCase() === 'linkedin'
        ? [
            `Most teams discussing ${topic} struggle with execution clarity.`,
            'Start with one primary metric and run a bounded experiment this week.',
            'Review outcomes quickly and reuse what works.',
          ]
        : [
            `${topic} should be execution-first, not discussion-first.`,
            'Pick one measurable target and run a short feedback loop.',
            'Scale only after the first loop proves value.',
          ]
    const cta = 'Comment "template" if you want an execution checklist.'
    return {
      headline: `${platformLabel} | ${topic}`,
      bullets: [
        `Goal: ${goal}`,
        `Tone: ${toneLabel}`,
        styleConstraints.length ? `Constraints: ${styleConstraints.join('; ')}` : 'Constraints: none',
      ],
      copy: `【${platformLabel} Post Draft】\nTopic: ${topic}\nTone: ${toneLabel}\n${structureHint}\n\n${body.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n\n${cta}\n${hashtags}${constraintsLine}`,
    }
  }

  const platformLabel = toPlatformLabel(platform)
  const toneLabel = toToneLabel(tone)
  const headline = `${platformLabel}｜${topic}`
  const bullets = [
    `目标：${goal}`,
    `语气：${toneLabel}`,
    styleConstraints.length ? `约束：${styleConstraints.join('；')}` : '约束：无',
  ]
  const constraintsLine = styleConstraints.length ? `\n风格约束：${styleConstraints.join('；')}` : ''
  const opening = buildOpeningByChannel(platform, topic)
  const cta = buildCtaByGoal(goal)
  const bodyLines = buildPlatformBody(platform, toneLabel, topic)
  const hashtags = buildChannelHashtags(platform, topic)
  const structureHint =
    platform.toLowerCase() === 'xiaohongshu'
      ? '结构建议：痛点开场 → 3步方法 → 互动提问'
      : platform.toLowerCase() === 'linkedin'
        ? '结构建议：问题背景 → 方法框架 → 可执行建议'
        : '结构建议：结论先行 → 关键动作 → CTA'
  const copyV2 = `【${platformLabel}发布草稿】\n主题：${topic}\n语气：${toneLabel}\n${structureHint}\n\n${opening}\n\n${bodyLines.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n\n${cta}\n${hashtags}${constraintsLine}`
  return { headline, bullets, copy: copyV2 }
}

export async function contentGenerator(input: CapabilityInputEnvelope): Promise<CapabilityOutput> {
  let slots: Record<string, unknown>
  try {
    slots = ensureObjectParam(input.slots, 'slots')
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'invalid_slots'
    return buildFailure(reason)
  }

  let topic = ''
  try {
    topic = readStringParam(slots, 'topic', { required: true, label: 'topic' }) || ''
  } catch {
    return buildFailure('missing_topic')
  }
  if (!topic.trim()) {
    return buildFailure('missing_topic')
  }
  const tone = readStringParam(slots, 'tone') || 'neutral'
  const platform = readStringParam(slots, 'platform') || 'general'
  const goal = readStringParam(slots, 'goal') || 'awareness'
  const language = readStringParam(slots, 'language') || 'zh'
  const baseConstraints = normalizeStyleConstraints(slots['style_constraints'])
  const memoryRefs = resolveInputMemoryRefs(input)
  const memory = extractMemoryConstraints(memoryRefs)
  const contextConstraints = extractContextConstraints(input.context)
  const styleConstraints = [...new Set([...baseConstraints, ...memory.constraints, ...contextConstraints])]

  const result = buildTemplate({ topic, platform, tone, goal, styleConstraints, language })
  const prompt = await getPromptBySlug('content_generator')

  const used_skills: string[] = ['template-render', 'prompt-registry']

  const evidenceSources: unknown[] = [
    { source: 'slots', topic, platform, tone, goal, language, style_constraints: baseConstraints },
  ]
  if (prompt) {
    evidenceSources.push({
      source: 'prompt_filesystem',
      prompt_slug: prompt.prompt.slug,
      prompt_version: prompt.prompt.version,
      prompt_source: prompt.source,
      prompt_hash: prompt.hash,
    })
  }
  if (memory.sources.length) {
    evidenceSources.push({ source: 'memory_refs', refs: memory.sources })
  }
  if (contextConstraints.length) {
    evidenceSources.push({ source: 'context', constraints: contextConstraints })
  }

  return {
    capability_id: 'content_generator',
    capability_version: '1.0',
    status: 'success',
    result,
    error: undefined,
    evidence: {
      sources: evidenceSources,
      doc_quotes: null,
      fallback_reason: undefined,
    },
    audit: {
      capability_id: 'content_generator',
      capability_version: '1.0',
      status: 'success',
      used_skills,
    },
    used_skills,
    metadata: prompt
      ? {
          prompt_slug: prompt.prompt.slug,
          prompt_version: prompt.prompt.version,
          prompt_source: prompt.source,
          prompt_hash: prompt.hash,
        }
      : {},
  }
}
