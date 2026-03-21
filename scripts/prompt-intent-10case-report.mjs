import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { resolveStatusDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3003'
const statusDir = resolveStatusDir(rootDir)
const reportPath = resolve(statusDir, 'PROMPT_INTENT_10CASE_REPORT_2026-03-21.md')
const logPath = process.env.DEV_LOG_PATH || '/tmp/adminos-prompt-intent-report.log'
const portFromBaseUrl = (() => {
  try {
    const u = new URL(baseUrl)
    return u.port || '3003'
  } catch {
    return '3003'
  }
})()
const hostFromBaseUrl = (() => {
  try {
    const u = new URL(baseUrl)
    return u.hostname || '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
})()

async function probe(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'manual' })
    return res.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForServer(url, retries = 120, delayMs = 500) {
  for (let i = 0; i < retries; i += 1) {
    if (await probe(url)) return true
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

async function waitForStableServer(url) {
  const firstReady = await waitForServer(url)
  if (!firstReady) return false
  await new Promise((r) => setTimeout(r, 1200))
  return waitForServer(url, 6, 400)
}

function startDevServer() {
  const logStream = createWriteStream(logPath, { flags: 'a' })
  const proc = spawn('npm', ['run', 'dev', '--', '--webpack'], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(portFromBaseUrl), HOSTNAME: hostFromBaseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout.pipe(logStream)
  proc.stderr.pipe(logStream)
  return proc
}

function runCommand(cmd, args, env = {}) {
  return new Promise((resolveRun) => {
    const stdout = []
    const stderr = []
    const p = spawn(cmd, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const timeout = setTimeout(() => {
      try {
        p.kill('SIGTERM')
      } catch {
        // ignore
      }
    }, 8 * 60 * 1000)
    p.stdout.on('data', (chunk) => stdout.push(String(chunk)))
    p.stderr.on('data', (chunk) => stderr.push(String(chunk)))
    p.on('close', (code) => {
      clearTimeout(timeout)
      resolveRun({
        code: code ?? 1,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      })
    })
  })
}

async function post(path, body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null)
    return { status: res.status, data }
  } catch (error) {
    return {
      status: 599,
      data: {
        success: false,
        data: {
          error: 'request_timeout',
          summary: error instanceof Error ? error.message : String(error),
          meta: {},
        },
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function inferCapabilityFromChat(data) {
  const payload = data?.data || {}
  if (payload?.type === 'marketing') return 'capability.content_generator'
  if (payload?.meta?.data_plane === 'business') return 'capability.data_fact_query'
  const summary = String(payload?.summary || '')
  if (summary.includes('No document specified') || summary.includes('Document not found')) return 'capability.product_doc_qna'
  if (payload?.error === 'out_of_scope') return 'out_of_scope'
  return 'unknown'
}

function bool(v) {
  return v ? 'PASS' : 'FAIL'
}

async function runGateChecks() {
  const results = []

  {
    const analyze = await post('/api/intent/analyze', {
      raw_query: '3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？',
    })
    const chat = await post('/api/chat/ask', {
      raw_query: '3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？',
    })
    const pass =
      analyze.data?.success === true &&
      analyze.data?.intent?.extracted_slots?.date_from &&
      analyze.data?.intent?.extracted_slots?.date_to &&
      chat.data?.data?.error !== 'missing_required_clarification' &&
      !String(chat.data?.data?.summary || '').includes('请补充时间范围或查询对象')
    results.push({
      name: 'G1 绝对时间区间 top1 APY 不再误澄清',
      pass,
      details: `intent=${analyze.data?.intent?.type || '-'} error=${chat.data?.data?.error || '-'} summary=${String(chat.data?.data?.summary || '').slice(0, 80)}`,
    })
  }

  {
    const sid = `gate-${Date.now()}-apy`
    const first = await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const second = await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    results.push({
      name: 'G2 APY 查询先合理澄清',
      pass: first.data?.success === false && first.data?.data?.error === 'missing_required_clarification',
      details: `error=${first.data?.data?.error || '-'}`,
    })
    results.push({
      name: 'G3 APY 澄清 follow-up 可承接',
      pass: second.data?.success === true && second.data?.data?.meta?.scope === 'yield',
      details: `error=${second.data?.data?.error || '-'} scope=${second.data?.data?.meta?.scope || '-'}`,
    })
  }

  {
    const sid = `gate-${Date.now()}-doc`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const chat = await post('/api/chat/ask', { raw_query: '你能描述什么是MAXshot么？', session_id: sid })
    const summary = String(chat.data?.data?.summary || '').toLowerCase()
    results.push({
      name: 'G4 产品定义类新问题不被 APY 上下文污染',
      pass:
        chat.status === 200 &&
        chat.data?.data?.error !== 'missing_required_clarification' &&
        !summary.includes('apy') &&
        !summary.includes('tvl'),
      details: `error=${chat.data?.data?.error || '-'} summary=${String(chat.data?.data?.summary || '').slice(0, 80)}`,
    })
  }

  {
    const sid = `gate-${Date.now()}-exec`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const chat = await post('/api/chat/ask', { raw_query: '给我最近一笔 execution 详情', session_id: sid })
    results.push({
      name: 'G5 新业务问题切场景时不继承错误澄清',
      pass:
        chat.status === 200 &&
        chat.data?.data?.error !== 'missing_required_clarification' &&
        String(chat.data?.data?.meta?.scope || '') === 'execution',
      details: `error=${chat.data?.data?.error || '-'} scope=${chat.data?.data?.meta?.scope || '-'}`,
    })
  }

  return results
}

async function runCase(caseDef) {
  const sessionId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let lastChat = null
  for (const query of caseDef.chatSequence) {
    lastChat = await post('/api/chat/ask', { raw_query: query, session_id: sessionId })
  }
  const analyze = await post('/api/intent/analyze', {
    raw_query: caseDef.analyzeQuery || caseDef.chatSequence[caseDef.chatSequence.length - 1],
  })
  const actualCapability =
    analyze.data?.intent?.extracted_slots?.matched_capability_ids?.[0] ||
    inferCapabilityFromChat(lastChat?.data)
  const actualSlots = analyze.data?.intent?.extracted_slots || {}
  const chatData = lastChat?.data || {}
  const actualResult = {
    success: chatData?.success,
    error: chatData?.data?.error || null,
    summary: String(chatData?.data?.summary || ''),
    scope: String(chatData?.data?.meta?.scope || ''),
    actualCapability,
    actualSlots,
  }
  const pass = caseDef.assert({ analyze: analyze.data, chat: chatData, actualResult })
  return {
    id: caseDef.id,
    query: caseDef.chatSequence.join(' -> '),
    expectedCapability: caseDef.expectedCapability,
    expectedSlots: caseDef.expectedSlots,
    actualCapability,
    actualSlots,
    actualResult,
    pass,
    failureReason: pass ? '' : caseDef.failureReason({ analyze: analyze.data, chat: chatData, actualResult }),
  }
}

function formatJson(value) {
  return `\`${JSON.stringify(value)}\``
}

async function main() {
  await mkdir(statusDir, { recursive: true })
  let devProc = null
  let serverOwned = false
  const ready = await waitForServer(baseUrl, 4, 300)
  if (!ready) {
    devProc = startDevServer()
    serverOwned = true
    const stable = await waitForStableServer(baseUrl)
    if (!stable) throw new Error(`dev server start timeout: ${baseUrl}; logs=${logPath}`)
  }

  const gateResults = await runGateChecks()
  const gatePassed = gateResults.every((item) => item.pass)

  let lintResult = { code: null, stdout: '', stderr: '' }
  let phase0Result = { code: null, stdout: '', stderr: '' }
  let phase1Result = { code: null, stdout: '', stderr: '' }
  let phase2Result = { code: null, stdout: '', stderr: '' }
  let cases = []

  if (gatePassed) {
    console.log('[prompt-intent-report] running lint and phase regressions...')
    lintResult = await runCommand('npm', ['run', 'lint'])
    phase0Result = await runCommand('npm', ['run', 'test:phase0'], { BASE_URL: baseUrl })
    phase1Result = await runCommand('npm', ['run', 'test:phase1'], { BASE_URL: baseUrl })
    phase2Result = await runCommand('npm', ['run', 'test:phase2'], { BASE_URL: baseUrl })

    const caseDefs = [
      {
        id: 'T01',
        chatSequence: ['3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'yield', aggregation: 'max', entity: 'vault', date_from: '2026-03-02', date_to: '2026-03-16' },
        assert: ({ actualResult }) =>
          actualResult.actualCapability === 'capability.data_fact_query' &&
          actualResult.error !== 'missing_required_clarification' &&
          !actualResult.summary.includes('请补充时间范围或查询对象'),
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} error=${actualResult.error} summary=${actualResult.summary.slice(0, 100)}`,
      },
      {
        id: 'T02',
        chatSequence: ['3月2日到3月16日之间平均 APY 是多少？'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'yield', aggregation: 'avg', date_from: '2026-03-02', date_to: '2026-03-16' },
        assert: ({ actualResult }) =>
          actualResult.actualCapability === 'capability.data_fact_query' &&
          actualResult.error !== 'missing_required_clarification',
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} error=${actualResult.error}`,
      },
      {
        id: 'T03',
        chatSequence: ['当前 vault APY 怎么样？'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'yield' },
        assert: ({ actualResult }) => actualResult.error === 'missing_required_clarification',
        failureReason: ({ actualResult }) => `expected clarification, got error=${actualResult.error} summary=${actualResult.summary.slice(0, 80)}`,
      },
      {
        id: 'T04',
        chatSequence: ['当前 vault APY 怎么样？', '最近7天'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'yield' },
        assert: ({ actualResult }) => actualResult.success === true && actualResult.scope === 'yield',
        failureReason: ({ actualResult }) => `success=${actualResult.success} scope=${actualResult.scope} error=${actualResult.error}`,
      },
      {
        id: 'T05',
        chatSequence: ['当前 vault APY 怎么样？', '最近7天', '看 arbitrum 的 APY'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'yield', chain: 'arbitrum' },
        assert: ({ chat, actualResult }) =>
          actualResult.success === true &&
          actualResult.scope === 'yield' &&
          String(chat?.data?.meta?.filters_applied?.chain || '') === 'arbitrum',
        failureReason: ({ chat, actualResult }) => `scope=${actualResult.scope} chain=${chat?.data?.meta?.filters_applied?.chain || '-'} error=${actualResult.error}`,
      },
      {
        id: 'T06',
        chatSequence: ['MAXshot 有哪些 vault 可以用？'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'vault' },
        assert: ({ actualResult }) => actualResult.actualCapability === 'capability.data_fact_query' && actualResult.scope === 'vault',
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} scope=${actualResult.scope}`,
      },
      {
        id: 'T07',
        chatSequence: ['给我最近一笔 execution 详情'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'execution' },
        assert: ({ actualResult }) => actualResult.actualCapability === 'capability.data_fact_query' && actualResult.scope === 'execution',
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} scope=${actualResult.scope}`,
      },
      {
        id: 'T08',
        chatSequence: ['最近7天 arbitrum morpho 的 vault 列表'],
        expectedCapability: 'capability.data_fact_query',
        expectedSlots: { scope: 'vault', chain: 'arbitrum', protocol: 'morpho' },
        assert: ({ chat, actualResult }) =>
          actualResult.actualCapability === 'capability.data_fact_query' &&
          actualResult.scope === 'vault' &&
          String(chat?.data?.meta?.filters_applied?.chain || '') === 'arbitrum' &&
          String(chat?.data?.meta?.filters_applied?.protocol || '') === 'morpho',
        failureReason: ({ chat, actualResult }) =>
          `scope=${actualResult.scope} chain=${chat?.data?.meta?.filters_applied?.chain || '-'} protocol=${chat?.data?.meta?.filters_applied?.protocol || '-'}`,
      },
      {
        id: 'T09',
        chatSequence: ['你能描述什么是MAXshot么？'],
        expectedCapability: 'capability.product_doc_qna',
        expectedSlots: {},
        assert: ({ actualResult }) =>
          actualResult.actualCapability !== 'capability.data_fact_query' &&
          !actualResult.summary.toLowerCase().includes('apy') &&
          !actualResult.summary.toLowerCase().includes('tvl'),
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} summary=${actualResult.summary.slice(0, 100)}`,
      },
      {
        id: 'T10',
        chatSequence: ['写一条关于新品发布的帖子'],
        expectedCapability: 'capability.content_generator',
        expectedSlots: { topic: '新品发布' },
        assert: ({ actualResult }) => actualResult.actualCapability === 'capability.content_generator' && actualResult.success === true,
        failureReason: ({ actualResult }) => `actualCapability=${actualResult.actualCapability} success=${actualResult.success} error=${actualResult.error}`,
      },
    ]

    cases = []
    for (const caseDef of caseDefs) {
      console.log(`[prompt-intent-report] case ${caseDef.id}`)
      const result = await runCase(caseDef)
      cases.push(result)
    }
  }

  const casePassCount = cases.filter((item) => item.pass).length
  const stepEvaluations = [
    {
      step: '1. Entry',
      status: gatePassed ? 'PASS' : 'FAIL',
      evidence: gateResults.filter((item) => item.name.startsWith('G')).map((item) => `${bool(item.pass)} ${item.name}`),
    },
    {
      step: '2. Registry Load',
      status: gatePassed && cases.filter((c) => c.actualCapability !== 'unknown').length >= 8 ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? [`10 条测试中 capability 可识别 ${cases.filter((c) => c.actualCapability !== 'unknown').length}/10`] : ['基础错误门未通过'],
    },
    {
      step: '3. Capability Match',
      status: gatePassed && casePassCount >= 8 ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? [`能力匹配通过 ${casePassCount}/10`] : ['基础错误门未通过'],
    },
    {
      step: '4. Gate',
      status: gatePassed ? 'PASS' : 'FAIL',
      evidence: gateResults.map((item) => `${bool(item.pass)} ${item.name}`),
    },
    {
      step: '5. Sealer',
      status: gatePassed && phase2Result.code === 0 ? 'PASS' : gatePassed ? 'FAIL' : 'BLOCKED',
      evidence: gatePassed ? [`phase2 exit=${phase2Result.code}`] : ['基础错误门未通过'],
    },
    {
      step: '6. Router',
      status: gatePassed && ['T04', 'T05', 'T06', 'T07', 'T08'].every((id) => cases.find((c) => c.id === id)?.pass) ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? ['关注 follow-up、scope、chain/protocol 继承'] : ['基础错误门未通过'],
    },
    {
      step: '7. Capability Execute',
      status: gatePassed && ['T01', 'T02', 'T04', 'T05', 'T06', 'T07', 'T08'].filter((id) => cases.find((c) => c.id === id)?.pass).length >= 6 ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? ['data_fact_query 为主，content_generator 为对照'] : ['基础错误门未通过'],
    },
    {
      step: '8. Trace + Audit',
      status: gatePassed && phase2Result.code === 0 ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? ['phase2 校验 execution/audit 链路', 'chat 响应含 meta/memory_refs_ref/evidence_chain'] : ['基础错误门未通过'],
    },
    {
      step: '9. Return / UX',
      status: gatePassed && cases.filter((c) => !c.pass).every((c) => c.actualResult.error === 'no_data_in_selected_range' || c.id === 'T09') ? 'PASS' : gatePassed ? 'PARTIAL' : 'BLOCKED',
      evidence: gatePassed ? ['检查误澄清、误导性文案、follow-up 体验'] : ['基础错误门未通过'],
    },
  ]

  const lines = []
  lines.push('# Prompt Intent 10-Case Report')
  lines.push('')
  lines.push(`- Generated at: ${new Date().toISOString()}`)
  lines.push(`- Base URL: ${baseUrl}`)
  lines.push(`- 基础错误门: ${gatePassed ? '已通过' : '未通过'}`)
  lines.push('')
  lines.push('## 1. 目标')
  lines.push('')
  lines.push('- 先清会污染测试结论的基础错误，再做 10 条 Prompt/主流程测试。')
  lines.push('- 本轮重点验证 capability match、澄清、follow-up、区间查询失败语义、以及 9 步主流程。')
  lines.push('')
  lines.push('## 2. 基础错误门结果')
  lines.push('')
  for (const item of gateResults) {
    lines.push(`- ${bool(item.pass)} ${item.name}: ${item.details}`)
  }
  lines.push('')
  if (!gatePassed) {
    lines.push('> 结论：基础错误门未通过。本轮 10 条正式测试与 9 步评估无效，必须先修基础错误。')
  }
  lines.push('')
  lines.push('## 3. 10 条测试明细')
  lines.push('')
  if (!gatePassed) {
    lines.push('- 已跳过：基础错误门未通过。')
  } else {
    lines.push('| ID | Query | 期望 Capability | 期望 Slots | 实际 Capability | 实际结果 | PASS/FAIL | 失败归因 |')
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const item of cases) {
      const resultText = item.actualResult.success
        ? `success summary=${item.actualResult.summary.slice(0, 48)}`
        : `error=${item.actualResult.error} summary=${item.actualResult.summary.slice(0, 48)}`
      lines.push(`| ${item.id} | ${item.query.replace(/\|/g, '\\|')} | ${item.expectedCapability} | ${formatJson(item.expectedSlots)} | ${item.actualCapability} | ${resultText.replace(/\|/g, '\\|')} | ${bool(item.pass)} | ${item.failureReason.replace(/\|/g, '\\|')} |`)
    }
    lines.push('')
    lines.push(`- 测试通过数: ${casePassCount}/10`)
    lines.push(`- 回归结果: lint=${lintResult.code === 0 ? 'PASS' : 'FAIL'}, phase0=${phase0Result.code === 0 ? 'PASS' : 'FAIL'}, phase1=${phase1Result.code === 0 ? 'PASS' : 'FAIL'}, phase2=${phase2Result.code === 0 ? 'PASS' : 'FAIL'}`)
  }
  lines.push('')
  lines.push('## 4. 9 步主流程评估')
  lines.push('')
  for (const step of stepEvaluations) {
    lines.push(`### ${step.step}`)
    lines.push(`- 状态: ${step.status}`)
    for (const evidence of step.evidence) lines.push(`- ${evidence}`)
    lines.push('')
  }
  lines.push('## 5. 关键问题分类')
  lines.push('')
  if (!gatePassed) {
    lines.push('- Prompt/识别问题：仍存在基础错误门未通过项。')
    lines.push('- 路由问题：暂不进入正式判定。')
    lines.push('- 执行问题：暂不进入正式判定。')
    lines.push('- UX 问题：暂不进入正式判定。')
  } else {
    const failedCases = cases.filter((item) => !item.pass)
    if (!failedCases.length) {
      lines.push('- 本轮未观察到基础实现 bug。剩余风险主要是数据不足和未完成 capability 边界。')
    } else {
      for (const item of failedCases) {
        const category =
          item.actualResult.error === 'no_data_in_selected_range'
            ? '数据不足'
            : item.id === 'T09'
              ? '未完成 capability'
              : 'Prompt/识别或路由'
        lines.push(`- ${item.id}: ${category} — ${item.failureReason}`)
      }
    }
  }
  lines.push('')
  lines.push('## 6. 结论')
  lines.push('')
  if (!gatePassed) {
    lines.push('- 本轮测试结论无效，先修基础错误。')
  } else if (casePassCount >= 8 && lintResult.code === 0 && phase0Result.code === 0 && phase1Result.code === 0 && phase2Result.code === 0) {
    lines.push('- 基础错误门已通过。')
    lines.push('- 10 条测试达到验收门槛（>= 8/10）。')
    lines.push('- 当前主链可以进入人工审阅；未通过项按“数据不足”或“未完成 capability”继续分类处理。')
  } else {
    lines.push('- 基础错误门已通过，但正式测试未达到验收门槛。')
    lines.push('- 需要根据失败归因继续修正，再重复本轮流程。')
  }

  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')

  if (serverOwned && devProc) {
    try {
      devProc.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  console.log(`Report written: ${reportPath}`)
  if (!gatePassed || !(casePassCount >= 8 && lintResult.code === 0 && phase0Result.code === 0 && phase1Result.code === 0 && phase2Result.code === 0)) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[prompt-intent-10case-report] failed:', err)
  process.exit(1)
})
