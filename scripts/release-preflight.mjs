import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { resolveStatusDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3003'
const runE2E = String(process.env.RUN_E2E || '').toLowerCase() === 'true'
const statusDir = resolveStatusDir(rootDir)
const reportPath = resolve(statusDir, 'RELEASE_PREFLIGHT_REPORT.md')
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

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'WRITE_CONFIRM_TOKEN',
  'NEXT_PUBLIC_READ_ONLY_DEMO',
  'NEXT_PUBLIC_WRITE_ENABLE',
]

function hydrateEnvFromLocalFiles(keys) {
  const candidates = [resolve(rootDir, '.env.local'), resolve(rootDir, '.env')]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx <= 0) continue
      const k = trimmed.slice(0, idx).trim()
      if (!keys.includes(k)) continue
      if (process.env[k]) continue
      const raw = trimmed.slice(idx + 1).trim()
      const v =
        (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
          ? raw.slice(1, -1)
          : raw
      process.env[k] = v
    }
  }
}

function run(cmd, args, env = {}) {
  return new Promise((resolveRun) => {
    const start = Date.now()
    const p = spawn(cmd, args, {
      cwd: rootDir,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    p.on('close', (code) => resolveRun({ code: code ?? 1, durationMs: Date.now() - start }))
  })
}

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

async function main() {
  hydrateEnvFromLocalFiles(requiredEnv)
  const missingEnv = requiredEnv.filter((k) => !process.env[k])
  const steps = [
    { name: 'test:all:with-dev', cmd: 'npm', args: ['run', 'test:all:with-dev'], env: { BASE_URL: baseUrl } },
  ]
  const results = []
  for (const s of steps) {
    console.log(`\n=== ${s.name} ===`)
    const r = await run(s.cmd, s.args, s.env)
    results.push({ ...s, ...r, ok: r.code === 0 })
    if (r.code !== 0) break
  }

  if (runE2E && results.every((r) => r.ok)) {
    console.log('\n=== prepare:e2e-server ===')
    let devProc = null
    const serverAlreadyUp = await probe(baseUrl)
    if (!serverAlreadyUp) {
      devProc = spawn('npm', ['run', 'dev', '--', '--webpack'], {
        cwd: rootDir,
        env: { ...process.env, PORT: String(port), HOSTNAME: hostFromBaseUrl },
        detached: true,
        stdio: 'ignore',
      })
      devProc.unref()
      const ready = await waitForServer(baseUrl)
      if (!ready) {
        results.push({ name: 'prepare:e2e-server', code: 1, durationMs: 0, ok: false })
      } else {
        results.push({ name: 'prepare:e2e-server', code: 0, durationMs: 0, ok: true })
      }
    } else {
      results.push({ name: 'prepare:e2e-server', code: 0, durationMs: 0, ok: true })
    }

    const prepOk = results[results.length - 1]?.ok === true
    if (prepOk) {
      console.log('\n=== test:e2e:admin ===')
      const e2e = await run('npm', ['run', 'test:e2e:admin'], { E2E_BASE_URL: baseUrl })
      results.push({ name: 'test:e2e:admin', ...e2e, ok: e2e.code === 0 })
    }

    if (devProc) {
      try {
        process.kill(-devProc.pid, 'SIGTERM')
      } catch {
        // ignore
      }
    }
  }

  const allOk = missingEnv.length === 0 && results.every((r) => r.ok)
  const lines = [
    '# Release Preflight Report',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    `- Base URL: ${baseUrl}`,
    `- Run E2E: ${runE2E ? 'true' : 'false'}`,
    `- Overall: ${allOk ? 'PASS' : 'FAIL'}`,
    '',
    '## Env Check',
    missingEnv.length === 0 ? '- required_env: PASS' : `- required_env: FAIL (${missingEnv.join(', ')})`,
    '',
    '## Step Results',
    ...results.map((r) => `- ${r.name}: ${r.ok ? 'PASS' : 'FAIL'} (exit=${r.code}, duration_ms=${r.durationMs})`),
    '',
  ]

  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, lines.join('\n'), 'utf8')
  console.log(`\nReport written: ${reportPath}`)

  if (!allOk) process.exit(1)
}

main().catch((e) => {
  console.error('[release-preflight] failed:', e)
  process.exit(1)
})
