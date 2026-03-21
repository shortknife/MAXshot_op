import { buildBusinessMemoryRefs, buildFollowUpExamples, getYieldDefaultAggregation, resolveBusinessIntentId } from '@/lib/capabilities/semantic-index'
import { businessDataQuery } from '@/lib/capabilities/business-data-query'
import { checkClarificationNeeded, clearClarificationState, hasTimeWindow, hasYieldGranularity, registerClarificationTurn } from '@/lib/chat/query-clarification'
import { applyDefaultYieldAssumption, detectYieldAggregation, isOverallPerformanceQuery, resolveYieldClarification } from '@/lib/chat/yield-clarification'
import { inferMetricSemantics, inferQueryMode, buildBusinessNextActionsByMode } from '@/lib/chat/query-strategy'
import { mapErrorToUserMessage } from '@/lib/user-chat-core'
import { buildBusinessFailureResponse } from '@/lib/chat/business-response'
import { buildBusinessSuccessResponse } from '@/lib/chat/business-success-response'
import { logBusinessQuery } from '@/lib/chat/business-query-log'
import { persistBusinessSuccessPostprocess } from '@/lib/chat/business-postprocess'
import { buildInvestigateExplanation, buildReasonBreakdown, deriveReasonTags, fetchNarrativeEvidence, mapReasonTagToZh } from '@/lib/chat/business-evidence'
import { buildYieldDrilldownActions, extractMentionedVault, fetchVaultOptions } from '@/lib/chat/business-followup'
import { buildUserOutcome } from '@/lib/user-chat-core'
import { buildChatEnvelope, previewRows } from '@/lib/chat/chat-route-helpers'
import { mergeMemoryRefIds } from '@/lib/router/capability-catalog'

function shouldApplyYieldAverageDefault(currentTurnRawQuery: string, previousTurns: number, intentId: string): boolean {
  if (previousTurns <= 0) return false
  if (intentId !== 'yield_summary') return false
  const text = String(currentTurnRawQuery || '').toLowerCase()
  if (!hasTimeWindow(text)) return false
  if (hasYieldGranularity(text)) return false
  if (/(最高|最低|max|min|实时|当前|最新|realtime|real-time)/.test(text)) return false
  return getYieldDefaultAggregation(intentId) === 'avg'
}

type HandleBusinessIntentParams = {
  intentType: string
  canonicalIntentType: string
  matchedCapabilityIds: string[]
  primaryCapabilityId: string | null
  parsed: { intent: { extracted_slots?: Record<string, unknown> }; prompt_meta?: { slug?: string; version?: string; source?: string; hash?: string } | null }
  rawQuery: string
  effectiveQuery: string
  intentQuery: string
  previousTurns: number
  sessionId: string | null
  maxClarificationTurns: number
  modelNeedClarification: boolean
  modelClarificationExhausted: boolean
  followUpContextApplied: boolean
}

function extractOnlyMarketTarget(rawQuery: string): string | null {
  const text = String(rawQuery || '').trim()
  const match = text.match(/只看\s+(.+?)(?:\s*(?:的)?\s*APY)?$/i)
  if (!match?.[1]) return null
  return match[1].trim()
}

function extractCompareTargets(rawQuery: string): string[] {
  const text = String(rawQuery || '').trim()
  const cn = text.match(/比较\s+(.+?)\s+和\s+(.+?)(?:\s*(?:的)?\s*APY)?$/i)
  if (cn?.[1] && cn?.[2]) return [cn[1].trim(), cn[2].trim()].filter(Boolean)
  const en = text.match(/compare\s+(.+?)\s+(?:and|vs|versus)\s+(.+?)(?:\s*apy)?$/i)
  if (en?.[1] && en?.[2]) return [en[1].trim(), en[2].trim()].filter(Boolean)
  return []
}

