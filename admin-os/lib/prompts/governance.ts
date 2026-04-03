import fs from 'fs'
import path from 'path'

import { supabase } from '@/lib/supabase'
import { loadInteractionLearningLogRuntime } from '@/lib/interaction-learning/runtime'
import { getPromptPolicyForCustomer } from '@/lib/chat/prompt-policy'
import { listActiveCustomers } from '@/lib/customers/runtime'

type PromptInventoryItem = {
  slug: string
  name: string
  description: string | null
  version: string
  source: 'supabase' | 'local_config'
  updated_at: string | null
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
  local_stub_intent_count: number
  primary_prompt_mix: Array<{ slug: string; count: number }>
  policy_reason_mix: Array<{ reason: string; count: number }>
}

export type PromptGovernanceSnapshot = {
  source: 'supabase' | 'local_config'
  prompts: PromptInventoryItem[]
  policy: PromptPolicyCustomerSummary[]
  runtime: PromptRuntimeRollup
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

async function loadPromptInventoryFromSupabase(): Promise<PromptInventoryItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_library')
      .select('slug,name,system_prompt,user_prompt_template,model_config,description,version,is_active,updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) throw error
    if (!Array.isArray(data) || data.length === 0) return null

    return data.map((row) => ({
      slug: String(row.slug || ''),
      name: String(row.name || row.slug || ''),
      description: typeof row.description === 'string' ? row.description : null,
      version: String(row.version || ''),
      source: 'supabase',
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      model_config: row.model_config && typeof row.model_config === 'object' ? row.model_config as Record<string, unknown> : {},
      system_prompt: String(row.system_prompt || ''),
      user_prompt_template: typeof row.user_prompt_template === 'string' ? row.user_prompt_template : null,
      editable: true,
    }))
  } catch {
    return null
  }
}

function loadPromptInventoryFromLocalConfig(): PromptInventoryItem[] {
  const filePath = path.join(process.cwd(), 'app/configs/prompt-library-op/prompt_library_op_v2.json')
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { version?: string; prompts?: Array<Record<string, unknown>> }
  return Array.isArray(raw.prompts)
    ? raw.prompts.map((item) => ({
        slug: String(item.slug || ''),
        name: String(item.name || item.slug || ''),
        description: asString(item.description),
        version: typeof item.version === 'string' ? item.version : typeof raw.version === 'string' ? raw.version : 'local',
        source: 'local_config',
        updated_at: null,
        model_config: item.model_config && typeof item.model_config === 'object' ? item.model_config as Record<string, unknown> : {},
        system_prompt: String(item.system_prompt || ''),
        user_prompt_template: asString(item.user_prompt_template),
        editable: false,
      }))
    : []
}

async function loadPromptRuntimeRollup(): Promise<PromptRuntimeRollup> {
  const runtime = await loadInteractionLearningLogRuntime()
  const items = runtime.items.slice(0, 80)
  const primaryPromptCounts = new Map<string, number>()
  const policyReasonCounts = new Map<string, number>()
  let policyAllow = 0
  let policyReview = 0
  let localStubIntentCount = 0

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
    if (promptSources.includes('local_stub')) localStubIntentCount += 1
  }

  return {
    recent_logs: items.length,
    policy_allow: policyAllow,
    policy_review: policyReview,
    local_stub_intent_count: localStubIntentCount,
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

export async function loadPromptGovernanceSnapshot(): Promise<PromptGovernanceSnapshot> {
  const supabaseInventory = await loadPromptInventoryFromSupabase()
  const prompts = supabaseInventory && supabaseInventory.length > 0
    ? supabaseInventory
    : loadPromptInventoryFromLocalConfig()

  return {
    source: supabaseInventory && supabaseInventory.length > 0 ? 'supabase' : 'local_config',
    prompts,
    policy: loadPromptPolicySummary(),
    runtime: await loadPromptRuntimeRollup(),
  }
}
