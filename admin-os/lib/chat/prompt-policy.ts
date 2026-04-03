import fs from 'fs'
import path from 'path'

import type { PromptRuntimeSnapshot } from '@/lib/chat/prompt-runtime'

export type PromptPolicyDecision = {
  outcome: 'allow' | 'review'
  reason: string | null
  checks: string[]
  customer_id: string | null
  primary_capability_id: string | null
  policy: {
    allow_local_stub_intent: boolean
    allowed_intent_sources: string[]
    allowed_execution_sources: string[]
    execution_prompt_required: boolean
    execution_prompt_slug_allowlist: string[]
  }
}

type PromptPolicyDefaults = {
  allowed_intent_sources: string[]
  allowed_execution_sources: string[]
  execution_prompt_required_capabilities: string[]
  execution_prompt_slug_allowlist: Record<string, string[]>
}

type PromptPolicyCustomerOverride = {
  customer_id: string
  allow_local_stub_intent?: boolean
  allowed_intent_sources?: string[]
  allowed_execution_sources?: string[]
}

type PromptPolicyRegistry = {
  registry_id: string
  version: string
  defaults: PromptPolicyDefaults
  customers: PromptPolicyCustomerOverride[]
}

const PROMPT_POLICY_REGISTRY_PATH = path.join(process.cwd(), 'app/configs/prompt-policy/prompt_policy_registry_v1.json')

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []
}

function loadPromptPolicyRegistry(): PromptPolicyRegistry {
  const raw = JSON.parse(fs.readFileSync(PROMPT_POLICY_REGISTRY_PATH, 'utf8')) as Partial<PromptPolicyRegistry>
  const defaults = (raw.defaults || {}) as Partial<PromptPolicyDefaults>
  return {
    registry_id: String(raw.registry_id || 'prompt_policy_registry_v1'),
    version: String(raw.version || '1'),
    defaults: {
      allowed_intent_sources: normalizeStringArray(defaults.allowed_intent_sources),
      allowed_execution_sources: normalizeStringArray(defaults.allowed_execution_sources),
      execution_prompt_required_capabilities: normalizeStringArray(defaults.execution_prompt_required_capabilities),
      execution_prompt_slug_allowlist:
        defaults.execution_prompt_slug_allowlist && typeof defaults.execution_prompt_slug_allowlist === 'object'
          ? Object.fromEntries(
              Object.entries(defaults.execution_prompt_slug_allowlist).map(([key, value]) => [key, normalizeStringArray(value)])
            )
          : {},
    },
    customers: Array.isArray(raw.customers)
      ? raw.customers.map((item) => ({
          customer_id: String(item.customer_id || '').trim(),
          allow_local_stub_intent: item.allow_local_stub_intent === true,
          allowed_intent_sources: normalizeStringArray(item.allowed_intent_sources),
          allowed_execution_sources: normalizeStringArray(item.allowed_execution_sources),
        }))
      : [],
  }
}

export function getPromptPolicyForCustomer(customerId: string | null | undefined) {
  const registry = loadPromptPolicyRegistry()
  const override = registry.customers.find((item) => item.customer_id === customerId) || null
  const overrideIntentSources = override?.allowed_intent_sources || []
  const overrideExecutionSources = override?.allowed_execution_sources || []
  return {
    customer_id: customerId || null,
    allow_local_stub_intent: override ? override.allow_local_stub_intent === true : true,
    allowed_intent_sources: overrideIntentSources.length > 0 ? overrideIntentSources : registry.defaults.allowed_intent_sources,
    allowed_execution_sources: overrideExecutionSources.length > 0 ? overrideExecutionSources : registry.defaults.allowed_execution_sources,
    execution_prompt_required_capabilities: registry.defaults.execution_prompt_required_capabilities,
    execution_prompt_slug_allowlist: registry.defaults.execution_prompt_slug_allowlist,
  }
}

