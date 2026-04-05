import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadTaskContracts, parseTaskContractFile, validateTaskContracts } from '../task-contracts'

const tmpDirs: string[] = []

function makeRepoWithContract(content: string, name = '2026-04-05-sample.md') {
  const root = mkdtempSync(path.join(os.tmpdir(), 'task-contracts-'))
  tmpDirs.push(root)
  const dir = path.join(root, 'docs', 'dev-harness', 'contracts')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, name), content)
  return root
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

const VALID_CONTRACT = `---
slug: sample_step
title: Sample Step
status: active
owner: nexa-core
created_at: 2026-04-05
updated_at: 2026-04-05
category: development_harness
scope_paths:
  - docs/dev-harness/contracts/
verification:
  - validator passes
freeze_when:
  - hooks are wired
---

# Sample Step

## Goal
Goal text.

## In Scope
- Scope item.

## Out Of Scope
- Out of scope item.

## Acceptance
- Acceptance item.

## Evidence
- Evidence item.
`

describe('task contracts', () => {
  it('parses a valid task contract file', () => {
    const item = parseTaskContractFile('docs/dev-harness/contracts/sample.md', VALID_CONTRACT)
    expect(item.slug).toBe('sample_step')
    expect(item.status).toBe('active')
    expect(item.scope_paths).toEqual(['docs/dev-harness/contracts/'])
    expect(item.sections['Goal']).toContain('Goal text')
  })

  it('loads repository contracts from the filesystem structure', () => {
    const root = makeRepoWithContract(VALID_CONTRACT)
    const items = loadTaskContracts(root)
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Sample Step')
  })

  it('rejects contracts missing required sections', () => {
    const invalid = VALID_CONTRACT.replace('## Evidence\n- Evidence item.\n', '')
    expect(() => parseTaskContractFile('x.md', invalid)).toThrow("missing section '## Evidence'")
  })

  it('rejects duplicate slugs across contract files', () => {
    const root = makeRepoWithContract(VALID_CONTRACT)
    writeFileSync(
      path.join(root, 'docs', 'dev-harness', 'contracts', '2026-04-05-second.md'),
      VALID_CONTRACT.replace('Sample Step', 'Sample Step Two'),
    )
    expect(() => validateTaskContracts(root)).toThrow("Duplicate task contract slug 'sample_step'")
  })
})
