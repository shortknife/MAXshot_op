import { loadLearningAssetSnapshot } from '@/lib/interaction-learning/derivation'
import { loadCustomerMemoryAsset, type CustomerMemoryAsset } from '@/lib/customers/asset-runtime'

export type CustomerLongTermMemoryRef = {
  id: string
  type: 'insight'
  memory_origin: 'customer_profile'
  weight: number
  confidence: number
  recall_priority: 'balanced' | 'customer_first' | 'guided_demo' | 'audit_first'
  content: Record<string, unknown>
}

function arrayOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

export async function buildCustomerLongTermMemory(customerId: string | null | undefined): Promise<CustomerLongTermMemoryRef | null> {
  if (!customerId) return null
  const [asset, snapshot] = await Promise.all([
    loadCustomerMemoryAsset(customerId),
    loadLearningAssetSnapshot(),
  ])

  const profile = snapshot.customer_profiles.find((item) => item.customer_id === customerId) || null
  if (!asset && !profile) return null

  const preferredPlanes = new Set<string>(asset?.preferred_planes || [])
  for (const item of profile?.top_planes || []) {
    if (item.plane && item.plane !== 'unknown') preferredPlanes.add(item.plane)
  }

  const preferredCapabilities = new Set<string>(asset?.preferred_capabilities || [])
  for (const item of profile?.top_capabilities || []) {
    if (item.capability_id && item.capability_id !== 'unknown') preferredCapabilities.add(item.capability_id)
  }

  const issueReasons = profile?.top_issue_reasons.map((item) => item.reason) || []
  const memoryWeight = asset?.recall_priority === 'customer_first' ? 1.08 : asset?.recall_priority === 'guided_demo' ? 0.96 : asset?.recall_priority === 'audit_first' ? 0.94 : profile ? 0.88 : 0.72
  const confidence = profile ? 0.84 : 0.68

  return {
    id: `customer-memory:${customerId}`,
    type: 'insight',
    memory_origin: 'customer_profile',
    weight: memoryWeight,
    confidence,
    recall_priority: asset?.recall_priority || 'balanced',
    content: {
      kind: 'customer_long_term_memory',
      customer_id: customerId,
      summary: asset?.summary || null,
      language_preferences: asset?.language_preferences || [],
      response_style: asset?.response_style || null,
      preferred_planes: [...preferredPlanes],
      preferred_capabilities: [...preferredCapabilities],
      preferred_query_modes: asset?.preferred_query_modes || [],
      preferred_scopes: asset?.preferred_scopes || [],
      recall_priority: asset?.recall_priority || 'balanced',
      recall_focus_tags: asset?.recall_focus_tags || [],
      guardrails: asset?.guardrails || [],
      total_interactions: profile?.total_interactions || 0,
      top_issue_reasons: issueReasons,
      source_files: asset ? [asset.file_path] : [],
    },
  }
}

export async function loadCustomerMemoryWorkbench(customerId: string | null | undefined): Promise<{
  asset: CustomerMemoryAsset | null
  profile: Awaited<ReturnType<typeof loadLearningAssetSnapshot>>['customer_profiles'][number] | null
}> {
  if (!customerId) return { asset: null, profile: null }
  const [asset, snapshot] = await Promise.all([
    loadCustomerMemoryAsset(customerId),
    loadLearningAssetSnapshot(),
  ])
  return {
    asset,
    profile: snapshot.customer_profiles.find((item) => item.customer_id === customerId) || null,
  }
}
