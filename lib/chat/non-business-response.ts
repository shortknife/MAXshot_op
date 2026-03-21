import { buildOpsHighlights, buildUserOutcome, mapErrorToUserMessage, summarizeRows } from '@/lib/user-chat-core'
import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { inferLegacyIntentTypeFromCapabilityIds } from '@/lib/router/capability-catalog'

type PromptMeta = { slug?: string; version?: string; source?: string; hash?: string } | null | undefined

function resolveCanonicalIntent(params: {
  intentType?: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
}) {
  if (params.canonicalIntentType) return params.canonicalIntentType
  const inferredIntent = inferLegacyIntentTypeFromCapabilityIds([
    ...(params.matchedCapabilityIds || []),
    params.primaryCapabilityId,
  ])
  return toCanonicalIntentType(inferredIntent !== 'out_of_scope' ? inferredIntent : params.intentType || 'out_of_scope')
}

export function buildOpsQueryFailureResponse(params: {
  errorCode?: string
  intentType?: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
}) {
  return {
    success: false,
    data: buildUserOutcome({
      type: 'ops',
      summary: mapErrorToUserMessage(params.errorCode),
      error: params.errorCode,
      meta: {
        intent_type: params.intentType || 'ops_query',
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'rejected',
      },
    }),
  }
}

export function buildOpsQuerySuccessResponse(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  rows: unknown[]
  templateId: string
}) {
  return {
    success: true,
    data: buildUserOutcome({
      type: 'ops',
      summary: summarizeRows(params.rows, params.templateId),
      rows: params.rows,
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'answered',
        intent_prompt: params.promptMeta || null,
        template_id: params.templateId,
        highlights: buildOpsHighlights(params.rows, params.templateId),
        next_actions: ['继续追问一个维度', '切换时间范围', '导出结果复盘'],
      },
    }),
  }
}

export function buildContentBriefFailureResponse(params: {
  errorCode?: string
  intentType?: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
}) {
  return {
    success: false,
    data: buildUserOutcome({
      type: 'marketing',
      summary: mapErrorToUserMessage(params.errorCode),
      error: params.errorCode,
      meta: {
        intent_type: params.intentType || 'content_brief',
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'rejected',
      },
    }),
  }
}

export function buildContentBriefSuccessResponse(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  draft: string
  tags: {
    topic: string
    style: string
    channel: string
    time_window: string
  }
  contentPromptMeta: unknown
}) {
  return {
    success: true,
    data: buildUserOutcome({
      type: 'marketing',
      summary: '已生成草稿，你可以继续改写语气或缩短长度。',
      draft: params.draft,
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'draft_generated',
        intent_prompt: params.promptMeta || null,
        content_prompt: params.contentPromptMeta || null,
        rewrite_actions: ['shorter', 'stronger_cta', 'casual'],
        next_actions: ['点击缩短', '点击强化 CTA', '复制草稿到营销渠道'],
        tags: params.tags,
      },
    }),
  }
}

export function buildQnaSuccessResponse(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  qnaPromptMeta: unknown
  answer: string
}) {
  return {
    success: true,
    data: buildUserOutcome({
      type: 'qna',
      summary: params.answer,
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        exit_type: 'answered',
        intent_prompt: params.promptMeta || null,
        qna_prompt: params.qnaPromptMeta || null,
      },
    }),
  }
}
