import { loadInteractionLearningLogRuntime, type InteractionLearningLogRow } from '@/lib/interaction-learning/runtime'

export type LearningHardCase = {
  log_id: string
  created_at: string
  customer_id: string | null
  primary_capability_id: string | null
  source_plane: string | null
  raw_query: string
  summary: string | null
  issue_type: 'review' | 'fallback' | 'clarification' | 'failure'
  issue_reason: string | null
}

export type LearningCapabilityCandidate = {
  key: string
  primary_capability_id: string
  source_plane: string | null
  scope: string | null
  query_mode: string | null
  success_count: number
  review_count: number
  clarification_count: number
  sample_queries: string[]
}

export type LearningCustomerProfile = {
  customer_id: string
  total_interactions: number
  top_planes: Array<{ plane: string; count: number }>
  top_capabilities: Array<{ capability_id: string; count: number }>
  top_issue_reasons: Array<{ reason: string; count: number }>
}

export type LearningPromptPolicyIssue = {
  reason: string
  count: number
  sample_queries: string[]
}

export type LearningAssetSnapshot = {
  source: 'supabase' | 'empty'
  generated_at: string
  totals: {
    interactions: number
    hard_cases: number
    capability_candidates: number
    customers: number
    prompt_policy_issues: number
  }
  hard_cases: LearningHardCase[]
  capability_candidates: LearningCapabilityCandidate[]
  customer_profiles: LearningCustomerProfile[]
  prompt_policy_issues: LearningPromptPolicyIssue[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeReason(item: InteractionLearningLogRow): string | null {
  const meta = asRecord(item.meta)
  const promptPolicy = asRecord(meta.prompt_policy)
  const verification = asRecord(meta.verification)
  return (
    asString(promptPolicy.reason) ||
    asString(meta.fallback_reason) ||
    asString(verification.reason) ||
    (item.review_required ? 'review_required' : null) ||
    (item.clarification_required ? 'clarification_required' : null) ||
    (!item.success ? 'failed' : null)
  )
}

function uniqueSamples(values: string[], next: string) {
  if (!next.trim()) return values
  if (values.includes(next)) return values
  if (values.length >= 3) return values
  return [...values, next]
}

export function deriveLearningAssets(items: InteractionLearningLogRow[], source: 'supabase' | 'empty'): LearningAssetSnapshot {
  const hardCases: LearningHardCase[] = []
  const capabilityMap = new Map<string, LearningCapabilityCandidate>()
  const customerMap = new Map<string, { planeCounts: Map<string, number>; capabilityCounts: Map<string, number>; reasonCounts: Map<string, number>; total: number }>()
  const promptIssueMap = new Map<string, LearningPromptPolicyIssue>()

  for (const item of items) {
    const issueReason = normalizeReason(item)
    const issueType = !item.success
      ? 'failure'
      : item.review_required
        ? 'review'
        : item.fallback_required
          ? 'fallback'
          : item.clarification_required
            ? 'clarification'
            : null

    if (issueType) {
      hardCases.push({
        log_id: item.log_id,
        created_at: item.created_at,
        customer_id: item.customer_id,
        primary_capability_id: item.primary_capability_id,
        source_plane: item.source_plane,
        raw_query: item.raw_query,
        summary: item.summary,
        issue_type: issueType,
        issue_reason: issueReason,
      })
    }

    if (item.primary_capability_id) {
      const key = [item.primary_capability_id, item.source_plane || 'unknown', item.scope || 'none', item.query_mode || 'none'].join('::')
      const current = capabilityMap.get(key) || {
        key,
        primary_capability_id: item.primary_capability_id,
        source_plane: item.source_plane,
        scope: item.scope,
        query_mode: item.query_mode,
        success_count: 0,
        review_count: 0,
        clarification_count: 0,
        sample_queries: [],
      }
      if (item.success && !item.review_required && !item.clarification_required) current.success_count += 1
      if (item.review_required) current.review_count += 1
      if (item.clarification_required) current.clarification_count += 1
      current.sample_queries = uniqueSamples(current.sample_queries, item.raw_query)
      capabilityMap.set(key, current)
    }

    if (item.customer_id) {
      const current = customerMap.get(item.customer_id) || {
        planeCounts: new Map<string, number>(),
        capabilityCounts: new Map<string, number>(),
        reasonCounts: new Map<string, number>(),
        total: 0,
      }
      current.total += 1
      const plane = item.source_plane || 'unknown'
      current.planeCounts.set(plane, (current.planeCounts.get(plane) || 0) + 1)
      if (item.primary_capability_id) {
        current.capabilityCounts.set(item.primary_capability_id, (current.capabilityCounts.get(item.primary_capability_id) || 0) + 1)
      }
      if (issueReason) {
        current.reasonCounts.set(issueReason, (current.reasonCounts.get(issueReason) || 0) + 1)
      }
      customerMap.set(item.customer_id, current)
    }

    const meta = asRecord(item.meta)
    const promptPolicy = asRecord(meta.prompt_policy)
    const promptReason = asString(promptPolicy.reason)
    if (promptReason) {
      const current = promptIssueMap.get(promptReason) || { reason: promptReason, count: 0, sample_queries: [] }
      current.count += 1
      current.sample_queries = uniqueSamples(current.sample_queries, item.raw_query)
      promptIssueMap.set(promptReason, current)
    }
  }

  const capabilityCandidates = [...capabilityMap.values()]
    .sort((a, b) => (b.success_count + b.review_count + b.clarification_count) - (a.success_count + a.review_count + a.clarification_count))
    .slice(0, 12)

  const customerProfiles: LearningCustomerProfile[] = [...customerMap.entries()].map(([customer_id, value]) => ({
    customer_id,
    total_interactions: value.total,
    top_planes: [...value.planeCounts.entries()].map(([plane, count]) => ({ plane, count })).sort((a, b) => b.count - a.count).slice(0, 4),
    top_capabilities: [...value.capabilityCounts.entries()].map(([capability_id, count]) => ({ capability_id, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    top_issue_reasons: [...value.reasonCounts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  })).sort((a, b) => b.total_interactions - a.total_interactions)

  const promptPolicyIssues = [...promptIssueMap.values()].sort((a, b) => b.count - a.count)
  const hardCaseList = hardCases.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 16)

  return {
    source,
    generated_at: new Date().toISOString(),
    totals: {
      interactions: items.length,
      hard_cases: hardCaseList.length,
      capability_candidates: capabilityCandidates.length,
      customers: customerProfiles.length,
      prompt_policy_issues: promptPolicyIssues.length,
    },
    hard_cases: hardCaseList,
    capability_candidates: capabilityCandidates,
    customer_profiles: customerProfiles,
    prompt_policy_issues: promptPolicyIssues,
  }
}

export async function loadLearningAssetSnapshot(): Promise<LearningAssetSnapshot> {
  const runtime = await loadInteractionLearningLogRuntime()
  return deriveLearningAssets(runtime.items, runtime.source)
}

export function renderLearningAssetMarkdown(snapshot: LearningAssetSnapshot): string {
  const lines: string[] = []
  lines.push('# Nexa Learning Asset Snapshot')
  lines.push('')
  lines.push(`- generated_at: ${snapshot.generated_at}`)
  lines.push(`- source: ${snapshot.source}`)
  lines.push(`- interactions: ${snapshot.totals.interactions}`)
  lines.push(`- hard_cases: ${snapshot.totals.hard_cases}`)
  lines.push(`- capability_candidates: ${snapshot.totals.capability_candidates}`)
  lines.push(`- customers: ${snapshot.totals.customers}`)
  lines.push('')
  lines.push('## Hard Cases')
  lines.push('')
  if (snapshot.hard_cases.length === 0) {
    lines.push('- none')
  } else {
    for (const item of snapshot.hard_cases) {
      lines.push(`- [${item.issue_type}] ${item.raw_query}`)
      lines.push(`  - capability: ${item.primary_capability_id || 'n/a'}`)
      lines.push(`  - plane: ${item.source_plane || 'n/a'}`)
      lines.push(`  - customer: ${item.customer_id || 'n/a'}`)
      lines.push(`  - reason: ${item.issue_reason || 'n/a'}`)
    }
  }
  lines.push('')
  lines.push('## Capability Candidates')
  lines.push('')
  if (snapshot.capability_candidates.length === 0) {
    lines.push('- none')
  } else {
    for (const item of snapshot.capability_candidates) {
      lines.push(`- ${item.primary_capability_id} | plane=${item.source_plane || 'n/a'} | scope=${item.scope || 'n/a'} | mode=${item.query_mode || 'n/a'}`)
      lines.push(`  - success=${item.success_count} review=${item.review_count} clarification=${item.clarification_count}`)
      for (const sample of item.sample_queries) lines.push(`  - sample: ${sample}`)
    }
  }
  lines.push('')
  lines.push('## Customer Profiles')
  lines.push('')
  if (snapshot.customer_profiles.length === 0) {
    lines.push('- none')
  } else {
    for (const customer of snapshot.customer_profiles) {
      lines.push(`- ${customer.customer_id} (${customer.total_interactions})`)
      for (const plane of customer.top_planes) lines.push(`  - plane: ${plane.plane} × ${plane.count}`)
      for (const capability of customer.top_capabilities) lines.push(`  - capability: ${capability.capability_id} × ${capability.count}`)
      for (const reason of customer.top_issue_reasons) lines.push(`  - issue: ${reason.reason} × ${reason.count}`)
    }
  }
  lines.push('')
  lines.push('## Prompt Policy Issues')
  lines.push('')
  if (snapshot.prompt_policy_issues.length === 0) {
    lines.push('- none')
  } else {
    for (const issue of snapshot.prompt_policy_issues) {
      lines.push(`- ${issue.reason} × ${issue.count}`)
      for (const sample of issue.sample_queries) lines.push(`  - sample: ${sample}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}
