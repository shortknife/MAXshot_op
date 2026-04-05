import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseReleaseCheckFile, validateReleaseChecks } from '../release-checks'

const tmpDirs: string[] = []

function makeRepo(check: string, name = '2026-04-05-release.md') {
  const root = mkdtempSync(path.join(os.tmpdir(), 'release-checks-'))
  tmpDirs.push(root)
  const dir = path.join(root, 'docs', 'dev-harness', 'release-checks')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, name), check)
  return root
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const CHECK = `---
slug: sample_release_check
title: Sample Release Check
status: accepted
owner: nexa-core
created_at: 2026-04-05
updated_at: 2026-04-05
contract_slugs:
  - sample_contract
feedback_slugs:
  - sample_feedback
required_commands:
  - npm run build
required_artifacts:
  - docs/status/RELEASE_PREFLIGHT_REPORT.md
---

# Sample Release Check

## Goal
Goal.

## Checklist
- [x] Build passes.

## Evidence
- Evidence.

## Blockers
- None.

## Freeze Recommendation
Freeze.
`

describe('release checks', () => {
  it('parses a valid release check file', () => {
    const item = parseReleaseCheckFile('docs/dev-harness/release-checks/sample.md', CHECK)
    expect(item.slug).toBe('sample_release_check')
    expect(item.contract_slugs).toEqual(['sample_contract'])
  })

  it('validates release checks against contract and feedback refs', () => {
    const root = makeRepo(CHECK)
    const result = validateReleaseChecks(root, {
      contractSlugs: ['sample_contract'],
      feedbackSlugs: ['sample_feedback'],
    })
    expect(result.count).toBe(1)
  })

  it('rejects unknown feedback_slug', () => {
    const root = makeRepo(CHECK.replace('sample_feedback', 'missing_feedback'))
    expect(() =>
      validateReleaseChecks(root, { contractSlugs: ['sample_contract'], feedbackSlugs: ['sample_feedback'] }),
    ).toThrow("unknown feedback_slug 'missing_feedback'")
  })

  it('rejects missing required sections', () => {
    const invalid = CHECK.replace('## Freeze Recommendation\nFreeze.\n', '')
    expect(() => parseReleaseCheckFile('x.md', invalid)).toThrow("missing section '## Freeze Recommendation'")
  })
})
