import { prepareChatRequest } from '@/lib/chat/chat-request-preprocess'
import { runChatAsk } from '@/lib/chat/chat-ask-service'

type TurnCheck = {
  query: string
  expect: {
    capability?: string | null
    scope?: string
    metric?: string
    aggregation?: string
    chain?: string
    needClarification?: boolean
    outOfScope?: boolean
    requiredSlots?: string[]
    queryContractReady?: boolean | null
  }
}

type CaseDef = {
  id: string
  level: 'mvp_must' | 'mvp_tolerated'
  title: string
  turns: TurnCheck[]
}

type TurnObserved = {
  query: string
  capability: string | null
  slots: Record<string, unknown>
  needClarification: boolean
  outOfScope: boolean
  requiredSlots: string[]
  queryContractReady: boolean | null
  verdict: string
}

const CASES: CaseDef[] = [
  {
    id: 'must-01',
    level: 'mvp_must',
    title: 'single-goal business query is executable in contract terms',
    turns: [
      {
        query: '3月第一周的平均APY是多少？',
        expect: {
          capability: 'capability.data_fact_query',
          scope: 'yield',
          metric: 'apy',
          aggregation: 'avg',
          needClarification: false,
          outOfScope: false,
          queryContractReady: true,
        },
      },
    ],
  },
  {
    id: 'must-02',
    level: 'mvp_must',
    title: 'under-specified yield query asks clarification',
    turns: [
      {
        query: '当前 vault APY 怎么样？',
        expect: {
          capability: 'capability.data_fact_query',
          scope: 'yield',
          metric: 'apy',
          needClarification: true,
          outOfScope: false,
          requiredSlots: ['time_window', 'metric_agg'],
          queryContractReady: null,
        },
      },
    ],
  },
  {
    id: 'must-03',
    level: 'mvp_must',
    title: 'product definition stays in general_qna',
    turns: [
      {
        query: '你能描述什么是MAXshot么？',
        expect: {
          capability: 'capability.product_doc_qna',
          needClarification: false,
          outOfScope: false,
        },
      },
    ],
  },
  {
    id: 'must-04',
    level: 'mvp_must',
    title: 'vault-list follow-up inherits business meaning',
    turns: [
      {
        query: '现在ARB链上有那几个Vault？',
        expect: {
          capability: 'capability.data_fact_query',
          scope: 'vault',
          metric: 'vault_list',
          chain: 'arbitrum',
          outOfScope: false,
        },
      },
      {
        query: 'Base呢？',
        expect: {
          capability: 'capability.data_fact_query',
          scope: 'vault',
          metric: 'vault_list',
          chain: 'base',
          needClarification: false,
          outOfScope: false,
        },
      },
    ],
  },
  {
    id: 'tol-01',
    level: 'mvp_tolerated',
    title: 'multi-goal APY query degrades to clarification',
    turns: [
      {
        query: '3月份的APY均值是多少？最高和最低分别是多少？',
        expect: {
          capability: 'capability.data_fact_query',
          needClarification: true,
          outOfScope: false,
          requiredSlots: ['primary_goal'],
        },
      },
    ],
  },
  {
    id: 'tol-02',
    level: 'mvp_tolerated',
    title: 'cross-period delta ranking degrades to clarification',
    turns: [
      {
        query: '2月份和3月份比较的话，那个vault TVL 提高最多呢？以当月最高的TVL计算即可！',
        expect: {
          capability: 'capability.data_fact_query',
          needClarification: true,
          outOfScope: false,
          requiredSlots: ['primary_goal'],
        },
      },
    ],
  },
]

function pickRequiredSlots(meta: Record<string, unknown>): string[] {
  const value = meta.required_slots
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v)).filter(Boolean)
}

function readQueryContractReady(meta: Record<string, unknown>): boolean | null {
  const qc = (meta.query_contract || null) as any
  return typeof qc?.completeness?.ready === 'boolean' ? qc.completeness.ready : null
}

