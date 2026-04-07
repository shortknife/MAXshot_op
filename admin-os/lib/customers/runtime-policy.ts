import type { CustomerAuthPosture } from '@/lib/customers/auth'
import { buildAuthPostureMeta, loadCustomerAuthPosture } from '@/lib/customers/auth'
import type { CustomerClarificationPosture } from '@/lib/customers/clarification'
import { loadCustomerClarificationPosture } from '@/lib/customers/clarification'
import type { CustomerDeliveryPosture } from '@/lib/customers/delivery'
import { loadCustomerDeliveryPosture } from '@/lib/customers/delivery'
import type { CustomerReviewPosture } from '@/lib/customers/review'
import { loadCustomerReviewPosture } from '@/lib/customers/review'
import type { CustomerWorkspacePreset } from '@/lib/customers/workspace'
import { loadCustomerWorkspacePreset } from '@/lib/customers/workspace'

export type CustomerRuntimePolicyMeta = {
  customer_id: string
  policy_version: string
  primary_plane: string | null
  default_entry_path: string | null
  preferred_capability_count: number
  route_order: string[]
  focused_surface_count: number
  has_delivery_posture: boolean
  has_review_posture: boolean
  has_clarification_posture: boolean
  has_auth_posture: boolean
  auth_primary_method: string | null
  auth_verification_posture: string | null
  delivery_summary_style: string | null
  review_escalation_style: string | null
  clarification_style: string | null
}

export type CustomerDefaultExperience = {
  customer_id: string
  policy_version: string
  summary: string
  primary_plane: string | null
  default_entry_path: string | null
  quick_queries: string[]
  focused_surfaces: string[]
  preferred_capabilities: string[]
  recommended_route_order: string[]
  composer_hint: string
  workspace_notes: string[]
}

export type CustomerAuthDefaultExperience = {
  customer_id: string
  policy_version: string
  primary_plane: string | null
  primary_auth_method: string | null
  verification_posture: string | null
  wallet_posture: string | null
  summary: string | null
  entry_hint: string | null
  recovery_actions: string[]
}


export type CustomerPolicyEvidence = {
  customer_id: string
  policy_version: string
  summary: string
  primary_plane: string | null
  default_entry_path: string | null
  auth_primary_method: string | null
  auth_verification_posture: string | null
  delivery_summary_style: string | null
  review_escalation_style: string | null
  clarification_style: string | null
  focused_surfaces: string[]
  recommended_route_order: string[]
  preferred_capability_count: number
}

export type CustomerRuntimePolicy = {
  customer_id: string
  policy_version: string
  workspace: CustomerWorkspacePreset | null
  delivery: CustomerDeliveryPosture | null
  review: CustomerReviewPosture | null
  clarification: CustomerClarificationPosture | null
  auth: CustomerAuthPosture | null
  primary_plane: string | null
  default_entry_path: string | null
  preferred_capabilities: string[]
  recommended_route_order: string[]
  focused_surfaces: string[]
}


