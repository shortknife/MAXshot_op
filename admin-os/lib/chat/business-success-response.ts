import { buildBusinessNextActionsByMode, buildBusinessNextActionsFromContract, buildEvidenceChain } from '@/lib/chat/query-strategy'
import { buildBusinessHighlights, buildUserOutcome } from '@/lib/user-chat-core'
import { toCanonicalIntentType } from '@/lib/intent-analyzer/intent-taxonomy'
import { inferLegacyIntentTypeFromCapabilityIds } from '@/lib/router/capability-catalog'

type PromptMeta = { slug?: string; version?: string; source?: string; hash?: string } | null | undefined

function resolveCanonicalIntent(params: {
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
}) {
  if (params.canonicalIntentType) return params.canonicalIntentType
  const inferredIntent = inferLegacyIntentTypeFromCapabilityIds([
    ...(params.matchedCapabilityIds || []),
    params.primaryCapabilityId,
  ])
  return toCanonicalIntentType(inferredIntent !== 'out_of_scope' ? inferredIntent : params.intentType)
}

type BusinessSuccessResponseParams = {
  summary: string
  previewRows: unknown[]
  intentType: string
  canonicalIntentType?: string
  primaryCapabilityId?: string | null
  matchedCapabilityIds?: string[]
  promptMeta: PromptMeta
  scope: string | null
  followUpContextApplied: boolean
  queryMode: 'metrics' | 'investigate' | 'lookup'
  metricSemantics: string
  clarificationAutoAssumed: boolean
  interpretation: string | null
  resolvedScope: string
  intentQuery: string
  evidence: unknown[]
  narrativeEvidence: unknown[]
  explanation: string | null
  reasonTags: string[]
  reasonBreakdown: { main_reason: string; secondary_reasons: string[]; evidence_count: number }
  reasonBreakdownZh: { main_reason: string; secondary_reasons: string[]; evidence_count: number }
  rows: Record<string, unknown>[]
  filtersApplied: Record<string, unknown>
  qualityAlert: unknown
  semanticDefaults: unknown
  sourcePolicy: unknown
  followUpPolicy: unknown
  nextActions: string[] | null
  memoryRefsRef?: string[]
  queryContract?: unknown
  criticDecision?: unknown
}

export function buildBusinessSuccessResponse(params: BusinessSuccessResponseParams) {
  const evidenceCount = Array.isArray(params.evidence) ? params.evidence.length : 0
  return {
    success: true,
    data: buildUserOutcome({
      type: 'ops',
      summary: params.summary,
      rows: params.previewRows,
      draft: null,
      error: null,
      meta: {
        intent_type: params.intentType,
        intent_type_canonical: resolveCanonicalIntent(params),
        intent_prompt: params.promptMeta || null,
        exit_type: 'answered',
        data_plane: 'business',
        scope: params.scope,
        follow_up_context_applied: params.followUpContextApplied,
        query_mode: params.queryMode,
        metric_semantics: params.metricSemantics,
        clarification_auto_assumed: params.clarificationAutoAssumed,
        timezone: 'Asia/Shanghai',
        interpretation: params.interpretation,
        clarification_complete: true,
        evidence_chain: buildEvidenceChain(params.resolvedScope, params.queryMode, params.intentQuery),
        evidence: params.evidence,
        narrative_evidence: params.narrativeEvidence,
        explanation: params.explanation,
        reason_tags: params.reasonTags,
        reason_breakdown: params.reasonBreakdown,
        reason_breakdown_zh: params.reasonBreakdownZh,
        row_count: params.rows.length,
        rows_preview_count: params.previewRows.length,
        highlights: buildBusinessHighlights(params.rows, params.scope || undefined, params.queryContract),
        filters_applied: params.filtersApplied,
        quality_alert: params.qualityAlert,
        semantic_defaults: params.semanticDefaults,
        source_policy: params.sourcePolicy,
        follow_up_policy: params.followUpPolicy,
        query_contract: params.queryContract || null,
        critic_decision: params.criticDecision || null,
        memory_refs_ref: params.memoryRefsRef || [],
        next_actions:
          params.nextActions ||
          buildBusinessNextActionsFromContract(params.queryContract, true) ||
          buildBusinessNextActionsByMode(params.resolvedScope, params.queryMode, true),
        business_answer_audit: {
          event_type: 'business_answer_audit',
          data_plane: 'business',
          evidence_count: evidenceCount,
        },
        audit_events: [
          {
            event_type: 'business_answer_audit',
            data_plane: 'business',
            evidence_count: evidenceCount,
            scope: params.scope,
            row_count: params.rows.length,
          },
        ],
      },
    }),
  }
}
