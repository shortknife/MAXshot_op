import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { resolve } from 'node:path'
import { resolveStatusDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3003'
const statusDir = resolveStatusDir(rootDir)
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
const port = process.env.PORT || portFromBaseUrl
const logPath = process.env.DEV_LOG_PATH || '/tmp/adminos-dev-auto.log'

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
  for (let i = 0; i < retries; i++) {
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

function runCommand(cmd, args, env = {}) {
  return new Promise((resolveRun) => {
    const p = spawn(cmd, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    p.on('close', (code) => resolveRun(code ?? 1))
  })
}

async function main() {
  let devProc = null
  const serverReady = await waitForServer(baseUrl, 4, 300)
  if (!serverReady) {
    const logStream = createWriteStream(logPath, { flags: 'a' })
    devProc = spawn('npm', ['run', 'dev', '--', '--webpack'], {
      cwd: rootDir,
      env: { ...process.env, PORT: String(port), HOSTNAME: hostFromBaseUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    devProc.stdout.pipe(logStream)
    devProc.stderr.pipe(logStream)
    const ready = await waitForStableServer(baseUrl)
    if (!ready) {
      console.error(`[test-all-with-dev] dev server start timeout: ${baseUrl}`)
      console.error(`[test-all-with-dev] logs: ${logPath}`)
      process.exit(1)
    }
  }

  const runPhaseAll = () =>
    runCommand(
      'node',
      [
        './scripts/phase-all-smoke.mjs',
        '--report',
        `${statusDir}/PHASE_ALL_SMOKE_REPORT.md`,
      ],
      { BASE_URL: baseUrl }
    )

  let reportCode = await runPhaseAll()
  if (reportCode !== 0 && (await waitForStableServer(baseUrl))) {
    console.warn('[test-all-with-dev] phase-all-smoke failed once; retrying after server stabilization...')
    reportCode = await runPhaseAll()
  }

  const uatCode = await runCommand('node', ['./scripts/uat-pack.mjs'])

  if (devProc) {
    try {
      devProc.kill('SIGTERM')
    } catch {
      // ignore
    }
  }

  if (reportCode !== 0 || uatCode !== 0) process.exit(1)
}

main().catch((err) => {
  console.error('[test-all-with-dev] failed:', err)
  process.exit(1)
})