function sentenceCase(value: string | null | undefined): string {
  const normalized = String(value || '').trim().replace(/[_-]+/g, ' ')
  if (!normalized) return ''
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function derivePolicyVersion(parts: Array<{ file_path?: string | null; [key: string]: unknown } | null>): string {
  const versions = parts
    .map((part) => String((part as { [key: string]: unknown } | null)?.file_path || '').trim())
    .filter(Boolean)
    .length
  return versions > 0 ? `1.${versions}` : '1.0'
}

export async function loadCustomerRuntimePolicy(customerId: string | null | undefined): Promise<CustomerRuntimePolicy | null> {
  if (!customerId) return null
  const [workspace, delivery, review, clarification, auth] = await Promise.all([
    loadCustomerWorkspacePreset(customerId),
    loadCustomerDeliveryPosture(customerId),
    loadCustomerReviewPosture(customerId),
    loadCustomerClarificationPosture(customerId),
    loadCustomerAuthPosture(customerId),
  ])

  return {
    customer_id: customerId,
    policy_version: derivePolicyVersion([workspace, delivery, review, clarification, auth]),
    workspace,
    delivery,
    review,
    clarification,
    auth,
    primary_plane: workspace?.primary_plane || null,
    default_entry_path: workspace?.default_entry_path || null,
    preferred_capabilities: uniq(workspace?.preferred_capabilities || []),
    recommended_route_order: uniq(workspace?.recommended_route_order || []),
    focused_surfaces: uniq(workspace?.focused_surfaces || []),
  }
}

export function buildCustomerRuntimePolicyMeta(policy: CustomerRuntimePolicy | null | undefined): CustomerRuntimePolicyMeta | null {
  if (!policy) return null
  return {
    customer_id: policy.customer_id,
    policy_version: policy.policy_version,
    primary_plane: policy.primary_plane,
    default_entry_path: policy.default_entry_path,
    preferred_capability_count: policy.preferred_capabilities.length,
    route_order: policy.recommended_route_order,
    focused_surface_count: policy.focused_surfaces.length,
    has_delivery_posture: Boolean(policy.delivery),
    has_review_posture: Boolean(policy.review),
    has_clarification_posture: Boolean(policy.clarification),
    has_auth_posture: Boolean(policy.auth),
    auth_primary_method: policy.auth?.primary_auth_method || null,
    auth_verification_posture: policy.auth?.verification_posture || null,
    delivery_summary_style: policy.delivery?.summary_style || null,
    review_escalation_style: policy.review?.escalation_style || null,
    clarification_style: policy.clarification?.clarification_style || null,
  }
}


export function selectCustomerWorkspacePreset(policy: CustomerRuntimePolicy | null | undefined): CustomerWorkspacePreset | null {
  return policy?.workspace || null
}

export function selectCustomerDeliveryPosture(policy: CustomerRuntimePolicy | null | undefined): CustomerDeliveryPosture | null {
  return policy?.delivery || null
}

export function selectCustomerReviewPosture(policy: CustomerRuntimePolicy | null | undefined): CustomerReviewPosture | null {
  return policy?.review || null
}

export function selectCustomerClarificationPosture(policy: CustomerRuntimePolicy | null | undefined): CustomerClarificationPosture | null {
  return policy?.clarification || null
}

export function selectCustomerAuthPosture(policy: CustomerRuntimePolicy | null | undefined): CustomerAuthPosture | null {
  return policy?.auth || null
}

export function buildCustomerAuthResponseMeta(policy: CustomerRuntimePolicy | null | undefined): {
  auth_posture: Record<string, unknown> | null
  auth_default_experience: CustomerAuthDefaultExperience | null
  customer_runtime_policy: CustomerRuntimePolicyMeta | null
  customer_policy_evidence: CustomerPolicyEvidence | null
} {
  return {
    auth_posture: buildAuthPostureMeta(selectCustomerAuthPosture(policy)),
    auth_default_experience: buildCustomerAuthDefaultExperience(policy),
    customer_runtime_policy: buildCustomerRuntimePolicyMeta(policy),
    customer_policy_evidence: buildCustomerPolicyEvidence(policy),
  }
}

export function decorateReviewPayloadWithRuntimePolicy<T extends Record<string, unknown>>(
  payload: T | null | undefined,
  policy: CustomerRuntimePolicy | null | undefined,
): T | null {
  if (!payload) return null
  const review = selectCustomerReviewPosture(policy)
  if (!review) return payload
  return {
    ...payload,
    review_queue_label:
      typeof payload.review_queue_label === 'string'
        ? payload.review_queue_label
        : review.review_queue_label,
    escalation_style:
      typeof payload.escalation_style === 'string'
        ? payload.escalation_style
        : review.escalation_style,
    operator_hint:
      typeof payload.operator_hint === 'string'
        ? payload.operator_hint
        : review.operator_hint,
    suggested_actions:
      Array.isArray(payload.suggested_actions) && payload.suggested_actions.length > 0
        ? payload.suggested_actions
        : review.suggested_actions,
  }
}

export function buildCustomerDefaultExperience(policy: CustomerRuntimePolicy | null | undefined): CustomerDefaultExperience | null {
  if (!policy) return null
  const workspace = selectCustomerWorkspacePreset(policy)
  const summary = workspace?.summary || [
    policy.primary_plane ? `Current customer prioritizes ${sentenceCase(policy.primary_plane)} requests.` : null,
    policy.default_entry_path ? `Default entry is ${policy.default_entry_path}.` : null,
    policy.focused_surfaces.length ? `Focus surfaces: ${policy.focused_surfaces.join(', ')}.` : null,
  ].filter(Boolean).join(' ')

  const workspaceNotes = [
    policy.primary_plane ? `Primary plane: ${policy.primary_plane}` : null,
    policy.recommended_route_order.length ? `Recommended route: ${policy.recommended_route_order.join(' -> ')}` : null,
    policy.focused_surfaces.length ? `Focused surfaces: ${policy.focused_surfaces.join(' / ')}` : null,
    policy.auth?.verification_posture ? `Verification posture: ${policy.auth.verification_posture}` : null,
  ].filter(Boolean) as string[]

  const composerHint = policy.default_entry_path
    ? `Current customer default entry: ${policy.default_entry_path}`
    : policy.primary_plane
      ? `Current customer primary plane: ${policy.primary_plane}`
      : 'Continue in natural language; the runtime will keep session context.'

  return {
    customer_id: policy.customer_id,
    policy_version: policy.policy_version,
    summary: summary || 'Customer-aware runtime defaults are active for this workspace.',
    primary_plane: policy.primary_plane,
    default_entry_path: policy.default_entry_path,
    quick_queries: workspace?.quick_queries || [],
    focused_surfaces: policy.focused_surfaces,
    preferred_capabilities: policy.preferred_capabilities,
    recommended_route_order: policy.recommended_route_order,
    composer_hint: composerHint,
    workspace_notes: workspaceNotes,
  }
}


export function buildCustomerPolicyEvidence(policy: CustomerRuntimePolicy | null | undefined): CustomerPolicyEvidence | null {
  if (!policy) return null
  const defaultExperience = buildCustomerDefaultExperience(policy)
  return {
    customer_id: policy.customer_id,
    policy_version: policy.policy_version,
    summary: defaultExperience?.summary || 'Customer runtime policy is active for this workspace.',
    primary_plane: policy.primary_plane,
    default_entry_path: policy.default_entry_path,
    auth_primary_method: policy.auth?.primary_auth_method || null,
    auth_verification_posture: policy.auth?.verification_posture || null,
    delivery_summary_style: policy.delivery?.summary_style || null,
    review_escalation_style: policy.review?.escalation_style || null,
    clarification_style: policy.clarification?.clarification_style || null,
    focused_surfaces: policy.focused_surfaces,
    recommended_route_order: policy.recommended_route_order,
    preferred_capability_count: policy.preferred_capabilities.length,
  }
}

export function buildCustomerAuthDefaultExperience(policy: CustomerRuntimePolicy | null | undefined): CustomerAuthDefaultExperience | null {
  if (!policy?.auth) return null
  return {
    customer_id: policy.customer_id,
    policy_version: policy.policy_version,
    primary_plane: policy.primary_plane,
    primary_auth_method: policy.auth.primary_auth_method,
    verification_posture: policy.auth.verification_posture,
    wallet_posture: policy.auth.wallet_posture,
    summary: policy.auth.summary,
    entry_hint: policy.auth.entry_hint,
    recovery_actions: policy.auth.recovery_actions,
  }
}


export async function decorateWithCustomerDefaultExperience<T extends { customer_id?: string | null }>(
  rows: T[],
): Promise<Array<T & { customer_default_experience: CustomerDefaultExperience | null }>> {
  const cache = new Map<string, CustomerDefaultExperience | null>()
  const decorated = await Promise.all(rows.map(async (row) => {
    const customerId = typeof row.customer_id === 'string' ? row.customer_id : null
    if (!customerId) return { ...row, customer_default_experience: null }
    if (!cache.has(customerId)) {
      const policy = await loadCustomerRuntimePolicy(customerId)
      cache.set(customerId, buildCustomerDefaultExperience(policy))
    }
    return {
      ...row,
      customer_default_experience: cache.get(customerId) || null,
    }
  }))
  return decorated
}

export async function decorateWithCustomerPolicyEvidence<T extends { customer_id?: string | null }>(
  rows: T[],
): Promise<Array<T & { customer_policy_evidence: CustomerPolicyEvidence | null }>> {
  const cache = new Map<string, CustomerPolicyEvidence | null>()
  const decorated = await Promise.all(rows.map(async (row) => {
    const customerId = typeof row.customer_id === 'string' ? row.customer_id : null
    if (!customerId) return { ...row, customer_policy_evidence: null }
    if (!cache.has(customerId)) {
      const policy = await loadCustomerRuntimePolicy(customerId)
      cache.set(customerId, buildCustomerPolicyEvidence(policy))
    }
    return {
      ...row,
      customer_policy_evidence: cache.get(customerId) || null,
    }
  }))
  return decorated
}
