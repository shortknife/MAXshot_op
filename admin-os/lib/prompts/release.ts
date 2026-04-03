import { supabase } from '@/lib/supabase'
import { assertOperatorPlatformAccess } from '@/lib/customers/access'
import { assertCapabilityMutationPolicy } from '@/lib/router/capability-policy'
import { acquireWriteLane, releaseWriteLane } from '@/lib/router/write-lane'

const PROMPT_LIBRARY_TABLE = 'prompt_library'
const PROMPT_RELEASE_EVENTS_TABLE = 'prompt_release_events_op'
const PROMPT_RELEASE_EVENTS_LIMIT = 50

export type PromptReleaseAction = 'release' | 'rollback'

export type PromptVersionRecord = {
  slug: string
  name: string
  version: string
  is_active: boolean
  updated_at: string | null
  updated_by: string | null
  editable: boolean
  action_hint: 'release' | 'rollback' | 'none'
}

export type PromptReleaseEvent = {
  event_id: string
  slug: string
  action: PromptReleaseAction
  target_version: string
  previous_version: string | null
  operator_id: string
  release_note: string | null
  created_at: string
}

export type PromptReleaseResult = {
  slug: string
  action: PromptReleaseAction
  target_version: string
  previous_version: string | null
  active_version: string
  event_id: string | null
  release_source: 'supabase'
}

type PromptLibraryRow = {
  slug: string
  name: string | null
  version: string
  is_active: boolean | null
  updated_at: string | null
  updated_by: string | null
}

function compareVersionDesc(left: string, right: string) {
  const leftNum = Number(left)
  const rightNum = Number(right)
  if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) return rightNum - leftNum
  return right.localeCompare(left)
}

function compareVersionAsc(left: string, right: string) {
  return -compareVersionDesc(left, right)
}

function isRecoverablePromptError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '')
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''
  return (
    code.startsWith('PGRST') ||
    message.includes('Missing Supabase environment variables') ||
    message.includes(PROMPT_LIBRARY_TABLE) ||
    message.includes(PROMPT_RELEASE_EVENTS_TABLE) ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('PGRST')
  )
}

