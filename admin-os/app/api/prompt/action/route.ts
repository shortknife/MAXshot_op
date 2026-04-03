import { NextRequest, NextResponse } from 'next/server'

import { assertWriteEnabled } from '@/lib/utils'
import { releasePromptVersion, type PromptReleaseAction } from '@/lib/prompts/release'

function isValidAction(action: string): action is PromptReleaseAction {
  return action === 'release' || action === 'rollback'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const action = String(body.action || '').trim()
    const slug = String(body.slug || '').trim()
    const targetVersion = String(body.target_version || '').trim()
    const operatorId = String(body.operator_id || '').trim()
    const confirmToken = String(body.confirm_token || '').trim()
    const releaseNote = String(body.release_note || '').trim() || null
    const approved = body.approved === true

    if (!isValidAction(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }
    if (!slug || !targetVersion) {
      return NextResponse.json({ error: 'missing_prompt_release_target' }, { status: 400 })
    }
    if (!approved) {
      return NextResponse.json({ error: 'approval_required' }, { status: 400 })
    }

    assertWriteEnabled({ operatorId, confirmToken })

    const released = await releasePromptVersion({
      slug,
      target_version: targetVersion,
      action,
      operator_id: operatorId,
      release_note: releaseNote,
    })

    if (!released) {
      return NextResponse.json({ error: 'prompt_release_unavailable' }, { status: 503 })
    }

    return NextResponse.json(released)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'prompt_release_action_failed'
    if (message === 'write_lane_busy') {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message === 'operator_platform_scope_not_allowed') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message === 'capability_policy_not_found' || message === 'capability_not_mutation_enabled') {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    if (message === 'prompt_version_already_active' || message === 'prompt_rollback_requires_active_version') {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
