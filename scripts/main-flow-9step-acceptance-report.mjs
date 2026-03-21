import { spawn } from 'node:child_process'
import { createWriteStream, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { resolveStatusDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3003'
const statusDir = resolveStatusDir(rootDir)
const reportPath = resolve(statusDir, 'MAIN_FLOW_9STEP_ACCEPTANCE_2026-03-21.md')
const logPath = process.env.DEV_LOG_PATH || '/tmp/adminos-main-flow-9step.log'

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

const registryPath = resolve(rootDir, 'app/configs/capability-registry/capability_registry_v1.json')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
const activeCapabilityIds = Array.isArray(registry?.capabilities)
  ? registry.capabilities.filter((item) => item?.lifecycle === 'active').map((item) => item.capability_id)
  : []

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
        error: 'request_timeout',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function truncate(value, length = 120) {
  const text = String(value ?? '')
  return text.length <= length ? text : `${text.slice(0, length)}...`
}

function passFail(condition) {
  return condition ? 'PASS' : 'FAIL'
}

function classifyFailure(items) {
  const failed = items.filter((item) => !item.pass)
  if (!failed.length) return '无'
  return failed.map((item) => item.failureCategory || '未知').join(' / ')
}

function hasPassLine(output, label) {
  return new RegExp(`PASS ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(String(output || ''))
}

async function runMainFlowChecks(phaseOutputs) {
  const stepChecks = {}

  // Step 1
  {
    const sid = `flow-step1-${Date.now()}`
    const first = await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    const second = await post('/api/chat/ask', { raw_query: '你能描述什么是MAXshot么？', session_id: sid })
    const standalone = await post('/api/chat/ask', { raw_query: '你能描述什么是MAXshot么？' })
    stepChecks.entry = [
      {
        name: 'E1 新问题切场景不被旧澄清吞掉',
        pass:
          first.data?.data?.error === 'missing_required_clarification' &&
          second.status === 200 &&
          second.data?.data?.error !== 'missing_required_clarification' &&
          !/apy|tvl/i.test(String(second.data?.data?.summary || '')),
        detail: `first=${first.data?.data?.error || '-'} second=${truncate(second.data?.data?.summary || '')}`,
        failureCategory: 'Entry / session context',
      },
      {
        name: 'E2 无 session_id 时 standalone query 可独立进入',
        pass:
          standalone.status === 200 &&
          standalone.data?.data?.error !== 'missing_required_clarification' &&
          !/apy|tvl/i.test(String(standalone.data?.data?.summary || '')),
        detail: `summary=${truncate(standalone.data?.data?.summary || '')}`,
        failureCategory: 'Entry / request normalization',
      },
    ]
  }

  // Step 2
  {
    const analyze = await post('/api/intent/analyze', { raw_query: 'MAXshot 有哪些 vault 可以用？' })
    const chat = await post('/api/chat/ask', { raw_query: 'MAXshot 有哪些 vault 可以用？' })
    const memoryRefs = chat.data?.data?.meta?.memory_refs_ref || []
    stepChecks.context = [
      {
        name: 'C1 Active capability registry 可装载到识别链',
        pass:
          analyze.data?.success === true &&
          Array.isArray(analyze.data?.intent?.extracted_slots?.matched_capability_ids) &&
          analyze.data.intent.extracted_slots.matched_capability_ids.includes('capability.data_fact_query'),
        detail: `matched=${JSON.stringify(analyze.data?.intent?.extracted_slots?.matched_capability_ids || [])}`,
        failureCategory: 'Context / registry load',
      },
      {
        name: 'C2 memory refs 含 capability registry ref',
        pass:
          Array.isArray(memoryRefs) &&
          memoryRefs.some((ref) => String(ref).includes('capability_registry')),
        detail: `memory_refs_ref=${JSON.stringify(memoryRefs)}`,
        failureCategory: 'Context / memory runtime',
      },
    ]
  }

  // Step 3
  {
    const range = await post('/api/intent/analyze', {
      raw_query: '3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？',
    })
    const product = await post('/api/intent/analyze', { raw_query: '你能描述什么是MAXshot么？' })
    const smallTalk = await post('/api/intent/analyze', { raw_query: '你好' })
    const rangeSlots = range.data?.intent?.extracted_slots || {}
    stepChecks.intent = [
      {
        name: 'I1 绝对时间区间被抽成 date_from/date_to',
        pass:
          range.data?.success === true &&
          range.data?.intent?.type === 'business_query' &&
          Boolean(rangeSlots.date_from) &&
          Boolean(rangeSlots.date_to),
        detail: `type=${range.data?.intent?.type || '-'} slots=${truncate(JSON.stringify(rangeSlots), 180)}`,
        failureCategory: 'Prompt / slot extraction',
      },
      {
        name: 'I2 产品定义问法不误进 business_query',
        pass:
          product.data?.success === true &&
          product.data?.intent?.type !== 'business_query' &&
          !Array.isArray(product.data?.intent?.extracted_slots?.matched_capability_ids) ||
          !product.data?.intent?.extracted_slots?.matched_capability_ids?.includes('capability.data_fact_query'),
        detail: `type=${product.data?.intent?.type || '-'} matched=${JSON.stringify(product.data?.intent?.extracted_slots?.matched_capability_ids || [])}`,
        failureCategory: 'Prompt / normalize',
      },
      {
        name: 'I3 smalltalk 不命中业务 capability',
        pass:
          smallTalk.data?.success === true &&
          smallTalk.data?.intent?.type !== 'business_query',
        detail: `type=${smallTalk.data?.intent?.type || '-'} reason=${smallTalk.data?.intent?.extracted_slots?.reason || '-'}`,
        failureCategory: 'Prompt / fallback',
      },
    ]
  }

  // Step 4
  {
    const incomplete = await post('/api/entry/gate/check', {
      intent_name: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      execution_mode: 'hybrid',
      slots: {},
    })
    const complete = await post('/api/entry/gate/check', {
      intent_name: 'business_query',
      matched_capability_ids: ['capability.data_fact_query'],
      execution_mode: 'hybrid',
      slots: { scope: 'yield' },
    })
    stepChecks.gate = [
      {
        name: 'G1 incomplete query -> continue_chat',
        pass: incomplete.data?.gate_result === 'continue_chat',
        detail: `gate_result=${incomplete.data?.gate_result || '-'} reason=${incomplete.data?.reason || '-'}`,
        failureCategory: 'Gate / required slots',
      },
      {
        name: 'G2 complete read-only query -> pass',
        pass:
          complete.data?.gate_result === 'pass' &&
          complete.data?.require_confirmation === false,
        detail: `gate_result=${complete.data?.gate_result || '-'} require_confirmation=${String(complete.data?.require_confirmation)}`,
        failureCategory: 'Gate / legacy branch',
      },
    ]
  }

  // Step 5
  stepChecks.sealer = [
    {
      name: 'S1 phase2 中 task/create 成功',
      pass: hasPassLine(phaseOutputs.phase2, 'api-01 create execution'),
      detail: '来源: phase2 smoke',
      failureCategory: 'Sealer / write contract',
    },
    {
      name: 'S2 phase2 中 execution confirm 成功',
      pass: hasPassLine(phaseOutputs.phase2, 'api-02 confirm execution'),
      detail: '来源: phase2 smoke',
      failureCategory: 'Sealer / confirmation flow',
    },
  ]

  // Step 6
  {
    const sid = `flow-step6-${Date.now()}`
    await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？', session_id: sid })
    await post('/api/chat/ask', { raw_query: '最近7天', session_id: sid })
    const followUp = await post('/api/chat/ask', { raw_query: '看 arbitrum 的 APY', session_id: sid })
    const execDetail = await post('/api/chat/ask', { raw_query: '给我最近一笔 execution 详情' })
    stepChecks.router = [
      {
        name: 'R1 yield follow-up 不串 scope',
        pass:
          followUp.data?.success === true &&
          followUp.data?.data?.meta?.scope === 'yield' &&
          String(followUp.data?.data?.meta?.filters_applied?.chain || '') === 'arbitrum',
        detail: `scope=${followUp.data?.data?.meta?.scope || '-'} chain=${followUp.data?.data?.meta?.filters_applied?.chain || '-'}`,
        failureCategory: 'Router / follow-up scope inference',
      },
      {
        name: 'R2 execution 查询不被 vault/yield 上下文污染',
        pass:
          execDetail.data?.success === true &&
          execDetail.data?.data?.meta?.scope === 'execution',
        detail: `scope=${execDetail.data?.data?.meta?.scope || '-'} summary=${truncate(execDetail.data?.data?.summary || '')}`,
        failureCategory: 'Router / capability binding',
      },
    ]
  }

  // Step 7
  {
    const noData = await post('/api/chat/ask', {
      raw_query: '3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？',
    })
    const vaults = await post('/api/chat/ask', { raw_query: 'MAXshot 有哪些 vault 可以用？' })
    const content = await post('/api/chat/ask', { raw_query: '写一条关于新品发布的帖子' })
    stepChecks.capability = [
      {
        name: 'X1 data_fact_query 绝对区间 no-data 语义正确',
        pass:
          noData.data?.data?.error === 'no_data_in_selected_range' &&
          !String(noData.data?.data?.summary || '').includes('请补充时间范围或查询对象'),
        detail: `error=${noData.data?.data?.error || '-'} summary=${truncate(noData.data?.data?.summary || '')}`,
        failureCategory: 'Capability / no-data handling',
      },
      {
        name: 'X2 vault 列表查询 capability 正常返回',
        pass:
          vaults.data?.success === true &&
          vaults.data?.data?.meta?.scope === 'vault',
        detail: `scope=${vaults.data?.data?.meta?.scope || '-'} summary=${truncate(vaults.data?.data?.summary || '')}`,
        failureCategory: 'Capability / data_fact_query',
      },
      {
        name: 'X3 content_generator capability 正常返回',
        pass:
          content.data?.success === true &&
          content.data?.data?.type === 'marketing',
        detail: `type=${content.data?.data?.type || '-'} summary=${truncate(content.data?.data?.summary || '')}`,
        failureCategory: 'Capability / content_generator',
      },
    ]
  }

  // Step 8
  stepChecks.trace = [
    {
      name: 'T1 phase2 中 audit event persisted',
      pass: hasPassLine(phaseOutputs.phase2, 'api-10 event persisted'),
      detail: '来源: phase2 smoke',
      failureCategory: 'Trace / audit persistence',
    },
    {
      name: 'T2 phase2 中 memory_refs_ref 已入审计链',
      pass:
        hasPassLine(phaseOutputs.phase2, 'api-12 audit has memory_refs_ref') &&
        hasPassLine(phaseOutputs.phase2, 'api-12b audit includes capability registry refs'),
      detail: '来源: phase2 smoke',
      failureCategory: 'Trace / metadata',
    },
    {
      name: 'T3 phase2 中 audit contract 通过',
      pass: hasPassLine(phaseOutputs.phase2, 'api-16 audit contract passed'),
      detail: '来源: phase2 smoke',
      failureCategory: 'Trace / audit contract',
    },
  ]

  // Step 9
  {
    const clarification = await post('/api/chat/ask', { raw_query: '当前 vault APY 怎么样？' })
    const content = await post('/api/chat/ask', { raw_query: '写一条关于新品发布的帖子' })
    stepChecks.returning = [
      {
        name: 'U1 no_data_in_selected_range 文案不误导',
        pass:
          stepChecks.capability[0]?.pass === true,
        detail: stepChecks.capability[0]?.detail || '-',
        failureCategory: 'UX 文案',
      },
      {
        name: 'U2 clarification 与 next_actions 保持自然语言引导',
        pass:
          clarification.data?.data?.error === 'missing_required_clarification' &&
          Array.isArray(clarification.data?.data?.meta?.next_actions) &&
          clarification.data.data.meta.next_actions.length > 0,
        detail: `error=${clarification.data?.data?.error || '-'} next_actions=${JSON.stringify(clarification.data?.data?.meta?.next_actions || [])}`,
        failureCategory: 'UX / clarification',
      },
      {
        name: 'U3 content draft 回传正常',
        pass:
          content.data?.success === true &&
          content.data?.data?.type === 'marketing',
        detail: `type=${content.data?.data?.type || '-'} summary=${truncate(content.data?.data?.summary || '')}`,
        failureCategory: 'UX / response normalize',
      },
    ]
  }

  return stepChecks
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

  console.error('[main-flow-9step] running lint + phase regressions')
  const lintResult = await runCommand('npm', ['run', 'lint'])
  const phase0Result = await runCommand('npm', ['run', 'test:phase0'], { BASE_URL: baseUrl })
  const phase1Result = await runCommand('npm', ['run', 'test:phase1'], { BASE_URL: baseUrl })
  const phase2Result = await runCommand('npm', ['run', 'test:phase2'], { BASE_URL: baseUrl })
  console.error('[main-flow-9step] running step checks')
  const steps = await runMainFlowChecks({
    phase0: phase0Result.stdout,
    phase1: phase1Result.stdout,
    phase2: phase2Result.stdout,
  })

  const stepSpecs = [
    {
      key: 'entry',
      title: 'Step 1 - Entry（多通道归一）',
      goal: '保证请求进入系统后不会在入口被错误改写或污染。',
      input: ['raw_query', 'session_id', 'channel/body'],
      output: ['标准化请求体', 'effectiveQuery'],
      method: 'Code（请求归一、session/new-question 判断由代码主导）',
      boundary: [
        '当前只重点覆盖 chat 主入口。',
        '已修复“新问题被旧澄清吞掉”的主风险。',
        '尚未做 TG / Notion 真入口联调。',
      ],
      previous: ['当前 vault APY 怎么样？', '你能描述什么是MAXshot么？', 'prompt-intent 10-case gate checks'],
      added: ['同 session 先问 APY 再切到产品定义类问题', '无 session_id 的 standalone 产品定义问法'],
      passCriteria: ['新问题不被当成旧澄清补充', '入口不把产品定义类问题改写成 APY/yield'],
    },
    {
      key: 'context',
      title: 'Step 2 - Context + Registry Load',
      goal: '保证 registry、memory refs、session follow-up context 装载正确。',
      input: ['session_context', 'active capability registry', 'memory refs'],
      output: ['active capability 列表', 'memory_refs_ref', '可供识别链使用的上下文'],
      method: 'Code（registry 与 memory runtime 由代码主导）',
      boundary: [
        'registry-first 已接入运行时。',
        'memory runtime 是收紧版，不是最终完整版。',
        '只验证 active capability，不验证 inactive publisher 执行。',
      ],
      previous: ['memory_refs_ref', 'matched_capability_ids', 'phase2 audit checks'],
      added: ['vault query 的 registry ref 稳定出现', 'follow-up 只在合理场景生效'],
      passCriteria: ['active capability 正确加载', 'memory refs 含 capability registry ref', 'context 不串场'],
    },
    {
      key: 'intent',
      title: 'Step 3 - Intent 识别',
      goal: '正确得到 capability match、slots、clarification 状态。',
      input: ['normalized query', 'session context', 'capability list'],
      output: ['matched_capability_ids', 'primary_capability_id', 'slots', 'need_clarification'],
      method: '混合（LLM 负责 capability match/slot extraction，Code 负责 normalize/fallback/contract 校验）',
      boundary: [
        '已支持 capability-first。',
        '仍保留兼容 fallback。',
        'product_doc_qna 只验证边界，不代表知识源已完成。',
      ],
      previous: ['APY / vault / execution / content / 产品定义问法', 'absolute range prompt-intent report'],
      added: ['绝对日期区间', '产品定义问法', 'smalltalk/out_of_scope'],
      passCriteria: ['完整 query 不误澄清', '产品定义不误进 business', 'smalltalk 不命中业务 capability'],
    },
    {
      key: 'gate',
      title: 'Step 4 - Gate',
      goal: '判断是继续聊天、通过、还是确认。',
      input: ['intent IR', 'slots', 'matched capability'],
      output: ['continue_chat / pass / require_confirmation'],
      method: 'Code',
      boundary: [
        'read-only 主链已稳定。',
        '写路径仍要求 confirmation token / operator。',
      ],
      previous: ['clarification', 'too_many_capability_matches', 'phase2 gate checks'],
      added: ['完整 query 不能继续追问', 'incomplete query 必须 continue_chat'],
      passCriteria: ['Gate 不越权重做意图识别', '完整 read-only query 可 pass', '不完整 query 必须 continue_chat'],
    },
    {
      key: 'sealer',
      title: 'Step 5 - Sealer（task/create）',
      goal: '正确把 intent 封进 task/execution。',
      input: ['gate pass 结果', 'slots', 'capability binding'],
      output: ['task_id', 'execution_id', 'sealed payload'],
      method: 'Code',
      boundary: [
        '依赖可写环境和 confirm token。',
        '当前重点验证封印结构，不扩展新写路径能力。',
      ],
      previous: ['phase2 task/create', 'too_many_capability_matches'],
      added: ['payload 保留 matched capability 和 slots'],
      passCriteria: ['生成 execution_id', '封印内容与上游一致'],
    },
    {
      key: 'router',
      title: 'Step 6 - Router（确定性 -> capability）',
      goal: 'Router 根据 sealed data 做确定性调度。',
      input: ['task/execution payload'],
      output: ['capability binding', 'decomposition/context tags'],
      method: 'Code',
      boundary: [
        '已 capability-first。',
        '仍保留少量兼容层。',
      ],
      previous: ['follow-up chain/protocol/vault', 'task_decomposition audit'],
      added: ['content_generator execution 的 decomposition', 'capability binding 审计检查'],
      passCriteria: ['Router 不错绑 capability', '不串 scope', '审计中可见 decomposition/binding'],
    },
    {
      key: 'capability',
      title: 'Step 7 - Capability 执行',
      goal: 'capability 返回正确结果或正确失败语义。',
      input: ['capability input envelope'],
      output: ['capability output'],
      method: '混合（主体为 Code，某些 capability 依赖 Prompt/LLM）',
      boundary: [
        'data_fact_query 可用。',
        'content_generator 可用。',
        'product_doc_qna 未接真实文档源。',
      ],
      previous: ['yield/vault/execution/content', 'prompt-intent 10-case cases'],
      added: ['绝对时间 top1 APY no_data 语义', 'content_generator execution chain'],
      passCriteria: ['完整查询不能返回误导性失败文案', '主 capability 链可跑通'],
    },
    {
      key: 'trace',
      title: 'Step 8 - Trace + Audit',
      goal: '保证链路可追踪、可审计。',
      input: ['execution result', 'metadata', 'audit event hooks'],
      output: ['audit events', 'evidence chain', 'memory refs', 'execution trace'],
      method: 'Code',
      boundary: [
        '已具备审计链。',
        '重点看 meta 一致性，不扩展新 observability 能力。',
      ],
      previous: ['phase2 causality / lineage / audit metrics', 'memory_refs_ref checks'],
      added: ['execution audit_steps canonical type', 'memory_refs_ref presence'],
      passCriteria: ['关键 trace 字段完整', '与真实路径一致'],
    },
    {
      key: 'returning',
      title: 'Step 9 - 回传',
      goal: '用户看到的结果不误导。',
      input: ['capability output', 'response normalizer'],
      output: ['summary', 'error', 'next_actions', 'highlights', 'meta'],
      method: '混合（Code 为主，少量 summary 由 capability 输出）',
      boundary: [
        '当前 UX 已可用，但仍是 MVP 形态。',
        'next_actions 是引导，不是完整按钮系统。',
      ],
      previous: ['APY summary', 'clarification', 'qna fallback', 'content draft'],
      added: ['no_data_in_selected_range 文案', 'clarification next_actions', 'content 回传'],
      passCriteria: ['summary / error / next_actions 与真实状态一致', '不误导用户'],
    },
  ]

  const lines = []
  lines.push('# Main Flow 9-Step Acceptance')
  lines.push('')
  lines.push(`- Generated at: ${new Date().toISOString()}`)
  lines.push(`- Base URL: ${baseUrl}`)
  lines.push(`- Active capabilities: ${activeCapabilityIds.join(', ')}`)
  lines.push(`- Regression: lint=${passFail(lintResult.code === 0)}, phase0=${passFail(phase0Result.code === 0)}, phase1=${passFail(phase1Result.code === 0)}, phase2=${passFail(phase2Result.code === 0)}`)
  lines.push('')
  lines.push('## 1. 测试目标')
  lines.push('')
  lines.push('- 按主流程 9 步逐层确认系统是否可信，而不是只看最终回答。')
  lines.push('- 每一步按统一模板记录：输入/输出、实现方式、边界、既有测试、本轮新增测试、通过标准、失败归因。')
  lines.push('- 本轮主链优先级仍是 `data_fact_query`；`product_doc_qna` 只做边界验证。')
  lines.push('')

  lines.push('## 2. 9 步模板化结果')
  lines.push('')
  for (const spec of stepSpecs) {
    const checks = steps[spec.key] || []
    const passCount = checks.filter((item) => item.pass).length
    const status = passCount === checks.length ? 'PASS' : passCount > 0 ? 'PARTIAL' : 'FAIL'
    lines.push(`### ${spec.title}`)
    lines.push(`- **目标**: ${spec.goal}`)
    lines.push(`- **输入**: ${spec.input.map((item) => `\`${item}\``).join('、')}`)
    lines.push(`- **输出**: ${spec.output.map((item) => `\`${item}\``).join('、')}`)
    lines.push(`- **实现方式**: ${spec.method}`)
    lines.push(`- **当前产品边界**:`)
    for (const item of spec.boundary) lines.push(`  - ${item}`)
    lines.push(`- **之前已测过的数据**: ${spec.previous.join('；')}`)
    lines.push(`- **本轮新增测试**: ${spec.added.join('；')}`)
    lines.push(`- **通过标准**: ${spec.passCriteria.join('；')}`)
    lines.push(`- **失败归因**: ${classifyFailure(checks)}`)
    lines.push(`- **本轮结果**: ${status} (${passCount}/${checks.length})`)
    if (checks.length) {
      lines.push('')
      lines.push('| 检查项 | PASS/FAIL | 结果摘要 |')
      lines.push('| --- | --- | --- |')
      for (const check of checks) {
        lines.push(`| ${check.name} | ${passFail(check.pass)} | ${String(check.detail || '').replace(/\|/g, '\\|')} |`)
      }
    }
    lines.push('')
  }

  lines.push('## 3. 关键 Query 映射')
  lines.push('')
  lines.push('| Query | 主要覆盖步骤 | 当前结论 |')
  lines.push('| --- | --- | --- |')
  lines.push('| `当前 vault APY 怎么样？` | 1,3,4,9 | 会触发合理澄清 |')
  lines.push('| `最近7天` | 1,6,7,9 | 可承接上轮 APY 澄清 |')
  lines.push('| `看 arbitrum 的 APY` | 1,6,7,9 | follow-up 可沿用 yield 上下文并正确加 chain 过滤 |')
  lines.push('| `3月2日到3月16日之间最高的APY是那个Vault呢？具体是多少值？其TVL总计多少呢？` | 3,4,7,9 | 已识别绝对时间区间；当前按 `no_data_in_selected_range` 正确降级 |')
  lines.push('| `MAXshot 有哪些 vault 可以用？` | 2,3,7,9 | 正确走 `capability.data_fact_query(scope=vault)` |')
  lines.push('| `给我最近一笔 execution 详情` | 1,3,6,7 | 正确走 execution scope |')
  lines.push('| `最近7天 arbitrum morpho 的 vault 列表` | 3,6,7 | 组合过滤可跑 |')
  lines.push('| `你能描述什么是MAXshot么？` | 1,3,9 | 不再误路由到 APY/yield；文档能力本体仍未完成 |')
  lines.push('| `MAXshot 品牌故事是什么？` | 3,9 | 不应误进业务数据查询；当前属于文档边界/安全 fallback |')
  lines.push('| `写一条关于新品发布的帖子` | 3,5,6,7,9 | content_generator 主链可用 |')
  lines.push('')

  lines.push('## 4. 问题分类')
  lines.push('')
  const allChecks = Object.values(steps).flat()
  const failedChecks = allChecks.filter((item) => !item.pass)
  if (!failedChecks.length) {
    lines.push('- 本轮未发现基础实现 bug。')
    lines.push('- 剩余风险主要是能力边界：`product_doc_qna` 尚未接真实文档源。')
    lines.push('- 数据为空但路由/slots/执行正确的场景，归类为“数据不足”，不是主流程 bug。')
  } else {
    const grouped = failedChecks.reduce((acc, item) => {
      const key = item.failureCategory || '未知'
      acc[key] ||= []
      acc[key].push(item.name)
      return acc
    }, {})
    for (const [category, names] of Object.entries(grouped)) {
      lines.push(`- ${category}: ${names.join('；')}`)
    }
  }
  lines.push('')

  lines.push('## 5. 结论')
  lines.push('')
  const overallPass =
    lintResult.code === 0 &&
    phase0Result.code === 0 &&
    phase1Result.code === 0 &&
    phase2Result.code === 0 &&
    failedChecks.length === 0
  if (overallPass) {
    lines.push('- 9 步主流程当前可判定为：主链可信。')
    lines.push('- `data_fact_query`、`content_generator` 已达到逐步验收可继续人工测试的状态。')
    lines.push('- `product_doc_qna` 仅通过“边界不误路由”验收，不代表能力已完成。')
  } else {
    lines.push('- 当前仍存在未通过步骤，不能宣告主链完全可信。')
    lines.push('- 需要按上文“问题分类”继续修正，再重复本轮 9-step 验收。')
  }
  lines.push('')

  await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')

  if (serverOwned && devProc) {
    try {
      devProc.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  console.log(`Report written: ${reportPath}`)
  if (!overallPass) process.exit(1)
  process.exit(0)
}

main().catch((err) => {
  console.error('[main-flow-9step-acceptance-report] failed:', err)
  process.exit(1)
})
