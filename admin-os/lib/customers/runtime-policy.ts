import type { CustomerAuthPosture } from '@/lib/customers/auth'
import { loadCustomerAuthPosture } from '@/lib/customers/auth'
import type { CustomerClarificationPosture } from '@/lib/customers/clarification'
import { loadCustomerClarificationPosture } from '@/lib/customers/clarification'
import type { CustomerDeliveryPosture } from '@/lib/customers/delivery'
import { loadCustomerDeliveryPosture } from '@/lib/customers/delivery'
import type { CustomerReviewPosture } from '@/lib/customers/review'
import { loadCustomerReviewPosture } from '@/lib/customers/review'
import type { CustomerWorkspacePreset } from '@/lib/customers/workspace'
import { loadCustomerWorkspacePreset } from '@/lib/customers/workspace'

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

export function buildCustomerRuntimePolicyMeta(policy: CustomerRuntimePolicy | null | undefined): Record<string, unknown> | null {
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