async function observeTurn(sessionId: string, query: string): Promise<TurnObserved> {
  const prepared = await prepareChatRequest({
    rawQuery: query,
    sessionId,
    looksLikeContentBrief: () => false,
  })
  const runtimeRes = await runChatAsk({ raw_query: query, session_id: sessionId })
  const body = (runtimeRes.body || {}) as any
  const data = body?.data || {}
  const meta = (data?.meta || {}) as Record<string, unknown>
  const requiredSlots = pickRequiredSlots(meta)
  const queryContractReady = readQueryContractReady(meta)
  const needClarification =
    Boolean(prepared.step3.need_clarification) ||
    data?.error === 'missing_required_clarification' ||
    requiredSlots.length > 0
  const outOfScope = !prepared.step3.in_scope || prepared.step3.intent_type === 'out_of_scope'
  const verdict = outOfScope
    ? 'out_of_scope'
    : needClarification
      ? `needs_clarification:${requiredSlots.join(',') || 'unknown'}`
      : body?.success
        ? 'executable'
        : `not_executable:${String(data?.error || 'unknown')}`

  return {
    query,
    capability: prepared.step3.matched_capability_id || null,
    slots: (prepared.step3.slots || {}) as Record<string, unknown>,
    needClarification,
    outOfScope,
    requiredSlots,
    queryContractReady,
    verdict,
  }
}

function includesAll(actual: string[], expected: string[]) {
  return expected.every((value) => actual.includes(value))
}

function assertTurn(observed: TurnObserved, expected: TurnCheck['expect']): string[] {
  const failures: string[] = []
  if (expected.capability !== undefined && observed.capability !== expected.capability) {
    failures.push(`capability expected=${expected.capability} actual=${observed.capability}`)
  }
  if (expected.scope !== undefined && String(observed.slots.scope || '') !== expected.scope) {
    failures.push(`scope expected=${expected.scope} actual=${String(observed.slots.scope || '')}`)
  }
  if (expected.metric !== undefined && String(observed.slots.metric || '') !== expected.metric) {
    failures.push(`metric expected=${expected.metric} actual=${String(observed.slots.metric || '')}`)
  }
  const agg = String(observed.slots.aggregation || observed.slots.metric_agg || '')
  if (expected.aggregation !== undefined && agg !== expected.aggregation) {
    failures.push(`aggregation expected=${expected.aggregation} actual=${agg}`)
  }
  if (expected.chain !== undefined && String(observed.slots.chain || '') !== expected.chain) {
    failures.push(`chain expected=${expected.chain} actual=${String(observed.slots.chain || '')}`)
  }
  if (expected.needClarification !== undefined && observed.needClarification !== expected.needClarification) {
    failures.push(`needClarification expected=${expected.needClarification} actual=${observed.needClarification}`)
  }
  if (expected.outOfScope !== undefined && observed.outOfScope !== expected.outOfScope) {
    failures.push(`outOfScope expected=${expected.outOfScope} actual=${observed.outOfScope}`)
  }
  if (expected.requiredSlots && !includesAll(observed.requiredSlots, expected.requiredSlots)) {
    failures.push(`requiredSlots expected~=${expected.requiredSlots.join(',')} actual=${observed.requiredSlots.join(',')}`)
  }
  if (expected.queryContractReady !== undefined && observed.queryContractReady !== expected.queryContractReady) {
    failures.push(`queryContractReady expected=${expected.queryContractReady} actual=${observed.queryContractReady}`)
  }
  return failures
}

async function main() {
  let total = 0
  let passed = 0
  const report: Array<Record<string, unknown>> = []

  for (const testCase of CASES) {
    const sessionId = `step3-mvp-${testCase.id}`
    const caseTurns: Array<Record<string, unknown>> = []
    let casePassed = true

    for (const turn of testCase.turns) {
      total += 1
      const observed = await observeTurn(sessionId, turn.query)
      const failures = assertTurn(observed, turn.expect)
      const ok = failures.length === 0
      if (ok) passed += 1
      else casePassed = false
      caseTurns.push({
        query: turn.query,
        ok,
        failures,
        observed,
      })
    }

    report.push({
      id: testCase.id,
      level: testCase.level,
      title: testCase.title,
      ok: casePassed,
      turns: caseTurns,
    })
  }

  const failed = total - passed
  process.stdout.write(
    JSON.stringify(
      {
        total,
        passed,
        failed,
        cases: report,
      },
      null,
      2
    ) + '\n'
  )

  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(String(err?.stack || err))
  process.exit(1)
})
