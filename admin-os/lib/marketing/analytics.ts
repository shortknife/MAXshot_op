export type MarketingTags = {
  topic: string
  style: string
  channel: string
  time_window: string
}

export type MarketingFeedbackInput = MarketingTags & {
  impressions: number
  interactions: number
  conversions: number
}

export type MarketingFeedbackSummary = {
  engagement_rate: number
  conversion_rate: number
  performance_tier: 'high' | 'mid' | 'low'
  reason_code: string
  recommendations: string[]
}

export function inferMarketingTagsFromQuery(rawQuery: string): Partial<MarketingTags> {
  const q = String(rawQuery || '').toLowerCase()
  const hasXToken = /(^|[^a-z0-9])x([^a-z0-9]|$)/.test(q)
  const channel = q.includes('linkedin')
    ? 'linkedin'
    : q.includes('twitter') || hasXToken || q.includes('推特')
      ? 'twitter'
      : q.includes('小红书')
        ? 'xiaohongshu'
        : q.includes('微博')
          ? 'weibo'
          : 'general'
  const style = q.includes('轻松') || q.includes('口语')
    ? 'casual'
    : q.includes('专业') || q.includes('正式')
      ? 'professional'
      : q.includes('幽默') || q.includes('meme')
        ? 'humorous'
        : 'neutral'
  const time_window = q.includes('早') || q.includes('morning')
    ? 'morning'
    : q.includes('晚') || q.includes('evening') || q.includes('night')
      ? 'evening'
      : 'all_day'
  return { channel, style, time_window }
}

export function computeFeedbackSummary(input: MarketingFeedbackInput): MarketingFeedbackSummary {
  const safeImpressions = Math.max(1, Number(input.impressions || 0))
  const interactions = Math.max(0, Number(input.interactions || 0))
  const conversions = Math.max(0, Number(input.conversions || 0))
  const engagement = Number((interactions / safeImpressions).toFixed(4))
  const conversion = Number((conversions / safeImpressions).toFixed(4))

  let performance_tier: 'high' | 'mid' | 'low' = 'low'
  let reason_code = 'low_engagement'
  const recommendations: string[] = []

  if (engagement >= 0.08 || conversion >= 0.02) {
    performance_tier = 'high'
    reason_code = 'high_performance'
    recommendations.push('保持当前话题和渠道组合，扩大曝光量。')
  } else if (engagement >= 0.03 || conversion >= 0.01) {
    performance_tier = 'mid'
    reason_code = 'medium_performance'
    recommendations.push('保持主题，建议强化 CTA 并测试发布时间。')
  } else {
    recommendations.push('建议更换开头钩子，降低信息密度并提升互动引导。')
  }

  if (input.channel === 'linkedin' && input.style === 'casual') {
    recommendations.push('LinkedIn 场景建议适度提升专业表达。')
  }
  if (input.channel === 'xiaohongshu' && input.style === 'professional') {
    recommendations.push('小红书场景建议更生活化表达。')
  }

  return {
    engagement_rate: engagement,
    conversion_rate: conversion,
    performance_tier,
    reason_code,
    recommendations,
  }
}

export function buildCycleReport(feedbackEvents: Array<Record<string, unknown>>) {
  const total = feedbackEvents.length
  if (!total) {
    return {
      total_feedback: 0,
      avg_engagement_rate: 0,
      avg_conversion_rate: 0,
      top_channel: null,
      top_style: null,
      top_topic: null,
      recommendations: ['当前周期暂无反馈数据，先补齐发布后的反馈采集。'],
    }
  }

  let engagementTotal = 0
  let conversionTotal = 0
  const channelCounter: Record<string, number> = {}
  const styleCounter: Record<string, number> = {}
  const topicCounter: Record<string, number> = {}

  for (const item of feedbackEvents) {
    const channel = String(item.channel || 'unknown')
    const style = String(item.style || 'unknown')
    const topic = String(item.topic || 'unknown')
    const er = Number(item.engagement_rate || 0)
    const cr = Number(item.conversion_rate || 0)
    channelCounter[channel] = (channelCounter[channel] || 0) + 1
    styleCounter[style] = (styleCounter[style] || 0) + 1
    topicCounter[topic] = (topicCounter[topic] || 0) + 1
    engagementTotal += er
    conversionTotal += cr
  }

  const pickTop = (counter: Record<string, number>) =>
    Object.entries(counter).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const avgEngagement = Number((engagementTotal / total).toFixed(4))
  const avgConversion = Number((conversionTotal / total).toFixed(4))

  const recommendations: string[] = []
  if (avgEngagement < 0.03) recommendations.push('平均互动率偏低，优先优化首屏钩子与提问式结尾。')
  if (avgConversion < 0.01) recommendations.push('平均转化偏低，建议强化 CTA 并增加利益点。')
  if (!recommendations.length) recommendations.push('当前表现稳定，建议扩大优胜渠道投放。')

  return {
    total_feedback: total,
    avg_engagement_rate: avgEngagement,
    avg_conversion_rate: avgConversion,
    top_channel: pickTop(channelCounter),
    top_style: pickTop(styleCounter),
    top_topic: pickTop(topicCounter),
    recommendations,
  }
}
