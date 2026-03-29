import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveStatusDir, resolveRunbookDir } from './_status-paths.mjs'

const rootDir = resolve(process.cwd())
const statusDir = resolveStatusDir(rootDir)
const runbookDir = resolveRunbookDir(rootDir)

const inputs = {
  phaseAll: resolve(statusDir, 'PHASE_ALL_SMOKE_REPORT.md'),
  mvpScope: resolve(statusDir, 'MVP_SCOPE_AND_LIMITS.md'),
  releaseNote: resolve(statusDir, 'RELEASE_NOTE_MVP.md'),
  regressionRunbook: resolve(runbookDir, 'REGRESSION_TESTS.md'),
}

const MAX_REPORT_AGE_MINUTES = Number.parseInt(process.env.UAT_MAX_REPORT_AGE_MINUTES || '180', 10)

function parseOverall(reportText) {
  const overall = reportText.match(/Overall:\s*(PASS|FAIL)/)?.[1] || 'UNKNOWN'
  const generatedAtRaw = reportText.match(/Generated at:\s*([^\n]+)/)?.[1] || null
  const generatedAtMs = generatedAtRaw ? Date.parse(generatedAtRaw) : Number.NaN
  const reportAgeMinutes = Number.isFinite(generatedAtMs)
    ? Math.floor((Date.now() - generatedAtMs) / 60000)
    : null
  const isStale = reportAgeMinutes === null ? true : reportAgeMinutes > MAX_REPORT_AGE_MINUTES
  const steps = [...reportText.matchAll(/- (lint|phase0|phase1|phase2): (PASS|FAIL)/g)].map((m) => ({
    name: m[1],
    status: m[2],
  }))
  return { overall, steps, generatedAtRaw, reportAgeMinutes, isStale }
}

function collectMissingFiles() {
  return Object.entries(inputs)
    .filter(([, file]) => !existsSync(file))
    .map(([key]) => key)
}

function main() {
  mkdirSync(statusDir, { recursive: true })
  const missing = collectMissingFiles()
  const now = new Date().toISOString()

  let overall = 'UNKNOWN'
  let steps = []
  let reportAgeMinutes = null
  let isStale = true
  let sourceGeneratedAt = null
  if (existsSync(inputs.phaseAll)) {
    const text = readFileSync(inputs.phaseAll, 'utf8')
    const parsed = parseOverall(text)
    overall = parsed.overall
    steps = parsed.steps
    reportAgeMinutes = parsed.reportAgeMinutes
    isStale = parsed.isStale
    sourceGeneratedAt = parsed.generatedAtRaw
  }

  const smokeGate = overall === 'PASS' && !isStale

  const content = [
    '# UAT Final Report',
    '',
    `- Generated at: ${now}`,
    `- Regression source: ${inputs.phaseAll}`,
    `- Regression generated_at: ${sourceGeneratedAt || 'UNKNOWN'}`,
    `- Regression age_minutes: ${reportAgeMinutes ?? 'UNKNOWN'}`,
    `- Overall readiness: ${overall}`,
    '',
    '## Gate Check',
    `- phase_all_smoke: ${smokeGate ? 'PASS' : 'FAIL'}`,
    `- phase_all_smoke_freshness(<=${MAX_REPORT_AGE_MINUTES}m): ${!isStale ? 'PASS' : 'FAIL'}`,
    `- required_docs_present: ${missing.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '## Step Matrix',
    ...(steps.length
      ? steps.map((s) => `- ${s.name}: ${s.status}`)
      : ['- No parsed step matrix (phase report missing or malformed).']),
    '',
    '## Required Artifacts',
    `- phase_all_smoke_report: ${existsSync(inputs.phaseAll) ? 'OK' : 'MISSING'} (${inputs.phaseAll})`,
    `- mvp_scope_and_limits: ${existsSync(inputs.mvpScope) ? 'OK' : 'MISSING'} (${inputs.mvpScope})`,
    `- release_note: ${existsSync(inputs.releaseNote) ? 'OK' : 'MISSING'} (${inputs.releaseNote})`,
    `- regression_runbook: ${existsSync(inputs.regressionRunbook) ? 'OK' : 'MISSING'} (${inputs.regressionRunbook})`,
    '',
    '## Known Limits',
    '- No production TG/Notion auto-publish in this MVP.',
    '- Human Gate remains mandatory for write-path actions.',
    '- SSO/IAM and multi-tenant control plane are out of scope.',
    '',
    '## Recommendation',
    smokeGate && missing.length === 0
      ? '- UAT gate passed. Ready for MVP internal demo handoff.'
      : '- UAT gate blocked. Fix failed smoke/doc artifacts before handoff.',
    '',
  ].join('\n')

  const outFile = resolve(statusDir, 'UAT_FINAL_REPORT.md')
  writeFileSync(outFile, content, 'utf8')
  console.log(`UAT report generated: ${outFile}`)
  console.log(`overall=${overall}`)
  console.log(`phase_report_stale=${isStale}`)
  console.log(`missing_artifacts=${missing.length}`)

  if (!(smokeGate && missing.length === 0)) process.exit(1)
}

main()
