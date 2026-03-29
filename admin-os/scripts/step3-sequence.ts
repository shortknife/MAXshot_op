import { runChatAsk } from '@/lib/chat/chat-ask-service'
import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'
import { getClarificationSessionId } from '@/lib/chat/query-clarification'
import process from 'node:process'
import { randomUUID } from 'node:crypto'

type TurnResult = {
  raw_query: string
  capability: {
    matched_capability_id: string | null
    matched_capability_ids: string[]
  }
  slots: Record<string, unknown>
  need_clarification: boolean
  out_of_scope: boolean
  executable: boolean
  required_slots: string[]
  query_contract: {
    ready: boolean | null
    missing_slots: string[]
  }
  verdict: string
}

function parseArgs(argv: string[]) {
  const args = [...argv]
  let sessionId: string | null = null
  const queries: string[] = []
  while (args.length) {
    const a = args.shift()!
    if (a === '--session') {
      sessionId = args.shift() || null
      continue
    }
    queries.push(a)
  }
  return { sessionId, queries }
}

function pickRequiredSlots(meta: Record<string, unknown>): string[] {
  const value = meta.required_slots
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  return []
}

function readQueryContract(meta: Record<string, unknown>) {
  const qc = (meta.query_contract || null) as any
  const ready = typeof qc?.completeness?.ready === 'boolean' ? qc.completeness.ready : null
  const missingSlots = Array.isArray(qc?.completeness?.missing_slots)
    ? qc.completeness.missing_slots.map((v: unknown) => String(v)).filter(Boolean)
    : []
  return { ready, missingSlots }
}

function buildVerdict(params: {
  inScope: boolean
  intentType: string
  modelNeedClarification: boolean
  runtimeError: string | null
  requiredSlots: string[]
  queryContractReady: boolean | null
  queryContractMissingSlots: string[]
  success: boolean
}) {
  const outOfScope = !params.inScope || params.intentType === 'out_of_scope'
  const needsClarification =
    params.modelNeedClarification ||
    params.runtimeError === 'missing_required_clarification' ||
    params.requiredSlots.length > 0 ||
    params.queryContractMissingSlots.length > 0
  const executable = !outOfScope && !needsClarification && params.success && (params.queryContractReady !== false)
  const clarificationSlots =
    params.requiredSlots.length > 0 ? params.requiredSlots : params.queryContractMissingSlots
  const verdict = outOfScope
    ? 'out_of_scope'
    : needsClarification
      ? `needs_clarification:${clarificationSlots.join(',') || 'unknown'}`
      : executable
        ? 'executable'
        : `not_executable:${params.runtimeError || 'unknown'}`
  return { outOfScope, needsClarification, executable, verdict }
}

async function inspectOne(rawQuery: string, sessionId: string): Promise<TurnResult> {
  const prepared = await prepareChatRequest({
    rawQuery,
    sessionId,
    looksLikeContentBrief: () => false,
  })
  const runtimeRes = await runChatAsk({ raw_query: rawQuery, session_id: sessionId })
  const body = (runtimeRes.body || {}) as any
  const data = body?.data || {}
  const meta = (data?.meta || {}) as Record<string, unknown>
  const requiredSlots = pickRequiredSlots(meta)
  const qc = readQueryContract(meta)
  const verdict = buildVerdict({
    inScope: Boolean(prepared.step3.in_scope),
    intentType: String(prepared.step3.intent_type || ''),
    modelNeedClarification: Boolean(prepared.step3.need_clarification),
    runtimeError: typeof data?.error === 'string' ? data.error : null,
    requiredSlots,
    queryContractReady: qc.ready,
    queryContractMissingSlots: qc.missingSlots,
    success: Boolean(body?.success),
  })

  return {
    raw_query: rawQuery,
    capability: {
      matched_capability_id: prepared.step3.matched_capability_id || null,
      matched_capability_ids: Array.isArray(prepared.step3.matched_capability_ids)
        ? prepared.step3.matched_capability_ids
        : [],
    },
    slots: (prepared.step3.slots || {}) as Record<string, unknown>,
    need_clarification: verdict.needsClarification,
    out_of_scope: verdict.outOfScope,
    executable: verdict.executable,
    required_slots: requiredSlots,
    query_contract: {
      ready: qc.ready,
      missing_slots: qc.missingSlots,
    },
    verdict: verdict.verdict,
  }
}

async function main() {
  const { sessionId: explicitSessionId, queries } = parseArgs(process.argv.slice(2))
  if (queries.length === 0) {
    console.error('Usage: npx tsx scripts/step3-sequence.ts [--session <id>] "<query1>" "<query2>" ...')
    process.exit(2)
  }

  const sessionId = getClarificationSessionId(explicitSessionId) || `step3-seq-${randomUUID()}`
  const results: TurnResult[] = []
  for (const query of queries) {
    results.push(await inspectOne(query, sessionId))
  }

  process.stdout.write(
    JSON.stringify(
      {
        session_id: sessionId,
        turns: results,
      },
      null,
      2
    ) + '\n'
  )
}

main().catch((err) => {
  console.error(String(err?.stack || err))
  process.exit(1)
})