function buildPromptReleaseEventId() {
  return `prompt-release-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function loadPromptVersionHistory(): Promise<Record<string, PromptVersionRecord[]>> {
  try {
    const { data, error } = await supabase
      .from(PROMPT_LIBRARY_TABLE)
      .select('slug,name,version,is_active,updated_at,updated_by')
      .order('slug', { ascending: true })
      .order('updated_at', { ascending: false })

    if (error) throw error
    if (!Array.isArray(data) || data.length === 0) return {}

    const grouped = new Map<string, PromptVersionRecord[]>()
    for (const row of data as PromptLibraryRow[]) {
      const slug = String(row.slug || '').trim()
      if (!slug) continue
      const current = grouped.get(slug) || []
      current.push({
        slug,
        name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : slug,
        version: String(row.version || ''),
        is_active: row.is_active === true,
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
        updated_by: typeof row.updated_by === 'string' ? row.updated_by : null,
        editable: true,
        action_hint: 'none',
      })
      grouped.set(slug, current)
    }

    const output: Record<string, PromptVersionRecord[]> = {}
    for (const [slug, versions] of grouped.entries()) {
      versions.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        return compareVersionDesc(a.version, b.version)
      })
      const active = versions.find((item) => item.is_active) || null
      output[slug] = versions.map((item) => ({
        ...item,
        action_hint: !active || item.is_active
          ? 'none'
          : compareVersionAsc(item.version, active.version) < 0
            ? 'rollback'
            : 'release',
      }))
    }

    return output
  } catch (error) {
    if (!isRecoverablePromptError(error)) throw error
    return {}
  }
}

export async function loadPromptReleaseEvents(): Promise<PromptReleaseEvent[]> {
  try {
    const { data, error } = await supabase
      .from(PROMPT_RELEASE_EVENTS_TABLE)
      .select('event_id,slug,action,target_version,previous_version,operator_id,release_note,created_at')
      .order('created_at', { ascending: false })
      .limit(PROMPT_RELEASE_EVENTS_LIMIT)

    if (error) throw error
    if (!Array.isArray(data)) return []
    return data.map((row) => ({
      event_id: String((row as Record<string, unknown>).event_id || ''),
      slug: String((row as Record<string, unknown>).slug || ''),
      action: String((row as Record<string, unknown>).action || 'release') as PromptReleaseAction,
      target_version: String((row as Record<string, unknown>).target_version || ''),
      previous_version: typeof (row as Record<string, unknown>).previous_version === 'string' ? String((row as Record<string, unknown>).previous_version) : null,
      operator_id: String((row as Record<string, unknown>).operator_id || ''),
      release_note: typeof (row as Record<string, unknown>).release_note === 'string' ? String((row as Record<string, unknown>).release_note) : null,
      created_at: String((row as Record<string, unknown>).created_at || ''),
    }))
  } catch (error) {
    if (!isRecoverablePromptError(error)) throw error
    return []
  }
}

export async function releasePromptVersion(params: {
  slug: string
  target_version: string
  action: PromptReleaseAction
  operator_id: string
  release_note?: string | null
}): Promise<PromptReleaseResult | null> {
  const slug = params.slug.trim()
  const targetVersion = params.target_version.trim()
  if (!slug || !targetVersion) return null

  assertOperatorPlatformAccess(params.operator_id)
  assertCapabilityMutationPolicy({ capabilityId: 'capability.prompt_governance_mutation', customerId: null })

  const lease = await acquireWriteLane({
    capabilityId: 'capability.prompt_governance_mutation',
    customerId: null,
    operatorId: params.operator_id,
  })

  try {
    const { data, error } = await supabase
      .from(PROMPT_LIBRARY_TABLE)
      .select('slug,name,version,is_active,updated_at,updated_by')
      .eq('slug', slug)

    if (error) throw error
    if (!Array.isArray(data) || data.length === 0) return null

    const rows = data as PromptLibraryRow[]
    const target = rows.find((row) => String(row.version || '') === targetVersion)
    if (!target) return null

    const previousActive = rows.find((row) => row.is_active === true) || null
    if (previousActive && String(previousActive.version || '') === targetVersion) {
      throw new Error('prompt_version_already_active')
    }
    if (params.action === 'rollback' && !previousActive) {
      throw new Error('prompt_rollback_requires_active_version')
    }

    const now = new Date().toISOString()
    const { error: deactivateError } = await supabase
      .from(PROMPT_LIBRARY_TABLE)
      .update({ is_active: false })
      .eq('slug', slug)
      .eq('is_active', true)

    if (deactivateError) throw deactivateError

    const { error: activateError } = await supabase
      .from(PROMPT_LIBRARY_TABLE)
      .update({ is_active: true, updated_at: now, updated_by: params.operator_id })
      .eq('slug', slug)
      .eq('version', targetVersion)

    if (activateError) throw activateError

    const eventId = buildPromptReleaseEventId()
    try {
      const { error: eventError } = await supabase.from(PROMPT_RELEASE_EVENTS_TABLE).insert({
        event_id: eventId,
        slug,
        action: params.action,
        target_version: targetVersion,
        previous_version: previousActive ? String(previousActive.version || '') : null,
        operator_id: params.operator_id,
        release_note: params.release_note || null,
        created_at: now,
      })
      if (eventError) throw eventError
    } catch (error) {
      if (!isRecoverablePromptError(error)) throw error
    }

    return {
      slug,
      action: params.action,
      target_version: targetVersion,
      previous_version: previousActive ? String(previousActive.version || '') : null,
      active_version: targetVersion,
      event_id: eventId,
      release_source: 'supabase',
    }
  } catch (error) {
    if (!isRecoverablePromptError(error)) throw error
    return null
  } finally {
    await releaseWriteLane(lease)
  }
}
