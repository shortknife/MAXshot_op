import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '..')
const adminRoot = path.resolve(process.cwd())
const mode = process.argv[2]

if (!mode || !['pre-commit', 'pre-push'].includes(mode)) {
  console.error('[dev-harness-hook] usage: node ./scripts/dev-harness-hook.mjs <pre-commit|pre-push>')
  process.exit(1)
}

function run(cmd, args, cwd = repoRoot, extraEnv = {}) {
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
}

function output(cmd, args, cwd = repoRoot) {
  return execFileSync(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  }).trim()
}

function getStagedFiles() {
  const text = output('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
  return text ? text.split('\n').map((item) => item.trim()).filter(Boolean) : []
}

function hasAdminChanges(files) {
  return files.some((file) => file.startsWith('admin-os/'))
}

function hasDocsOnlyChanges(files) {
  return files.length > 0 && files.every((file) => file.startsWith('docs/') || file.endsWith('.md'))
}

function blockForbiddenFiles(files) {
  const forbidden = files.filter((file) => {
    const base = path.basename(file)
    return (
      base === '.DS_Store' ||
      file.endsWith('.env') ||
      file.endsWith('.env.local') ||
      file.includes('/.env.')
    )
  })
  if (forbidden.length) {
    console.error('[dev-harness-hook] forbidden files in commit:')
    for (const file of forbidden) console.error(`- ${file}`)
    process.exit(1)
  }
}

function checkConflictMarkers() {
  run('git', ['diff', '--cached', '--check'])
}

function runPreCommit() {
  const files = getStagedFiles()
  if (files.length === 0) {
    console.log('[dev-harness-hook] pre-commit: no staged files')
    return
  }

  blockForbiddenFiles(files)
  checkConflictMarkers()

  if (hasDocsOnlyChanges(files)) {
    console.log('[dev-harness-hook] pre-commit: docs-only changes, skipping admin checks')
    return
  }

  if (hasAdminChanges(files)) {
    console.log('[dev-harness-hook] pre-commit: running eslint')
    run('npm', ['run', 'lint', '--', '--quiet'], adminRoot)
  }
}

function runPrePush() {
  const forceFullCheck = String(process.env.FORCE_HOOK_FULL_CHECK || '').toLowerCase() === 'true'
  const hasPreviousHead = (() => {
    try {
      output('git', ['rev-parse', '--verify', 'HEAD~1'])
      return true
    } catch {
      return false
    }
  })()
  const allFiles = hasPreviousHead ? output('git', ['diff', '--name-only', 'HEAD~1..HEAD']) : ''
  const files = allFiles ? allFiles.split('\n').map((item) => item.trim()).filter(Boolean) : []
  if (!forceFullCheck && files.length > 0 && hasDocsOnlyChanges(files)) {
    console.log('[dev-harness-hook] pre-push: docs-only head commit, skipping admin checks')
    return
  }

  console.log('[dev-harness-hook] pre-push: running build')
  rmSync(path.join(adminRoot, '.next'), { recursive: true, force: true })
  run('npm', ['run', 'build'], adminRoot)

  if (!forceFullCheck) {
    console.log('[dev-harness-hook] pre-push: build gate passed')
    return
  }

  console.log('[dev-harness-hook] pre-push: running full smoke with managed dev server')
  const runner = existsSync(path.join(adminRoot, 'scripts/run-with-local-env.sh'))
    ? ['./scripts/run-with-local-env.sh', 'npm', 'run', 'test:all:with-dev']
    : ['run', 'test:all:with-dev']

  if (runner[0] === './scripts/run-with-local-env.sh') run(runner[0], runner.slice(1), adminRoot)
  else run('npm', runner, adminRoot)
}

if (mode === 'pre-commit') runPreCommit()
if (mode === 'pre-push') runPrePush()
