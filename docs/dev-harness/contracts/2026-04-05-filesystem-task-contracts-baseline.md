---
slug: filesystem_task_contracts_baseline
title: Filesystem Task Contracts Baseline
status: accepted
owner: nexa-core
created_at: 2026-04-05
updated_at: 2026-04-05
category: development_harness
scope_paths:
  - docs/dev-harness/contracts/
  - admin-os/lib/dev-harness/task-contracts.ts
  - admin-os/scripts/validate-task-contracts.mjs
  - admin-os/scripts/dev-harness-hook.mjs
verification:
  - task contract validator passes on repository contracts
  - pre-commit path validates staged contract files
  - admin build remains green
freeze_when:
  - contract files are markdown-first and repo-managed
  - validator rejects malformed contracts
  - hooks use validator for changed contract files
---

# Filesystem Task Contracts Baseline

## Goal
Add a filesystem-first task contract baseline so multi-step implementation work has explicit written scope, acceptance, and freeze evidence.

## In Scope
- Contract directory and template.
- Markdown frontmatter contract format.
- Deterministic validator and repository script.
- Hook integration for staged contract changes.

## Out Of Scope
- Evaluator feedback ledger.
- Release closure checklist.
- Product runtime UI for task contracts.
- Automatic contract generation from chat history.

## Acceptance
- Contract files can be loaded and validated deterministically.
- Invalid contracts fail with actionable errors.
- Staged contract changes trigger validation in `pre-commit`.
- Current contract set validates cleanly.

## Evidence
- `npm run contracts:validate`
- `npm run hooks:pre-commit`
- `npm run build`