export function evaluatePromptPolicy(params: {
  customerId?: string | null
  primaryCapabilityId?: string | null
  promptRuntime: PromptRuntimeSnapshot
}): PromptPolicyDecision {
  const policy = getPromptPolicyForCustomer(params.customerId)
  const checks: string[] = []
  const capabilityId = params.primaryCapabilityId || null
  const intentSource = params.promptRuntime.intent_prompt?.source || null
  const executionSource = params.promptRuntime.execution_prompt?.source || null
  const executionSlug = params.promptRuntime.execution_prompt?.slug || null
  const executionRequired = capabilityId ? policy.execution_prompt_required_capabilities.includes(capabilityId) : false
  const executionSlugAllowlist = capabilityId ? policy.execution_prompt_slug_allowlist[capabilityId] || [] : []

  if (intentSource) {
    checks.push('intent_source_checked')
    if (!policy.allowed_intent_sources.includes(intentSource)) {
      return {
        outcome: 'review',
        reason: 'intent_prompt_source_not_allowed',
        checks,
        customer_id: policy.customer_id,
        primary_capability_id: capabilityId,
        policy: {
          allow_local_stub_intent: policy.allow_local_stub_intent,
          allowed_intent_sources: policy.allowed_intent_sources,
          allowed_execution_sources: policy.allowed_execution_sources,
          execution_prompt_required: executionRequired,
          execution_prompt_slug_allowlist: executionSlugAllowlist,
        },
      }
    }
    if (intentSource === 'local_stub' && !policy.allow_local_stub_intent) {
      checks.push('intent_local_stub_blocked')
      return {
        outcome: 'review',
        reason: 'intent_local_stub_not_allowed',
        checks,
        customer_id: policy.customer_id,
        primary_capability_id: capabilityId,
        policy: {
          allow_local_stub_intent: policy.allow_local_stub_intent,
          allowed_intent_sources: policy.allowed_intent_sources,
          allowed_execution_sources: policy.allowed_execution_sources,
          execution_prompt_required: executionRequired,
          execution_prompt_slug_allowlist: executionSlugAllowlist,
        },
      }
    }
  }

  if (executionRequired) {
    checks.push('execution_prompt_required')
    if (!params.promptRuntime.execution_prompt) {
      return {
        outcome: 'review',
        reason: 'execution_prompt_required',
        checks,
        customer_id: policy.customer_id,
        primary_capability_id: capabilityId,
        policy: {
          allow_local_stub_intent: policy.allow_local_stub_intent,
          allowed_intent_sources: policy.allowed_intent_sources,
          allowed_execution_sources: policy.allowed_execution_sources,
          execution_prompt_required: executionRequired,
          execution_prompt_slug_allowlist: executionSlugAllowlist,
        },
      }
    }
  }

  if (executionSource) {
    checks.push('execution_source_checked')
    if (!policy.allowed_execution_sources.includes(executionSource)) {
      return {
        outcome: 'review',
        reason: 'execution_prompt_source_not_allowed',
        checks,
        customer_id: policy.customer_id,
        primary_capability_id: capabilityId,
        policy: {
          allow_local_stub_intent: policy.allow_local_stub_intent,
          allowed_intent_sources: policy.allowed_intent_sources,
          allowed_execution_sources: policy.allowed_execution_sources,
          execution_prompt_required: executionRequired,
          execution_prompt_slug_allowlist: executionSlugAllowlist,
        },
      }
    }
  }

  if (executionSlug && executionSlugAllowlist.length > 0) {
    checks.push('execution_slug_checked')
    if (!executionSlugAllowlist.includes(executionSlug)) {
      return {
        outcome: 'review',
        reason: 'execution_prompt_slug_not_allowed',
        checks,
        customer_id: policy.customer_id,
        primary_capability_id: capabilityId,
        policy: {
          allow_local_stub_intent: policy.allow_local_stub_intent,
          allowed_intent_sources: policy.allowed_intent_sources,
          allowed_execution_sources: policy.allowed_execution_sources,
          execution_prompt_required: executionRequired,
          execution_prompt_slug_allowlist: executionSlugAllowlist,
        },
      }
    }
  }

  return {
    outcome: 'allow',
    reason: null,
    checks,
    customer_id: policy.customer_id,
    primary_capability_id: capabilityId,
    policy: {
      allow_local_stub_intent: policy.allow_local_stub_intent,
      allowed_intent_sources: policy.allowed_intent_sources,
      allowed_execution_sources: policy.allowed_execution_sources,
      execution_prompt_required: executionRequired,
      execution_prompt_slug_allowlist: executionSlugAllowlist,
    },
  }
}

export function attachPromptPolicy(params: {
  payload: Record<string, unknown>
  promptPolicy: PromptPolicyDecision
}): Record<string, unknown> {
  const data = params.payload.data && typeof params.payload.data === 'object' ? (params.payload.data as Record<string, unknown>) : {}
  const meta = data.meta && typeof data.meta === 'object' ? (data.meta as Record<string, unknown>) : {}
  return {
    ...params.payload,
    data: {
      ...data,
      meta: {
        ...meta,
        prompt_policy: params.promptPolicy,
      },
    },
  }
}
