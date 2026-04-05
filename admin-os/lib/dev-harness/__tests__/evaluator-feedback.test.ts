import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseEvaluatorFeedbackFile, validateEvaluatorFeedback } from '../evaluator-feedback'

const tmpDirs: string[] = []

function makeRepo(contract: string, feedback: string, name = '2026-04-05-feedback.md') {
  const root = mkdtempSync(path.join(os.tmpdir(), 'eval-feedback-'))
  tmpDirs.push(root)
  const contractsDir = path.join(root, 'docs', 'dev-harness', 'contracts')
  const feedbackDir = path.join(root, 'docs', 'dev-harness', 'eval-feedback')
  mkdirSync(contractsDir, { recursive: true })
  mkdirSync(feedbackDir, { recursive: true })
  writeFileSync(path.join(contractsDir, '2026-04-05-contract.md'), contract)
  writeFileSync(path.join(feedbackDir, name), feedback)
  return root
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const CONTRACT = `---
slug: sample_contract
title: Sample Contract
status: accepted
owner: nexa-core
created_at: 2026-04-05
updated_at: 2026-04-05
category: development_harness
scope_paths:
  - docs/dev-harness/contracts/
verification:
  - validator passes
freeze_when:
  - hooks validate
---

# Sample Contract

## Goal
Goal.

## In Scope
- Scope.

## Out Of Scope
- Out.

## Acceptance
- Acceptance.

## Evidence
- Evidence.
`

const FEEDBACK = `---
slug: sample_feedback
contract_slug: sample_contract
title: Sample Feedback
status: accepted
evaluator: nexa-review
created_at: 2026-04-05
updated_at: 2026-04-05
verdict: freeze
evidence:
  - npm run build
next_action:
  - no further work
---

# Sample Feedback

## Summary
Summary text.

## Findings
- No blockers.

## Evidence
- Build passed.

## Closure Recommendation
Freeze the step.
`

describe('evaluator feedback', () => {
  it('parses a valid feedback file', () => {
    const item = parseEvaluatorFeedbackFile('docs/dev-harness/eval-feedback/sample.md', FEEDBACK)
    expect(item.slug).toBe('sample_feedback')
    expect(item.verdict).toBe('freeze')
    expect(item.next_action).toEqual(['no further work'])
  })

  it('validates feedback against contract slugs', () => {
    const root = makeRepo(CONTRACT, FEEDBACK)
    const result = validateEvaluatorFeedback(root, ['sample_contract'])
    expect(result.count).toBe(1)
    expect(result.slugs).toEqual(['sample_feedback'])
  })

  it('rejects unknown contract_slug', () => {
    const root = makeRepo(CONTRACT, FEEDBACK.replace('sample_contract', 'missing_contract'))
    expect(() => validateEvaluatorFeedback(root, ['sample_contract'])).toThrow("unknown contract_slug 'missing_contract'")
  })

  it('rejects missing required sections', () => {
    const invalid = FEEDBACK.replace('## Closure Recommendation\nFreeze the step.\n', '')
    expect(() => parseEvaluatorFeedbackFile('x.md', invalid)).toThrow("missing section '## Closure Recommendation'")
  })
})