export async function handleBusinessIntent(params: HandleBusinessIntentParams): Promise<{ handled: false } | { handled: true; body: unknown }> {
  const {
    intentType,
    canonicalIntentType,
    matchedCapabilityIds,
    primaryCapabilityId,
    parsed,
    rawQuery,
    effectiveQuery,
    intentQuery,
    previousTurns,
    sessionId,
    maxClarificationTurns,
    modelNeedClarification,
    modelClarificationExhausted,
    followUpContextApplied,
  } = params

  if (primaryCapabilityId !== 'capability.data_fact_query' && !matchedCapabilityIds.includes('capability.data_fact_query')) {
    return { handled: false }
  }

  const scope = String(parsed.intent.extracted_slots?.scope || 'unknown')
  const semanticIntentId = resolveBusinessIntentId(intentQuery, scope)
  const memoryRefs = buildBusinessMemoryRefs(semanticIntentId)
  const semanticMemoryRefsRef = memoryRefs
    .map((ref) => String((ref as { id?: string } | null)?.id || '').trim())
    .filter(Boolean)
  const memoryRefsRef = mergeMemoryRefIds(semanticMemoryRefsRef, matchedCapabilityIds)
  if (scope === 'yield') {
    const currentAggRaw = String(parsed.intent.extracted_slots?.metric_agg || parsed.intent.extracted_slots?.aggregation || '')
      .trim()
      .toLowerCase()
    const currentAgg = ['avg', 'max', 'min', 'realtime', 'latest'].includes(currentAggRaw) ? currentAggRaw : ''
    const shouldDefaultCompareAgg =
      !currentAgg &&
      /(只看|比较|对比|\bvs\b|versus|compare|only)/i.test(rawQuery)
    if (shouldDefaultCompareAgg) {
      parsed.intent.extracted_slots = {
        ...(parsed.intent.extracted_slots || {}),
        metric_agg: 'avg',
      }
    }
    if (!isOverallPerformanceQuery(intentQuery)) {
      const vaultOptions = await fetchVaultOptions()
      const shouldForceAverageClarificationQuery =
        /(只看|比较|对比|\bvs\b|versus|compare|only)/i.test(rawQuery) &&
        !detectYieldAggregation(intentQuery) &&
        !hasYieldGranularity(intentQuery)
      const yieldClarificationQuery = shouldForceAverageClarificationQuery ? `${intentQuery} 平均 APY` : intentQuery
      const clarificationNeeded = resolveYieldClarification({
        intentQuery: yieldClarificationQuery,
        previousTurns,
        vaultOptions,
        extractedSlots: parsed.intent.extracted_slots as Record<string, unknown> | undefined,
      })
      if (clarificationNeeded.autoAssumeAggFromFollowUp) {
        parsed.intent.extracted_slots = {
          ...(parsed.intent.extracted_slots || {}),
          metric_agg: 'avg',
        }
      }

      if (clarificationNeeded.question) {
        registerClarificationTurn({ sessionId, rawQuery: intentQuery, previousTurns })
        return {
          handled: true,
          body: {
            success: false,
            data: buildUserOutcome({
              type: 'ops',
              summary: clarificationNeeded.question,
              error: 'missing_required_clarification',
              meta: {
                intent_type: intentType,
                intent_type_canonical: canonicalIntentType,
                exit_type: 'needs_clarification',
                intent_prompt: parsed.prompt_meta || null,
                data_plane: 'business',
                memory_refs_ref: memoryRefsRef,
                scope,
                query_mode: 'metrics',
                timezone: 'Asia/Shanghai',
                required_slots: clarificationNeeded.requiredSlots,
                clarification_complete: false,
                next_actions: clarificationNeeded.nextActions,
                clarification: {
                  turns: previousTurns + 1,
                  max_turns: maxClarificationTurns,
                  exhausted: false,
                },
                audit_events: [
                  {
                    event_type: 'business_clarification_requested',
                    reason: 'missing_required_clarification',
                    scope,
                  },
                ],
              },
            }),
          },
        }
      }
    }
  }

  const clarification = checkClarificationNeeded({
    sessionId,
    rawQuery: effectiveQuery,
    scope,
    previousTurns,
    extractedSlots: parsed.intent.extracted_slots as Record<string, unknown> | undefined,
    maxTurns: maxClarificationTurns,
  })
  if (clarification.needed && !clarification.exhausted) {
    const requiredSlots =
      clarification.prompt.question.includes('时间范围')
        ? ['time_window']
        : clarification.prompt.question.includes('APY 口径')
          ? ['metric_agg']
          : []
    const nextActions = clarification.prompt.options
    return {
      handled: true,
      body: {
        success: false,
        data: buildUserOutcome({
          type: 'ops',
          summary: clarification.prompt.question,
          error: clarification.prompt.reason,
          meta: {
            intent_type: intentType,
            intent_type_canonical: canonicalIntentType,
            exit_type: 'needs_clarification',
            intent_prompt: parsed.prompt_meta || null,
            data_plane: 'business',
            memory_refs_ref: memoryRefsRef,
            scope,
            query_mode: 'metrics',
            timezone: 'Asia/Shanghai',
            required_slots: requiredSlots,
            clarification_complete: false,
            next_actions: nextActions,
            clarification: {
              turns: previousTurns + 1,
              max_turns: maxClarificationTurns,
              exhausted: false,
            },
            audit_events: [
              {
                event_type: 'business_clarification_requested',
                reason: clarification.prompt.reason,
                scope,
              },
            ],
          },
        }),
      },
    }
  }

  clearClarificationState(sessionId)
  const applyAvgDefault = scope === 'yield' && shouldApplyYieldAverageDefault(rawQuery, previousTurns, semanticIntentId)
  let businessRawQuery =
    clarification.needed && clarification.exhausted
      ? applyDefaultYieldAssumption(intentQuery)
      : modelNeedClarification && modelClarificationExhausted
        ? applyDefaultYieldAssumption(intentQuery)
        : applyAvgDefault
          ? applyDefaultYieldAssumption(intentQuery)
          : intentQuery
  if (
    scope === 'yield' &&
    hasTimeWindow(rawQuery) &&
    !detectYieldAggregation(rawQuery) &&
    !hasYieldGranularity(rawQuery)
  ) {
    businessRawQuery = `${rawQuery} 平均 APY`
  }
  if (scope === 'yield' && /(只看|比较|对比|\bvs\b|versus|maxshot|dforce)/i.test(rawQuery)) {
    const inheritedWindow = hasTimeWindow(intentQuery) ? intentQuery.match(/最近\d+天|今天(?:（Asia\/Shanghai）)?/)?.[0] || '' : ''
    const resolvedWindow = inheritedWindow || (previousTurns > 0 ? '最近7天' : '')
    const aggHint = detectYieldAggregation(rawQuery) || hasYieldGranularity(rawQuery) ? '' : ' 平均 APY'
    businessRawQuery = `${resolvedWindow ? `${resolvedWindow} ` : ''}${rawQuery}${aggHint}`.trim()
  }
  if (scope === 'yield' && /(比较|对比|\bvs\b|versus|compare)/i.test(rawQuery)) {
    const compareTargets = extractCompareTargets(rawQuery)
    parsed.intent.extracted_slots = {
      ...(parsed.intent.extracted_slots || {}),
      compare_targets: compareTargets,
      vault_name: undefined,
      market_name: undefined,
    }
  }

  const output = await businessDataQuery({
    ...buildChatEnvelope(intentType, parsed.intent.extracted_slots || {}),
    memory_refs: memoryRefs,
    context: {
      channel: 'user_chat',
      raw_query: businessRawQuery,
    },
  })

  if (output.status !== 'success') {
    const reason = output.error || output.metadata?.rejected_reason || 'insufficient_business_data'
    await logBusinessQuery({
      userId: 'user_chat',
      rawQuery: effectiveQuery,
      scope: String(parsed.intent.extracted_slots?.scope || 'business_query'),
      summary: mapErrorToUserMessage(reason),
      success: false,
      promptMeta: parsed.prompt_meta || null,
      errorCode: reason,
    })
    return {
      handled: true,
      body: buildBusinessFailureResponse({
        reason,
        intentType,
        canonicalIntentType,
        primaryCapabilityId,
        matchedCapabilityIds,
        promptMeta: parsed.prompt_meta || null,
        followUpContextApplied,
        intentQuery,
        scope,
        clarificationAutoAssumed:
          (clarification.needed && clarification.exhausted) || (modelNeedClarification && modelClarificationExhausted),
        outputNextActions: (output.metadata as { next_actions?: string[] } | undefined)?.next_actions,
        memoryRefsRef,
      }),
    }
  }

  const result = (output.result || {}) as {
    summary?: string
    rows?: unknown[]
    scope?: string
    filters_applied?: { chain?: string; protocol?: string }
  }
  const resolvedScope = String(result.scope || scope)
  let rowsRaw = Array.isArray(result.rows) ? result.rows : []
  const compareTargetsForRows = extractCompareTargets(rawQuery)
  if (resolvedScope === 'yield' && compareTargetsForRows.length >= 2) {
    const currentNames = rowsRaw.map((row) => String((row as Record<string, unknown>).market_name || '').toLowerCase())
    const missingTargets = compareTargetsForRows.filter(
      (target) => !currentNames.some((name) => name.includes(target.toLowerCase()))
    )
    for (const target of missingTargets.slice(0, 2)) {
      const supplement = await businessDataQuery({
        ...buildChatEnvelope(intentType, {
          ...(parsed.intent.extracted_slots || {}),
          market_name: target,
          vault_name: target,
        }),
        memory_refs: memoryRefs,
        context: {
          channel: 'user_chat',
          raw_query: `${businessRawQuery} 只看 ${target}`,
        },
      })
      if (supplement.status !== 'success') continue
      const supplementRows = Array.isArray((supplement.result as { rows?: unknown[] } | undefined)?.rows)
        ? ((supplement.result as { rows?: unknown[] }).rows as unknown[])
        : []
      if (supplementRows.length > 0) {
        rowsRaw = [...rowsRaw, ...supplementRows]
      }
    }
  }
  const onlyMarketTarget = extractOnlyMarketTarget(rawQuery)
  const compareTargets = extractCompareTargets(rawQuery)
  const constrainedRows =
    resolvedScope === 'yield' && onlyMarketTarget
      ? rowsRaw.filter((row) => {
          const name = String((row as Record<string, unknown>).market_name || '').toLowerCase()
          return name.includes(onlyMarketTarget.toLowerCase())
        })
      : resolvedScope === 'yield' && compareTargets.length >= 2
        ? rowsRaw.filter((row) => {
            const name = String((row as Record<string, unknown>).market_name || '').toLowerCase()
            return compareTargets.some((target) => name.includes(target.toLowerCase()))
          })
        : rowsRaw
  const rows = constrainedRows.length > 0 ? constrainedRows : rowsRaw
  const preview = previewRows(rows, 5)
  const queryMode = inferQueryMode(intentQuery, resolvedScope)
  const interpretation = (() => {
    if (resolvedScope !== 'yield') return null
    const agg =
      detectYieldAggregation(businessRawQuery) ||
      (String(getYieldDefaultAggregation(resolveBusinessIntentId(businessRawQuery, resolvedScope)) || '').toLowerCase() === 'avg'
        ? 'avg'
        : hasYieldGranularity(businessRawQuery)
          ? 'avg'
          : 'avg')
    const aggLabel = agg === 'max' ? '最高' : agg === 'min' ? '最低' : agg === 'realtime' ? '实时' : '平均'
    const timeLabel = hasTimeWindow(businessRawQuery) ? '指定时间范围' : '最近7天'
    return `我的理解是：查询 ${timeLabel} 的 ${aggLabel} APY。`
  })()
  const metricSemantics =
    String(
      (output.metadata as { metric_semantics?: string } | undefined)?.metric_semantics ||
        (result as { metric_semantics?: string } | undefined)?.metric_semantics ||
        inferMetricSemantics(resolvedScope)
    ) || inferMetricSemantics(resolvedScope)
  const narrativeEvidence = await fetchNarrativeEvidence({
    mode: queryMode,
    scope: resolvedScope,
    rows: rows as Array<Record<string, unknown>>,
  })
  const investigateExplanation = buildInvestigateExplanation(
    resolvedScope,
    rows as Array<Record<string, unknown>>,
    narrativeEvidence.length
  )
  const reasonTags = deriveReasonTags(resolvedScope, rows as Array<Record<string, unknown>>, narrativeEvidence.length)
  const reasonBreakdown = buildReasonBreakdown(reasonTags, narrativeEvidence.length)
  const reasonBreakdownZh = {
    main_reason: mapReasonTagToZh(reasonBreakdown.main_reason),
    secondary_reasons: reasonBreakdown.secondary_reasons.map(mapReasonTagToZh),
    evidence_count: reasonBreakdown.evidence_count,
  }
  const vaultOptions = await fetchVaultOptions(20)
  const yieldNextActions =
    resolvedScope === 'yield'
      ? buildFollowUpExamples(
          resolveBusinessIntentId(intentQuery, resolvedScope),
          buildYieldDrilldownActions(rows as Array<Record<string, unknown>>, result.filters_applied || {}, vaultOptions)
        )
      : null
  await persistBusinessSuccessPostprocess({
    sessionId,
    resolvedScope,
    queryMode,
    filtersApplied: (result.filters_applied || {}) as Record<string, unknown>,
    intentQuery,
    businessRawQuery,
    mentionedVault: extractMentionedVault(intentQuery, vaultOptions),
    effectiveQuery,
    summary: String(result.summary || '已返回业务查询结果。'),
    outputScope: (result.scope as string | null) || null,
    fallbackScope: String(parsed.intent.extracted_slots?.scope || 'business_query'),
    promptMeta: parsed.prompt_meta || null,
    evidence: output.evidence?.sources || [],
  })

  return {
    handled: true,
    body: buildBusinessSuccessResponse({
      summary: String(result.summary || '已返回业务查询结果。'),
      previewRows: preview,
      intentType,
      canonicalIntentType,
      primaryCapabilityId,
      matchedCapabilityIds,
      promptMeta: parsed.prompt_meta || null,
      scope: (result.scope as string | null) || null,
      followUpContextApplied: followUpContextApplied,
      queryMode,
      metricSemantics,
      clarificationAutoAssumed:
        (clarification.needed && clarification.exhausted) || (modelNeedClarification && modelClarificationExhausted),
      interpretation,
      resolvedScope,
      intentQuery,
      evidence: output.evidence?.sources || [],
      narrativeEvidence,
      explanation: investigateExplanation,
      reasonTags,
      reasonBreakdown,
      reasonBreakdownZh,
      rows: rows as Array<Record<string, unknown>>,
      filtersApplied: (result.filters_applied || {}) as Record<string, unknown>,
      qualityAlert:
        (output.metadata as { quality_alert?: unknown } | undefined)?.quality_alert ||
        (result as { quality_alert?: unknown } | undefined)?.quality_alert ||
        null,
      semanticDefaults:
        (output.metadata as { semantic_defaults?: unknown } | undefined)?.semantic_defaults || null,
      sourcePolicy:
        (output.metadata as { source_policy?: unknown } | undefined)?.source_policy || null,
      followUpPolicy:
        (output.metadata as { follow_up_policy?: unknown } | undefined)?.follow_up_policy || null,
      nextActions: yieldNextActions || buildBusinessNextActionsByMode(resolvedScope, queryMode, true),
      memoryRefsRef,
    }),
  }
}
