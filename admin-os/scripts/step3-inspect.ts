import { runChatAsk } from '@/lib/chat/chat-ask-service'
import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'
import { getClarificationSessionId } from '@/lib/chat/query-clarification'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

type InspectResult = {
  input: {
    raw_query: string
    session_id: string
  }
  step3: {
    intent_type: string
    matched_capability_id: string | null
    matched_capability_ids: string[]
    in_scope: boolean
    need_clarification: boolean
    slots: Record<string, unknown>
    confidence: number
    trace: unknown
  }
  runtime: {
    success: boolean
    type: string | null
    error: string | null
    summary: string | null
    meta: Record<string, unknown>
    required_slots: string[]
    query_contract_ready: boolean | null
    query_contract_missing_slots: string[]
  }
  verdict: {
    out_of_scope: boolean
    needs_clarification: boolean
    executable: boolean
    reason: string
  }
}

function parseArgs(argv: string[]) {
  const args = [...argv]
  let sessionId: string | null = null
  let json = false
  const queryParts: string[] = []
  while (args.length) {
    const a = args.shift()!
    if (a === '--json') {
      json = true
      continue
    }
    if (a === '--session') {
      sessionId = args.shift() || null
      continue
    }
    queryParts.push(a)
  }
  return { sessionId, json, rawQuery: queryParts.join(' ').trim() }
}

function pickRequiredSlots(meta: Record<string, unknown>): string[] {
  const value = meta.required_slots
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  return []
}

function readQueryContract(meta: Record<string, unknown>): {
  ready: boolean | null
  missingSlots: string[]
} {
  const qc = (meta.query_contract || null) as any
  const ready = typeof qc?.completeness?.ready === 'boolean' ? qc.completeness.ready : null
  const missing = Array.isArray(qc?.completeness?.missing_slots)
    ? qc.completeness.missing_slots.map((v: any) => String(v)).filter(Boolean)
    : []
  return { ready, missingSlots: missing }
}

function buildVerdict(params: {
  step3: InspectResult['step3']
  runtime: InspectResult['runtime']
}): InspectResult['verdict'] {
  const { step3, runtime } = params
  const outOfScope = step3.in_scope === false || step3.intent_type === 'out_of_scope'
  const needsClarification =
    step3.need_clarification === true ||
    runtime.error === 'missing_required_clarification' ||
    runtime.required_slots.length > 0 ||
    runtime.query_contract_missing_slots.length > 0
  const executable =
    !outOfScope &&
    !needsClarification &&
    runtime.success === true &&
    (runtime.query_contract_ready === true || runtime.query_contract_ready === null)
  const clarificationSlots =
    runtime.required_slots.length > 0 ? runtime.required_slots : runtime.query_contract_missing_slots
  const reason = outOfScope
    ? 'out_of_scope'
    : needsClarification
      ? `needs_clarification:${clarificationSlots.join(',') || 'unknown'}`
      : executable
        ? 'executable'
        : `not_executable:${runtime.error || 'unknown'}`
  return { out_of_scope: outOfScope, needs_clarification: needsClarification, executable, reason }
}

async function loadOrCreateSessionId(explicit: string | null): Promise<string> {
  const normalized = getClarificationSessionId(explicit)
  if (normalized) return normalized
  const stateFile = path.join(os.tmpdir(), 'maxshot_step3_session_id.txt')
  try {
    const existing = (await fs.readFile(stateFile, 'utf8')).trim()
    if (existing) return existing
  } catch {
    // ignore
  }
  const created = `step3-${randomUUID()}`
  await fs.writeFile(stateFile, created, 'utf8')
  return created
}

async function main() {
  const { sessionId: explicitSessionId, json, rawQuery } = parseArgs(process.argv.slice(2))
  if (!rawQuery) {
    // Keep output stable for scripts/pipes.
    console.error('Usage: npx tsx scripts/step3-inspect.ts [--session <id>] [--json] "<raw_query>"')
    process.exit(2)
  }

  const sessionId = await loadOrCreateSessionId(explicitSessionId)

  // Step3: intent harness view (pre-router)
  const prepared = await prepareChatRequest({
    rawQuery,
    sessionId,
    looksLikeContentBrief: () => false,
  })

  // Runtime: full /api/chat/ask pipeline
  const runtimeRes = await runChatAsk({ raw_query: rawQuery, session_id: sessionId })
  const body = (runtimeRes.body || {}) as any
  const data = body?.data || {}
  const meta = (data?.meta || {}) as Record<string, unknown>
  const requiredSlots = pickRequiredSlots(meta)
  const qc = readQueryContract(meta)

  const result: InspectResult = {
    input: { raw_query: rawQuery, session_id: sessionId },
    step3: {
      intent_type: String(prepared.step3.intent_type || ''),
      matched_capability_id: prepared.step3.matched_capability_id || null,
      matched_capability_ids: Array.isArray(prepared.step3.matched_capability_ids)
        ? prepared.step3.matched_capability_ids
        : [],
      in_scope: Boolean(prepared.step3.in_scope),
      need_clarification: Boolean(prepared.step3.need_clarification),
      slots: (prepared.step3.slots || {}) as Record<string, unknown>,
      confidence: Number(prepared.step3.confidence || 0),
      trace: prepared.step3.trace || null,
    },
    runtime: {
      success: Boolean(body?.success),
      type: typeof data?.type === 'string' ? data.type : null,
      error: typeof data?.error === 'string' ? data.error : null,
      summary: typeof data?.summary === 'string' ? data.summary : null,
      meta,
      required_slots: requiredSlots,
      query_contract_ready: qc.ready,
      query_contract_missing_slots: qc.missingSlots,
    },
    verdict: { out_of_scope: false, needs_clarification: false, executable: false, reason: '' },
  }

  result.verdict = buildVerdict({ step3: result.step3, runtime: result.runtime })

  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  const compact = {
    input: result.input,
    capability: {
      matched_capability_id: result.step3.matched_capability_id,
      matched_capability_ids: result.step3.matched_capability_ids,
    },
    slots: result.step3.slots,
    need_clarification: result.step3.need_clarification || result.runtime.error === 'missing_required_clarification',
    out_of_scope: result.verdict.out_of_scope,
    executable: result.verdict.executable,
    required_slots: result.runtime.required_slots,
    query_contract: {
      ready: result.runtime.query_contract_ready,
      missing_slots: result.runtime.query_contract_missing_slots,
    },
    verdict: result.verdict.reason,
  }

  process.stdout.write(JSON.stringify(compact, null, 2) + '\n')

  // Short sleep to reduce accidental rate bursts if user loops quickly.
  await delay(50)
}

main().catch((err) => {
  console.error(String(err?.stack || err))
  process.exit(1)
})
