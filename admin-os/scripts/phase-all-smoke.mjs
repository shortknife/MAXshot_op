import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { resolveStatusDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3003'
const statusDir = resolveStatusDir(rootDir)
const reportPathArgIndex = process.argv.findIndex((arg) => arg === '--report')
const reportPath =
  reportPathArgIndex > -1 && process.argv[reportPathArgIndex + 1]
    ? resolve(rootDir, process.argv[reportPathArgIndex + 1])
    : resolve(statusDir, 'PHASE_ALL_SMOKE_REPORT.md')

const steps = [
  { name: 'lint', cmd: 'npm', args: ['run', 'lint'], env: {} },
  { name: 'phase0', cmd: 'npm', args: ['run', 'test:phase0'], env: { BASE_URL: baseUrl } },
  { name: 'phase1', cmd: 'npm', args: ['run', 'test:phase1'], env: { BASE_URL: baseUrl } },
  { name: 'phase2', cmd: 'npm', args: ['run', 'test:phase2'], env: { BASE_URL: baseUrl } },
]

async function ensureServerReachable() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch(baseUrl, { method: 'GET', signal: controller.signal })
    return res.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function isTransientStepFailure(output = '') {
  const text = String(output || '')
  return (
    /TypeError:\s*fetch failed/.test(text) ||
    /ECONNREFUSED/.test(text) ||
    /ECONNRESET/.test(text) ||
    /UND_ERR_SOCKET/.test(text) ||
    /other side closed/.test(text)
  )
}

function runStepOnce(step) {
  return new Promise((resolveStep) => {
    const start = Date.now()
    const proc = spawn(step.cmd, step.args, {
      cwd: rootDir,
      env: { ...process.env, ...step.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    proc.stdout.on('data', (buf) => {
      const text = String(buf)
      output += text
      process.stdout.write(text)
    })
    proc.stderr.on('data', (buf) => {
      const text = String(buf)
      output += text
      process.stderr.write(text)
    })
    proc.on('close', (code) => {
      const durationMs = Date.now() - start
      const totalsMatch = output.match(/Total:\s*(\d+),\s*Passed:\s*(\d+),\s*Failed:\s*(\d+)/)
      const failChecks = Array.from(output.matchAll(/^FAIL\s+(.+)$/gm))
        .map((m) => String(m[1] || '').trim())
        .filter(Boolean)
        .slice(0, 20)
      resolveStep({
        name: step.name,
        code: code ?? 1,
        ok: (code ?? 1) === 0,
        durationMs,
        output,
        totals: totalsMatch
          ? { total: Number(totalsMatch[1]), passed: Number(totalsMatch[2]), failed: Number(totalsMatch[3]) }
          : null,
        failChecks,
      })
    })
  })
}

async function runStep(step) {
  const maxAttempts = step.name.startsWith('phase') ? 2 : 1
  let lastResult = await runStepOnce(step)
  let attempts = 1

  while (
    !lastResult.ok &&
    attempts < maxAttempts &&
    isTransientStepFailure(lastResult.output)
  ) {
    attempts += 1
    console.warn(`[phase-all-smoke] transient failure on ${step.name}, retrying (${attempts}/${maxAttempts})...`)
    await new Promise((r) => setTimeout(r, 1200))
    lastResult = await runStepOnce(step)
  }

  return {
    ...lastResult,
    attempts,
  }
}

function buildMarkdown(results) {
  const now = new Date().toISOString()
  const failed = results.filter((r) => !r.ok)
  const allOk = failed.length === 0
  const lines = []
  lines.push('# Phase All Smoke Report')
  lines.push('')
  lines.push(`- Generated at: ${now}`)
  lines.push(`- Base URL: ${baseUrl}`)
  lines.push(`- Overall: ${allOk ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push('## Step Results')
  for (const item of results) {
    lines.push(
      `- ${item.name}: ${item.ok ? 'PASS' : 'FAIL'} (exit=${item.code}, duration_ms=${item.durationMs}${
        item.totals
          ? `, total=${item.totals.total}, passed=${item.totals.passed}, failed=${item.totals.failed}`
          : ''
      }${item.attempts > 1 ? `, attempts=${item.attempts}` : ''})`
    )
    if (!item.ok && Array.isArray(item.failChecks) && item.failChecks.length > 0) {
      lines.push(`  failing_checks: ${item.failChecks.join(' | ')}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const serverOk = await ensureServerReachable()
  if (!serverOk) {
    console.error(`\n[phase-all-smoke] Server not reachable: ${baseUrl}`)
    console.error('[phase-all-smoke] Start server first, e.g. PORT=3003 npm run dev -- --webpack')
    console.error('[phase-all-smoke] Or run one-shot command: BASE_URL=http://127.0.0.1:3003 npm run test:all:with-dev')
    process.exit(1)
  }

  const results = []
  for (const step of steps) {
    console.log(`\n=== Running ${step.name} ===`)
    const result = await runStep(step)
    results.push(result)
  }

  const anyFailed = results.some((r) => !r.ok)
  const report = buildMarkdown(results)
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, report, 'utf8')
    console.log(`\nReport written: ${reportPath}`)
  }

  if (anyFailed) process.exit(1)
}

main().catch((err) => {
  console.error('phase-all-smoke failed:', err)
  process.exit(1)
})
