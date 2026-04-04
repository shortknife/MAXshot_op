import { getPromptPolicyForCustomer } from '@/lib/chat/prompt-policy'
import { listActiveCustomers } from '@/lib/customers/runtime'
import { loadInteractionLearningLogRuntime } from '@/lib/interaction-learning/runtime'
import { loadActivePromptInventory, loadPromptHistories, type PromptRecord } from '@/lib/prompts/prompt-registry'

type PromptInventoryItem = {
  slug: string
  name: string
  description: string | null
  version: string
  family: string | null
  source: 'filesystem_md'
  file_path: string | null
  model_config: Record<string, unknown>
  system_prompt: string
  user_prompt_template: string | null
  editable: boolean
}

type PromptPolicyCustomerSummary = {
  customer_id: string
  allow_local_stub_intent: boolean
  allowed_intent_sources: string[]
  allowed_execution_sources: string[]
  execution_prompt_required_capabilities: string[]
}

type PromptRuntimeRollup = {
  recent_logs: number
  policy_allow: number
  policy_review: number
  filesystem_prompt_count: number
  primary_prompt_mix: Array<{ slug: string; count: number }>
  policy_reason_mix: Array<{ reason: string; count: number }>
}

export type PromptHistoryRecord = {
  slug: string
  name: string
  version: string
  is_active: boolean
  updated_at: string | null
  updated_by: string | null
  editable: boolean
  action_hint: 'release' | 'rollback' | 'none'
  file_path: string | null
}

export type PromptGovernanceSnapshot = {
  source: 'filesystem_md'
  prompts: PromptInventoryItem[]
  policy: PromptPolicyCustomerSummary[]
  runtime: PromptRuntimeRollup
  histories: Record<string, PromptHistoryRecord[]>
  release_events: []
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function toInventoryItem(prompt: PromptRecord): PromptInventoryItem {
  return {
    slug: prompt.slug,
    name: prompt.name || prompt.slug,
    description: typeof prompt.description === 'string' ? prompt.description : null,
    version: prompt.version,
    family: typeof prompt.family === 'string' ? prompt.family : null,
    source: 'filesystem_md',
    file_path: typeof prompt.file_path === 'string' ? prompt.file_path : null,
    model_config: prompt.model_config && typeof prompt.model_config === 'object' ? prompt.model_config as Record<string, unknown> : {},
    system_prompt: prompt.system_prompt,
    user_prompt_template: typeof prompt.user_prompt_template === 'string' ? prompt.user_prompt_template : null,
    editable: false,
  }
}

async function loadPromptRuntimeRollup(): Promise<PromptRuntimeRollup> {
  const runtime = await loadInteractionLearningLogRuntime()
  const items = runtime.items.slice(0, 80)
  const primaryPromptCounts = new Map<string, number>()
  const policyReasonCounts = new Map<string, number>()
  let policyAllow = 0
  let policyReview = 0
  let filesystemPromptCount = 0

  for (const item of items) {
    const meta = asRecord(item.meta)
    const promptRuntime = asRecord(meta.prompt_runtime)
    const promptPolicy = asRecord(meta.prompt_policy)
    const primaryPromptSlug = asString(promptRuntime.primary_prompt_slug)
    const promptSources = asStringArray(promptRuntime.prompt_sources)
    const promptPolicyOutcome = asString(promptPolicy.outcome)
    const promptPolicyReason = asString(promptPolicy.reason)

    if (primaryPromptSlug) {
      primaryPromptCounts.set(primaryPromptSlug, (primaryPromptCounts.get(primaryPromptSlug) || 0) + 1)
    }
    if (promptPolicyOutcome === 'allow') policyAllow += 1
    if (promptPolicyOutcome === 'review') policyReview += 1
    if (promptPolicyReason) {
      policyReasonCounts.set(promptPolicyReason, (policyReasonCounts.get(promptPolicyReason) || 0) + 1)
    }
    if (promptSources.includes('filesystem_md')) filesystemPromptCount += 1
  }

  return {
    recent_logs: items.length,
    policy_allow: policyAllow,
    policy_review: policyReview,
    filesystem_prompt_count: filesystemPromptCount,
    primary_prompt_mix: [...primaryPromptCounts.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    policy_reason_mix: [...policyReasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  }
}

function loadPromptPolicySummary(): PromptPolicyCustomerSummary[] {
  return listActiveCustomers().map((customer) => {
    const policy = getPromptPolicyForCustomer(customer.customer_id)
    return {
      customer_id: customer.customer_id,
      allow_local_stub_intent: policy.allow_local_stub_intent,
      allowed_intent_sources: policy.allowed_intent_sources,
      allowed_execution_sources: policy.allowed_execution_sources,
      execution_prompt_required_capabilities: policy.execution_prompt_required_capabilities,
    }
  })
}

async function buildPromptHistoryMap(): Promise<Record<string, PromptHistoryRecord[]>> {
  const histories = await loadPromptHistories()
  return Object.fromEntries(
    Object.entries(histories).map(([slug, versions]) => {
      const active = versions.find((item) => item.is_active) || null
      return [slug, versions.map((item) => ({
        slug,
        name: item.name || slug,
        version: item.version,
        is_active: item.is_active === true,
        updated_at: null,
        updated_by: null,
        editable: false,
        action_hint: !active || item.is_active
          ? 'none'
          : Number(item.version) < Number(active.version)
            ? 'rollback'
            : 'release',
        file_path: item.file_path || null,
      }))]
    }),
  )
}

export async function loadPromptGovernanceSnapshot(): Promise<PromptGovernanceSnapshot> {
  const prompts = (await loadActivePromptInventory()).map(toInventoryItem)
  return {
    source: 'filesystem_md',
    prompts,
    policy: loadPromptPolicySummary(),
    runtime: await loadPromptRuntimeRollup(),
    histories: await buildPromptHistoryMap(),
    release_events: [],
  }
}
